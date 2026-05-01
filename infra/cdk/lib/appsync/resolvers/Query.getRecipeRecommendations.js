import { Recommendations } from './ml-recommendations.js';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, get } from '@aws-sdk/lib-dynamodb';

// Initialize
const recommendations = new Recommendations();
const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

// Simple memory cache as fallback (Redis optional)
const memoryCache = new Map();

async function getCachedRecommendations(key) {
  // Try memory cache
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

async function checkHouseholdMembership(userId, householdId) {
  try {
    const result = await docClient.send(
      new get.constructor({
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
  const { householdId, limit = 5 } = event.arguments;
  const userId = event.identity?.claims?.sub; // Extract from Cognito token

  // Validate input
  if (!householdId || !userId) {
    throw new Error('householdId and authentication are required');
  }

  try {
    // Authorization: verify user is member of household
    const isMember = await checkHouseholdMembership(userId, householdId);
    if (!isMember) {
      throw new Error('User is not a member of this household');
    }

    // Try cache first
    const cacheKey = `recommendations:${userId}:${householdId}`;
    const cached = await getCachedRecommendations(cacheKey);

    if (cached) {
      console.log(`[Query.getRecipeRecommendations] Cache hit for ${userId}`);
      return cached.map(transformToRecipe);
    }

    // Generate fresh recommendations
    console.log(
      `[Query.getRecipeRecommendations] Generating fresh recommendations for ${householdId}`,
    );
    const result = await recommendations.getRecipeRecommendations(userId, householdId, {
      limit: Math.min(limit, 10),
    });

    if (!result.success || result.recommendations.length === 0) {
      console.warn(
        `[Query.getRecipeRecommendations] No recommendations generated: ${result.error || 'empty result'}`,
      );
      return [];
    }

    // Cache the raw recommendations
    await setCachedRecommendations(cacheKey, result.recommendations);

    // Transform to Recipe type for GraphQL response
    return result.recommendations.map(transformToRecipe);
  } catch (error) {
    console.error('[Query.getRecipeRecommendations] Error:', error.message);
    throw error;
  }
}
