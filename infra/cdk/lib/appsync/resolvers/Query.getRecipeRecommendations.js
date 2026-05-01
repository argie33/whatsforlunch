import { Recommendations } from './ml-recommendations.js';
import { HybridCache } from './hybrid-cache.js';

// Initialize
const recommendations = new Recommendations();
const cache = new HybridCache({
  redis: {
    endpoint: process.env.REDIS_ENDPOINT,
    port: parseInt(process.env.REDIS_PORT || '6379'),
    authToken: process.env.REDIS_AUTH_TOKEN,
  },
  defaultTtl: 6 * 3600, // 6 hours
});

async function checkHouseholdMembership(userId, householdId, docClient) {
  try {
    const result = await docClient.get({
      TableName: 'WhatsForLunch-Households',
      Key: {
        PK: `HOUSEHOLD#${householdId}`,
        SK: `MEMBER#${userId}`,
      },
    });
    return !!result.Item;
  } catch {
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
    // Try cache first
    const cacheKey = `recommendations:${userId}:${householdId}`;
    const cached = await cache.get(cacheKey);

    if (cached) {
      return cached.map(transformToRecipe);
    }

    // Generate fresh recommendations
    const result = await recommendations.getRecipeRecommendations(userId, householdId, {
      limit: Math.min(limit, 10),
    });

    if (!result.success || result.recommendations.length === 0) {
      return [];
    }

    // Cache the raw recommendations
    await cache.set(cacheKey, result.recommendations);

    // Transform to Recipe type for GraphQL response
    return result.recommendations.map(transformToRecipe);
  } catch (error) {
    console.error('[Query.getRecipeRecommendations] Error:', error.message);
    throw error;
  }
}
