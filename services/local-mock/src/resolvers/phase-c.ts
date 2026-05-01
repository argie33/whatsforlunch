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
    },
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

  async rateRecommendation(userId: string, recipeId: string, rating: number) {
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
    const now = new Date().toISOString();
    const recipes = [
      {
        id: 'recipe-1',
        title: 'Vegetable Stir Fry',
        summary: 'Quick and healthy stir fry with fresh vegetables',
        cuisine: 'Asian',
        servings: 2,
        cookTimeMinutes: 20,
        difficulty: 'easy',
        steps: ['Heat oil', 'Add vegetables', 'Season with sauce', 'Serve over rice'],
        tags: ['quick', 'healthy', 'vegetarian'],
        ingredients: [
          { name: 'vegetables', quantity: 2, unit: 'cups', optional: false },
          { name: 'soy sauce', quantity: 2, unit: 'tbsp', optional: false },
          { name: 'rice', quantity: 1, unit: 'cup', optional: false },
        ],
      },
      {
        id: 'recipe-2',
        title: 'Pasta Primavera',
        summary: 'Fresh pasta with seasonal vegetables',
        cuisine: 'Italian',
        servings: 3,
        cookTimeMinutes: 25,
        difficulty: 'easy',
        steps: ['Cook pasta', 'Sauté vegetables', 'Combine with olive oil and garlic', 'Toss'],
        tags: ['vegetarian', 'fresh'],
        ingredients: [
          { name: 'pasta', quantity: 1, unit: 'lb', optional: false },
          { name: 'vegetables', quantity: 3, unit: 'cups', optional: false },
          { name: 'olive oil', quantity: 3, unit: 'tbsp', optional: false },
        ],
      },
      {
        id: 'recipe-3',
        title: 'Grilled Chicken Salad',
        summary: 'Protein-rich salad with grilled chicken',
        cuisine: 'American',
        servings: 2,
        cookTimeMinutes: 30,
        difficulty: 'medium',
        steps: ['Grill chicken', 'Prepare salad base', 'Slice chicken', 'Combine and dress'],
        tags: ['healthy', 'protein', 'main-course'],
        ingredients: [
          { name: 'chicken', quantity: 1, unit: 'lb', optional: false },
          { name: 'lettuce', quantity: 4, unit: 'cups', optional: false },
          { name: 'vegetables', quantity: 2, unit: 'cups', optional: true },
        ],
      },
      {
        id: 'recipe-4',
        title: 'Vegetable Soup',
        summary: 'Warm and comforting vegetable soup',
        cuisine: 'European',
        servings: 4,
        cookTimeMinutes: 35,
        difficulty: 'easy',
        steps: ['Heat broth', 'Add vegetables', 'Simmer', 'Season with herbs'],
        tags: ['comfort', 'vegetarian', 'soup'],
        ingredients: [
          { name: 'vegetables', quantity: 4, unit: 'cups', optional: false },
          { name: 'broth', quantity: 4, unit: 'cups', optional: false },
          { name: 'herbs', quantity: 1, unit: 'tsp', optional: false },
        ],
      },
      {
        id: 'recipe-5',
        title: 'Rice and Beans Bowl',
        summary: 'Filling and nutritious rice and beans',
        cuisine: 'Latin',
        servings: 3,
        cookTimeMinutes: 30,
        difficulty: 'easy',
        steps: ['Cook rice', 'Cook beans', 'Season with spices', 'Combine'],
        tags: ['vegetarian', 'staple'],
        ingredients: [
          { name: 'rice', quantity: 1, unit: 'cup', optional: false },
          { name: 'beans', quantity: 1, unit: 'can', optional: false },
          { name: 'spices', quantity: 1, unit: 'tsp', optional: true },
        ],
      },
    ];

    return recipes.map((recipe) => ({
      ...recipe,
      createdAt: now,
      updatedAt: now,
      rating: null,
    }));
  }
}

// ============================================
// Exports
// ============================================

export function createPhaseCResolvers(redisClient: Redis, dynamodbClient: DynamoDB) {
  return {
    cache: new CacheResolver(redisClient, dynamodbClient),
    analytics: new AnalyticsResolver(dynamodbClient),
    recommendations: new RecommendationsResolver(dynamodbClient, redisClient),
  };
}
