import { DynamoDBClient, QueryCommand } from '@aws-sdk/client-dynamodb';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const lambda = new LambdaClient({ region: process.env.AWS_REGION || 'us-east-1' });

// Simple memory cache
const memoryCache = new Map();

async function getCachedRecommendations(key) {
  const cached = memoryCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }
  memoryCache.delete(key);
  return null;
}

async function setCachedRecommendations(key, data) {
  memoryCache.set(key, {
    data,
    expiresAt: Date.now() + 6 * 60 * 60 * 1000, // 6 hours
  });
}

async function getExpiringItems(householdId) {
  try {
    // Query active items for household, sorted by expiry
    const result = await dynamoClient.send(
      new QueryCommand({
        TableName: process.env.MAIN_TABLE || 'whatsforlunch-main',
        KeyConditionExpression: 'householdId = :hid AND begins_with(sk, :active)',
        ExpressionAttributeValues: {
          ':hid': { S: householdId },
          ':active': { S: 'ITEM#' },
        },
        Limit: 15,
      })
    );

    return (result.Items || []).map((item) => ({
      id: item.id?.S || '',
      name: item.foodName?.S || 'Food',
    }));
  } catch (err) {
    console.error('[getExpiringItems] Error:', err.message);
    return [];
  }
}

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

function parseTimeToMinutes(timeStr) {
  // Parse "30 mins" or "1 hour 30 mins" to minutes
  const minutes = timeStr.match(/(\d+)\s*mins?/i);
  const hours = timeStr.match(/(\d+)\s*hours?/i);
  return (hours ? parseInt(hours[1]) * 60 : 0) + (minutes ? parseInt(minutes[1]) : 0) || 30;
}

function transformToRecipe(rec) {
  return {
    id: rec.id,
    title: rec.title,
    summary: rec.description,
    cuisine: 'international',
    servings: 2,
    cookTimeMinutes: parseTimeToMinutes(rec.preparationTime),
    difficulty: rec.difficulty || 'Medium',
    ingredients: (rec.ingredients || []).map((name) => ({
      name,
      quantity: null,
      unit: null,
      optional: false,
    })),
    steps: [], // Claude doesn't return steps yet, can be enhanced
    tags: ['ai-generated', 'waste-reduction'],
    imageUrl: null,
    source: 'bedrock-claude',
    usedItemIds: [],
    rating: null,
    notes: `Waste Score: ${(rec.wasteScore * 100).toFixed(0)}%`,
    createdAt: rec.generatedAt || new Date().toISOString(),
    updatedAt: rec.generatedAt || new Date().toISOString(),
    _version: 1,
    _lastChangedAt: new Date().toISOString(),
  };
}

export async function handler(event) {
  const { householdId } = event.arguments;
  const userId = event.identity?.claims?.sub;

  if (!householdId || !userId) {
    throw new Error('householdId and authentication are required');
  }

  try {
    // Verify user is household member
    const isMember = await checkHouseholdMembership(userId, householdId);
    if (!isMember) {
      throw new Error('User is not a member of this household');
    }

    // Try cache first
    const cacheKey = `recommendations:${householdId}`;
    const cached = await getCachedRecommendations(cacheKey);
    if (cached) {
      console.log(`[Query.getRecipeRecommendations] Cache hit`);
      return cached;
    }

    // Get expiring items from DynamoDB
    const items = await getExpiringItems(householdId);
    if (items.length === 0) {
      return [];
    }

    console.log(`[Query.getRecipeRecommendations] Found ${items.length} items, invoking Lambda`);

    // Invoke suggest-recipes Lambda
    const lambdaPayload = {
      householdId,
      itemIds: items.map((i) => i.id),
      itemNames: items.map((i) => i.name),
      dietaryPreferences: [],
      allergens: [],
    };

    const lambdaResult = await lambda.send(
      new InvokeCommand({
        FunctionName: process.env.SUGGEST_RECIPES_LAMBDA || 'whatsforlunch-suggest-recipes',
        InvocationType: 'RequestResponse',
        Payload: JSON.stringify(lambdaPayload),
      })
    );

    const responseStr = typeof lambdaResult.Payload === 'string'
      ? lambdaResult.Payload
      : new TextDecoder().decode(lambdaResult.Payload);

    const response = JSON.parse(responseStr);

    if (response.errorMessage) {
      console.error('[Lambda] Error:', response.errorMessage);
      return [];
    }

    const recipes = (response.recipes || []).map((rec) => ({
      id: rec.id,
      title: rec.title,
      summary: rec.description,
      servings: rec.servings || 4,
      cookTimeMinutes: rec.durationMinutes || 30,
      difficulty: (rec.difficulty || 'medium').toUpperCase(),
      ingredients: (rec.missingIngredients || []).map((name) => ({
        name,
        quantity: null,
        unit: null,
        optional: true,
      })),
      steps: rec.steps || [],
      tags: ['ai-generated', 'waste-reduction'],
      imageUrl: null,
      usedItemIds: rec.linkedItemIds || [],
      rating: null,
      createdAt: new Date().toISOString(),
    }));

    // Cache for 6 hours
    await setCachedRecommendations(cacheKey, recipes);

    return recipes;
  } catch (error) {
    console.error('[Query.getRecipeRecommendations] Error:', error.message);
    throw error;
  }
}
