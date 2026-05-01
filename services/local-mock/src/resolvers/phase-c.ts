/**
 * Phase C Resolver Implementations
 * Caching, Analytics, and ML Recommendations
 */

import { Redis } from 'ioredis';
import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';

// ============================================
// Phase C.1: Caching Resolvers
// ============================================

export class CacheResolver {
  private redis: Redis;
  private dynamodb: DynamoDB;
  private cacheTTL = 3600; // 1 hour

  constructor(redisClient: Redis, dynamodbClient: DynamoDB) {
    this.redis = redisClient;
    this.dynamodb = dynamodbClient;
  }

  async getHouseholdItems(householdId: string) {
    const cacheKey = `household#${householdId}:items`;

    try {
      // Try cache first
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return { items: JSON.parse(cached), source: 'cache' };
      }
    } catch (error) {
      console.warn('Cache miss, falling back to DynamoDB:', error);
    }

    // Cache miss: fetch from DynamoDB
    const result = await this.dynamodb.query({
      TableName: 'wfl-main-dev',
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': { S: `HOUSEHOLD#${householdId}` },
        ':sk': { S: 'ITEM#' },
      },
    });

    const items = result.Items?.map((item) => unmarshall(item)) || [];

    // Store in cache
    try {
      await this.redis.setex(cacheKey, this.cacheTTL, JSON.stringify(items));
    } catch (error) {
      console.warn('Failed to cache items:', error);
    }

    return { items, source: 'dynamodb' };
  }

  async invalidateCache(householdId: string) {
    const cacheKey = `household#${householdId}:items`;
    try {
      await this.redis.del(cacheKey);
    } catch (error) {
      console.warn('Failed to invalidate cache:', error);
    }
  }

  async getHouseholdProfile(householdId: string) {
    const cacheKey = `household#${householdId}:profile`;

    // Try cache
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return { profile: JSON.parse(cached), source: 'cache' };
    }

    // Fetch from DynamoDB
    const result = await this.dynamodb.getItem({
      TableName: 'wfl-main-dev',
      Key: marshall({ PK: `HOUSEHOLD#${householdId}`, SK: 'PROFILE' }),
    });

    const profile = result.Item ? unmarshall(result.Item) : null;

    // Cache it
    if (profile) {
      await this.redis.setex(cacheKey, this.cacheTTL, JSON.stringify(profile));
    }

    return { profile, source: 'dynamodb' };
  }
}

// ============================================
// Phase C.2: Analytics Resolvers
// ============================================

export class AnalyticsResolver {
  private dynamodb: DynamoDB;

  constructor(dynamodbClient: DynamoDB) {
    this.dynamodb = dynamodbClient;
  }

  async trackEvent(event: {
    userId: string;
    householdId: string;
    eventType: string;
    metadata?: Record<string, any>;
  }) {
    const timestamp = Date.now();
    const expirationTime = Math.floor(timestamp / 1000) + 30 * 24 * 60 * 60; // 30 days TTL

    try {
      await this.dynamodb.putItem({
        TableName: 'wfl-analytics-event-dev',
        Item: marshall({
          userId: event.userId,
          timestamp,
          eventType: event.eventType,
          householdId: event.householdId,
          metadata: event.metadata || {},
          expirationTime,
        }),
      });

      return { success: true, eventId: `${timestamp}-${Math.random()}` };
    } catch (error) {
      console.error('Failed to track event:', error);
      return { success: false, error: String(error) };
    }
  }

  async getHouseholdAnalytics(householdId: string, period: string = 'monthly') {
    try {
      const result = await this.dynamodb.query({
        TableName: 'wfl-cost-analysis-dev',
        KeyConditionExpression: 'householdId = :hid AND #p = :period',
        ExpressionAttributeNames: { '#p': 'period' },
        ExpressionAttributeValues: {
          ':hid': { S: householdId },
          ':period': { S: period },
        },
      });

      const analysis = result.Items?.[0] ? unmarshall(result.Items[0]) : null;

      return {
        householdId,
        period,
        analysis,
        totalCost: analysis?.totalCost || 0,
        costByCategory: analysis?.costByCategory || {},
        costByMember: analysis?.costByMember || {},
      };
    } catch (error) {
      console.error('Failed to get analytics:', error);
      return { householdId, period, analysis: null, error: String(error) };
    }
  }

  async computeCostAnalysis(householdId: string) {
    // In production, this would be a Lambda function
    // For local testing, we compute it here
    const timestamp = Date.now();
    const period = new Date(timestamp).toISOString().substring(0, 7); // YYYY-MM

    try {
      // Query all items for this household
      const result = await this.dynamodb.query({
        TableName: 'wfl-main-dev',
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: {
          ':pk': { S: `HOUSEHOLD#${householdId}` },
          ':sk': { S: 'ITEM#' },
        },
      });

      const items = result.Items?.map((item) => unmarshall(item)) || [];

      // Compute costs
      const costByCategory: Record<string, number> = {};
      const costByMember: Record<string, number> = {};
      let totalCost = 0;

      items.forEach((item) => {
        const cost = item.cost || 0;
        const category = item.category || 'uncategorized';
        const member = item.addedBy || 'unknown';

        costByCategory[category] = (costByCategory[category] || 0) + cost;
        costByMember[member] = (costByMember[member] || 0) + cost;
        totalCost += cost;
      });

      // Store analysis
      await this.dynamodb.putItem({
        TableName: 'wfl-cost-analysis-dev',
        Item: marshall({
          householdId,
          period,
          month: period,
          totalCost,
          costByCategory,
          costByMember,
          itemCount: items.length,
          computedAt: timestamp,
        }),
      });

      return { householdId, period, totalCost, costByCategory, costByMember };
    } catch (error) {
      console.error('Failed to compute cost analysis:', error);
      return { householdId, period, error: String(error) };
    }
  }
}

