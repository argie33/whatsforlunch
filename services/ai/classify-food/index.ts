/**
 * Lambda: classifyFood
 * Classifies food from a photo using Claude Haiku with vision
 * Updates Item with AI classification results
 * Tracks cost and cache hits for analytics
 */

import { DynamoDBClient, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import BedrockClient from '../shared/bedrockClient';

const dynamodb = new DynamoDBClient({});
const bedrock = new BedrockClient(process.env.AWS_REGION);

interface ClassifyFoodEvent {
  householdId: string;
  itemId: string;
  photoUrl: string; // S3 URL or public URL
}

interface ClassifyFoodResponse {
  itemId: string;
  householdId: string;
  classification: {
    foodType: string;
    foodName: string;
    category: string;
    confidence: number;
  };
  cost: number;
  cacheHit: boolean;
  model: string;
  promptVersion: number;
}

export async function handler(event: ClassifyFoodEvent): Promise<ClassifyFoodResponse> {
  const startTime = Date.now();
  const userId = event.householdId; // From auth context in real impl

  try {
    // Call Bedrock with food classification prompt
    // In production, would download image and analyze with vision API
    // For MVP, analyzing image description
    const response = await bedrock.classifyFood(
      `Product photo from URL: ${event.photoUrl}`
    );

    const latencyMs = Date.now() - startTime;
    const cost = calculateBedrockCost(response.usage);

    // Store AI classification record in DynamoDB
    const now = new Date().toISOString();
    const timestamp = Date.now().toString();

    await dynamodb.send(
      new UpdateItemCommand({
        TableName: process.env.MAIN_TABLE || '',
        Key: {
          PK: { S: `HOUSEHOLD#${event.householdId}` },
          SK: { S: `AI#${event.itemId}#${timestamp}` },
        },
        UpdateExpression: `
          SET entityType = :et, itemId = :itemId,
              #model = :model, promptVersion = :pv,
              response = :resp, confidence = :conf,
              userOverrode = :uo, latencyMs = :lat,
              costUsd = :cost, cacheHit = :cache,
              createdAt = :now
        `,
        ExpressionAttributeNames: {
          '#model': 'model',
        },
        ExpressionAttributeValues: {
          ':et': { S: 'AiClassification' },
          ':itemId': { S: event.itemId },
          ':model': { S: 'claude-3-5-haiku-20241022' },
          ':pv': { N: '1' },
          ':resp': {
            M: {
              foodType: { S: response.foodType },
              foodName: { S: response.foodName },
              category: { S: response.category },
              confidence: { N: String(response.confidence) },
              suggestedExpiryDays: {
                M: Object.entries(response.suggestedExpiryDays).reduce(
                  (acc, [key, value]) => ({
                    ...acc,
                    [key]: value ? { N: String(value) } : { NULL: true },
                  }),
                  {}
                ),
              },
            },
          },
          ':conf': { N: String(response.confidence) },
          ':uo': { BOOL: false },
          ':lat': { N: String(latencyMs) },
          ':cost': { N: String(cost) },
          ':cache': { BOOL: response.cacheHit },
          ':now': { S: now },
        },
      })
    );

    // Update the Item itself with AI classification
    await dynamodb.send(
      new UpdateItemCommand({
        TableName: process.env.MAIN_TABLE || '',
        Key: {
          PK: { S: `HOUSEHOLD#${event.householdId}` },
          SK: { S: `ITEM#${event.itemId}` },
        },
        UpdateExpression: `
          SET foodName = :foodName, foodType = :foodType,
              category = :category, expiryConfidence = :conf,
              aiClassificationId = :aiId,
              updatedAt = :now, _version = _version + :inc, _lastChangedAt = :lastChangedAt
        `,
        ExpressionAttributeValues: {
          ':foodName': { S: response.foodName },
          ':foodType': { S: response.foodType },
          ':category': { S: response.category },
          ':conf': { N: String(response.confidence) },
          ':aiId': { S: `AI#${event.itemId}#${timestamp}` },
          ':now': { S: now },
          ':inc': { N: '1' },
          ':lastChangedAt': { N: timestamp },
        },
      })
    );

    // Deduct quota
    await deductAiQuota(event.householdId);

    return {
      itemId: event.itemId,
      householdId: event.householdId,
      classification: {
        foodType: response.foodType,
        foodName: response.foodName,
        category: response.category,
        confidence: response.confidence,
      },
      cost,
      cacheHit: response.cacheHit,
      model: 'claude-3-5-haiku-20241022',
      promptVersion: 1,
    };
  } catch (error) {
    console.error('classifyFood error:', error);
    throw new Error(`Failed to classify food: ${error}`);
  }
}

function calculateBedrockCost(usage: any): number {
  // Claude 3.5 Haiku pricing (as of 2024)
  const inputCost = 0.00080 / 1000; // $0.80 per 1M input tokens
  const outputCost = 0.0024 / 1000; // $2.40 per 1M output tokens
  const cacheWriteCost = 0.001 / 1000; // $1.00 per 1M cache write tokens
  const cacheReadCost = 0.0001 / 1000; // $0.10 per 1M cache read tokens

  let totalCost = usage.inputTokens * inputCost;
  totalCost += usage.outputTokens * outputCost;
  if (usage.cacheCreationTokens) {
    totalCost += usage.cacheCreationTokens * cacheWriteCost;
  }
  if (usage.cacheReadTokens) {
    totalCost += usage.cacheReadTokens * cacheReadCost;
  }

  return Math.round(totalCost * 100000) / 100000; // 5 decimal places
}

async function deductAiQuota(householdId: string): Promise<void> {
  // Placeholder: would call shared AI quota layer
  // import { deductQuota } from '@whatsforlunch/ai-quota-check';
  // await deductQuota(householdId);
}
