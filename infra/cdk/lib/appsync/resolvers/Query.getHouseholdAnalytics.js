import { Analytics } from './analytics.js';
import { HybridCache } from './hybrid-cache.js';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';

const analytics = new Analytics();
const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const cache = new HybridCache({
  redis: {
    endpoint: process.env.REDIS_ENDPOINT,
    port: parseInt(process.env.REDIS_PORT || '6379'),
    authToken: process.env.REDIS_AUTH_TOKEN,
  },
  defaultTtl: 3600, // 1 hour for analytics
});

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
  } catch {
    return false;
  }
}

export async function handler(event) {
  const { userId, householdId, days = 30 } = event.arguments;

  // Validate input
  if (!userId || !householdId) {
    return {
      success: false,
      error: 'INVALID_INPUT',
      message: 'userId and householdId are required',
    };
  }

  try {
    // Authorization: check household membership
    const isMember = await checkHouseholdMembership(userId, householdId);
    if (!isMember) {
      return {
        success: false,
        error: 'FORBIDDEN',
        message: 'User is not a member of this household',
      };
    }

    // Try cache first
    const cacheKey = cache.generateKey('household_analytics', householdId, days);
    const cached = await cache.get(cacheKey);

    if (cached) {
      return {
        success: true,
        ...cached,
        source: 'cache',
      };
    }

    // Generate fresh analytics
    const costs = await analytics.analyzeCosts(householdId, { days });
    const trends = await analytics.calculateTrends(householdId, { days });

    if (!costs || !trends) {
      return {
        success: false,
        error: 'ANALYTICS_ERROR',
        message: 'Failed to generate analytics',
      };
    }

    const result = {
      success: true,
      costs,
      trends,
      period: `${days} days`,
      source: 'generated',
    };

    // Cache the results
    await cache.set(cacheKey, result);

    return result;
  } catch (error) {
    console.error('[Query.getHouseholdAnalytics] Error:', error.message);
    return {
      success: false,
      error: 'INTERNAL_ERROR',
      message: error.message,
    };
  }
}
