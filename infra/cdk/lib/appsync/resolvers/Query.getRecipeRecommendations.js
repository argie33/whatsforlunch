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

export async function handler(event) {
  const { userId, householdId, limit = 5 } = event.arguments;

  // Validate input
  if (!userId || !householdId) {
    return {
      success: false,
      error: 'INVALID_INPUT',
      message: 'userId and householdId are required',
      recommendations: [],
    };
  }

  try {
    // Authorization: check household membership
    const isMember = await checkHouseholdMembership(userId, householdId, docClient);
    if (!isMember) {
      return {
        success: false,
        error: 'FORBIDDEN',
        message: 'User is not a member of this household',
        recommendations: [],
      };
    }

    // Try cache first
    const cacheKey = cache.generateKey('recommendations', userId, householdId, limit);
    const cached = await cache.get(cacheKey);

    if (cached) {
      return {
        success: true,
        recommendations: cached,
        source: 'cache',
      };
    }

    // Generate fresh recommendations
    const result = await recommendations.getRecipeRecommendations(userId, householdId, {
      limit: Math.min(limit, 10), // Cap at 10 to avoid excessive Bedrock calls
    });

    if (result.success && result.recommendations.length > 0) {
      // Cache the results
      await cache.set(cacheKey, result.recommendations);
    }

    return {
      success: result.success,
      recommendations: result.recommendations,
      source: 'generated',
      error: result.error,
    };
  } catch (error) {
    console.error('[Query.getRecipeRecommendations] Error:', error.message);
    return {
      success: false,
      error: 'INTERNAL_ERROR',
      message: error.message,
      recommendations: [],
    };
  }
}