// ============================================
// Phase C.3: ML Recommendations Resolvers
// ============================================

export class RecommendationsResolver {
  private dynamodb: DynamoDB;
  private redis: Redis;
  private cacheTTL = 21600; // 6 hours

  constructor(dynamodbClient: DynamoDB, redisClient: Redis) {
    this.dynamodb = dynamodbClient;
    this.redis = redisClient;
  }

  async getRecommendations(householdId: string, userId: string) {
    const cacheKey = `recommendations#${householdId}:${userId}`;

    // Try cache first
    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return {
          recommendations: JSON.parse(cached),
          source: 'cache',
          cachedAt: new Date().toISOString(),
        };
      }
    } catch (error) {
      console.warn('Cache miss for recommendations:', error);
    }

    // Get household items
    const itemsResult = await this.dynamodb.query({
      TableName: 'wfl-main-dev',
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': { S: `HOUSEHOLD#${householdId}` },
        ':sk': { S: 'ITEM#' },
      },
    });

    const items = itemsResult.Items?.map((item) => unmarshall(item)) || [];

    // Generate recommendations based on items (mock implementation)
    const recommendations = this.generateMockRecommendations(items);

    // Cache recommendations
    try {
      await this.redis.setex(cacheKey, this.cacheTTL, JSON.stringify(recommendations));
    } catch (error) {
      console.warn('Failed to cache recommendations:', error);
    }

    return {
      recommendations,
      source: 'generated',
      generatedAt: new Date().toISOString(),
    };
  }

  async setUserPreferences(
    userId: string,
    preferences: {
      dietaryRestrictions?: string[];
      cuisinePreferences?: string[];
      allergies?: string[];
    }
  ) {
    try {
      await this.dynamodb.putItem({
        TableName: 'wfl-user-preferences-dev',
        Item: marshall({
          userId,
          ...preferences,
          updatedAt: Date.now(),
        }),
      });

      return { success: true, userId };
    } catch (error) {
      console.error('Failed to set preferences:', error);
      return { success: false, error: String(error) };
    }
  }

  async rateRecommendation(
    userId: string,
    recipeId: string,
    rating: number
  ) {
    try {
      // Store rating in preferences table
      const result = await this.dynamodb.getItem({
        TableName: 'wfl-user-preferences-dev',
        Key: marshall({ userId }),
      });

      const preferences = result.Item ? unmarshall(result.Item) : {};
      const ratings = preferences.ratings || {};
      ratings[recipeId] = rating;

      await this.dynamodb.putItem({
        TableName: 'wfl-user-preferences-dev',
        Item: marshall({
          userId,
          ...preferences,
          ratings,
          updatedAt: Date.now(),
        }),
      });

      return { success: true, userId, recipeId, rating };
    } catch (error) {
      console.error('Failed to rate recommendation:', error);
      return { success: false, error: String(error) };
    }
  }

  private generateMockRecommendations(items: any[]) {
    // Generate 5 mock recipes based on items in household
    const recipes = [
      {
        id: 'recipe-1',
        name: 'Vegetable Stir Fry',
        ingredients: ['vegetables', 'soy sauce', 'rice'],
        estimatedTime: 20,
        difficulty: 'easy',
      },
      {
        id: 'recipe-2',
        name: 'Pasta Primavera',
        ingredients: ['pasta', 'vegetables', 'olive oil'],
        estimatedTime: 25,
        difficulty: 'easy',
      },
      {
        id: 'recipe-3',
        name: 'Grilled Chicken Salad',
        ingredients: ['chicken', 'lettuce', 'vegetables'],
        estimatedTime: 30,
        difficulty: 'medium',
      },
      {
        id: 'recipe-4',
        name: 'Vegetable Soup',
        ingredients: ['vegetables', 'broth', 'herbs'],
        estimatedTime: 35,
        difficulty: 'easy',
      },
      {
        id: 'recipe-5',
        name: 'Rice and Beans Bowl',
        ingredients: ['rice', 'beans', 'vegetables', 'spices'],
        estimatedTime: 30,
        difficulty: 'easy',
      },
    ];

    return recipes.map((recipe) => ({
      ...recipe,
      matchScore: Math.random() * 0.5 + 0.5, // 50-100% match
    }));
  }
}

// ============================================
// Exports
// ============================================

export function createPhaseCResolvers(
  redisClient: Redis,
  dynamodbClient: DynamoDB
) {
  return {
    cache: new CacheResolver(redisClient, dynamodbClient),
    analytics: new AnalyticsResolver(dynamodbClient),
    recommendations: new RecommendationsResolver(dynamodbClient, redisClient),
  };
}
