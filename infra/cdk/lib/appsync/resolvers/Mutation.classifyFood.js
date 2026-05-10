import { BedrockRuntime } from '@aws-sdk/client-bedrock-runtime';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const bedrockClient = new BedrockRuntime({ region: process.env.AWS_REGION || 'us-east-1' });
const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const MODEL_ID = 'anthropic.claude-3-sonnet-20240229-v1:0';
const FOOD_RULES_TABLE = process.env.FOOD_RULES_TABLE || 'WhatsFresh-FoodRules';

const FOOD_CATEGORIES = {
  protein: ['chicken', 'beef', 'pork', 'fish', 'shrimp', 'tofu', 'turkey', 'lamb'],
  dairy: ['milk', 'cheese', 'yogurt', 'butter', 'cream'],
  produce: ['apple', 'banana', 'broccoli', 'carrot', 'lettuce', 'tomato', 'orange'],
  grain: ['bread', 'rice', 'pasta', 'cereal', 'oats'],
  leftover: [],
  sauce: ['mayo', 'ketchup', 'mustard', 'sauce'],
  baked: ['cake', 'cookie', 'brownie', 'pie'],
  prepared: ['pizza', 'sandwich', 'salad', 'soup', 'stew'],
  beverage: ['water', 'juice', 'coffee', 'tea', 'soda'],
};

async function checkHouseholdMembership(userId, householdId) {
  try {
    const result = await docClient.send(
      new GetCommand({
        TableName: process.env.HOUSEHOLDS_TABLE || 'wfl-main-prod',
        Key: {
          PK: `HOUSEHOLD#${householdId}`,
          SK: `MEMBER#${userId}`,
        },
      }),
    );
    return !!result.Item;
  } catch (err) {
    console.error('[Auth] Membership check failed:', err.message);
    return false;
  }
}

async function classifyFoodWithBedrock(photoUrl) {
  try {
    const prompt = `Analyze this food image and provide JSON classification.

Image URL: ${photoUrl}

Return ONLY a JSON object (no markdown, no extra text) with these exact fields:
{
  "foodName": "specific food name",
  "foodType": "generic food type",
  "category": "one of: protein, dairy, produce, grain, leftover, sauce, baked, prepared, beverage",
  "confidence": 0.0-1.0,
  "expirySource": "ai",
  "expiryDays": number of days until typically expires
}

Examples:
- "grilled chicken breast" -> protein, 3-4 days
- "greek yogurt" -> dairy, 7-14 days
- "spinach" -> produce, 5-7 days
- "leftover pizza" -> prepared, 3-4 days`;

    const response = await bedrockClient.invokeModel({
      modelId: MODEL_ID,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        anthropic_version: 'bedrock-2023-06-01',
        max_tokens: 256,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    const content = responseBody.content[0]?.text || '';

    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn('[ClassifyFood] No JSON found in response');
      return null;
    }

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('[ClassifyFood] Bedrock invocation error:', error.message);
    return null;
  }
}

async function getFoodRule(category) {
  try {
    const result = await docClient.send(
      new GetCommand({
        TableName: FOOD_RULES_TABLE,
        Key: {
          PK: 'RULES',
          SK: `CATEGORY#${category}`,
        },
      }),
    );
    return result.Item || null;
  } catch (error) {
    console.warn('[ClassifyFood] Get food rule error:', error.message);
    return null;
  }
}

function calculateExpiryDate(expiryDays) {
  const now = new Date();
  now.setDate(now.getDate() + expiryDays);
  return now.toISOString();
}

export async function handler(event) {
  const { householdId, photoUrl } = event.arguments;
  const userId = event.identity?.claims?.sub;

  if (!householdId || !photoUrl || !userId) {
    throw new Error('householdId, photoUrl, and authentication are required');
  }

  try {
    // Authorization: verify user is member of household
    const isMember = await checkHouseholdMembership(userId, householdId);
    if (!isMember) {
      throw new Error('User is not a member of this household');
    }

    // Classify food using Bedrock Claude
    console.log('[Mutation.classifyFood] Classifying:', photoUrl);
    const classification = await classifyFoodWithBedrock(photoUrl);

    if (!classification) {
      throw new Error('Failed to classify food from photo');
    }

    // Get food rule if available
    const foodRule = await getFoodRule(classification.category);

    // Create Item record
    const now = new Date().toISOString();
    const itemId = generateUUID();
    const expiryAt = calculateExpiryDate(classification.expiryDays || 5);

    const item = {
      PK: `HOUSEHOLD#${householdId}`,
      SK: `ITEM#${itemId}`,
      id: itemId,
      householdId,
      addedByUserId: userId,
      foodType: classification.foodType,
      foodName: classification.foodName,
      category: classification.category,
      storageLocation: 'fridge', // default
      storedAt: now,
      storedTz: Intl.DateTimeFormat().resolvedOptions().timeZone,
      expiryAt,
      expirySource: classification.expirySource || 'ai',
      expiryConfidence: classification.confidence || 0.8,
      photoUrl,
      status: 'active',
      createdAt: now,
      updatedAt: now,
      _version: 1,
      _lastChangedAt: Math.floor(Date.now() / 1000),
    };

    // Store item
    await docClient.send(
      new PutCommand({
        TableName: process.env.ITEMS_TABLE || 'wfl-main-prod',
        Item: item,
      }),
    );

    console.log(`[Mutation.classifyFood] Created item ${itemId}`);

    return item;
  } catch (error) {
    console.error('[Mutation.classifyFood] Error:', error.message);
    throw error;
  }
}
