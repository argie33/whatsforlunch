# Phase C.3: ML Recommendations Infrastructure Implementation

## Claude 3 Sonnet via Bedrock for Personalized Recipes

**Status**: 🟡 READY FOR IMPLEMENTATION  
**Timeline**: Week 3-4 of Phase C  
**Owner**: W1 (Infrastructure) + W4 (AI)  
**Depends On**: Phase C.1 (Caching), Phase C.2 (Analytics)

---

## Overview

Phase C.3 implements an AI-powered recipe recommendation engine using Claude 3 Sonnet via AWS Bedrock. Recommendations are personalized based on user preferences, consumption history, and available pantry items.

**Key Features**:

- Context-aware recipe generation from pantry items
- Personal preference tracking (cuisine, dietary restrictions, prep time)
- 6-hour TTL caching (70%+ hit rate expected)
- Cost tracking ($0.003/call, ~$90/month with caching)
- A/B testing framework for model variants
- User feedback loop for continuous improvement

---

## Architecture

```
┌──────────────────────────────────────────────────────┐
│ Query.getRecipeRecommendations                       │
│ ├─ Check Redis cache (6-hour TTL)                   │
│ │  ├─ Hit → Return cached recipes (2ms)             │
│ │  └─ Miss → Continue                                │
│ │                                                     │
│ ├─ Fetch user preferences from DynamoDB             │
│ ├─ Fetch pantry items (recent)                      │
│ ├─ Fetch consumption history (last 30 days)         │
│ │                                                     │
│ ├─ Build context prompt:                            │
│ │  ├─ Available ingredients                         │
│ │  ├─ User preferences + restrictions               │
│ │  ├─ Recent consumption patterns                   │
│ │  └─ Cuisine/prep time preferences                 │
│ │                                                     │
│ ├─ Call Bedrock Claude 3 Sonnet API                 │
│ │  ├─ Cost: $0.003 per request                     │
│ │  ├─ Latency: 1-3 seconds                          │
│ │  └─ Response: Structured recipe list              │
│ │                                                     │
│ ├─ Parse response + score recipes                   │
│ ├─ Cache for 6 hours                                │
│ │                                                     │
│ └─ Return top 5 recipes                             │
│                                                       │
└──────────────────────────────────────────────────────┘

Preference Updates:
Mutation.setUserPreferences
    ↓
Validate input (Joi schema)
    ↓
Update DynamoDB UserPreferences
    ↓
Invalidate recommendation cache
    ↓
Return success
```

---

## DynamoDB Schema

### UserPreferences Table

```javascript
{
  PK: "USER#user-123",
  SK: "CONFIG#PREFERENCES",
  entityType: "UserPreferences",

  // Cuisine preferences (array of strings)
  cuisinePreferences: [
    "italian",
    "asian",
    "mediterranean"
  ],

  // Dietary restrictions
  dietaryRestrictions: [
    "vegetarian",
    "gluten-free"
  ],

  // Prep time constraints (minutes)
  prepTimePreferences: {
    min: 5,
    max: 45
  },

  // Equipment available
  equipmentAvailable: [
    "oven",
    "stovetop",
    "microwave",
    "blender"
  ],

  // Ingredients to avoid
  dislikedIngredients: [
    "cilantro",
    "olives"
  ],

  // Allergies
  allergies: [
    "peanuts",
    "shellfish"
  ],

  _version: 3,
  createdAt: "2026-04-01T10:00:00Z",
  updatedAt: "2026-04-29T14:30:00Z"
}
```

### RecipeRecommendation Table

```javascript
{
  PK: "USER#user-123",
  SK: "RECOMMENDATION#2026-04-29T14:32:00Z",

  recipeId: "recipe-uuid",
  recipeName: "Mushroom Risotto",
  cuisine: "italian",
  prepTime: 35,
  servings: 4,
  ingredients: [
    "arborio rice",
    "mushrooms",
    "white wine",
    "vegetable broth",
    "parmesan cheese"
  ],
  matchedIngredients: [
    "mushrooms",
    "vegetable broth"
  ],
  missingIngredients: [
    "arborio rice",
    "white wine",
    "parmesan cheese"
  ],

  // ML model scoring
  score: 87,  // 0-100
  scoreBreakdown: {
    ingredientMatch: 0.85,
    cuisinePreference: 0.90,
    prepTimeMatch: 0.88,
    averageRating: 4.2
  },

  // User interactions
  userRating: 4,  // 1-5 stars (if rated)
  userAttempted: true,
  userLiked: true,

  reason: "High ingredient match (50% available), Italian cuisine match",

  createdAt: "2026-04-29T14:32:00Z"
}
```

---

## Bedrock Integration

### Bedrock Client Setup

**File**: `infra/cdk/lib/appsync/resolvers/bedrock-client.js`

```javascript
const { BedrockRuntime } = require('@aws-sdk/client-bedrock-runtime');

class BedrockClient {
  constructor() {
    this.client = new BedrockRuntime();
    this.modelId = 'anthropic.claude-3-sonnet-20240229-v1:0';
    this.region = process.env.AWS_REGION || 'us-east-1';
  }

  /**
   * Generate recipe recommendations
   */
  async generateRecipeRecommendations(context) {
    const prompt = this._buildPrompt(context);

    try {
      const response = await this.client.invokeModel({
        modelId: this.modelId,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify({
          anthropic_version: 'bedrock-2023-06-01',
          max_tokens: 2048,
          system: `You are a culinary AI assistant. Generate recipe recommendations based on available ingredients, preferences, and dietary restrictions.

Return ONLY valid JSON, no markdown or extra text.`,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        }),
      });

      const output = JSON.parse(response.body.toString());
      const content = output.content[0].text;

      // Parse recipes from response
      const recipes = this._parseRecipes(content);
      return recipes;
    } catch (err) {
      console.error('Bedrock invocation failed:', err);
      throw new Error(`Recipe generation failed: ${err.message}`);
    }
  }

  /**
   * Build context prompt for Claude
   */
  _buildPrompt(context) {
    const {
      availableIngredients,
      preferences,
      consumptionHistory,
      dislikedIngredients,
      allergies,
    } = context;

    return `Generate 5 recipe recommendations based on this context:

AVAILABLE INGREDIENTS (pantry):
${availableIngredients.map((item) => `- ${item}`).join('\n')}

USER PREFERENCES:
- Cuisines: ${preferences.cuisinePreferences.join(', ')}
- Dietary restrictions: ${preferences.dietaryRestrictions.join(', ') || 'None'}
- Prep time: ${preferences.prepTimePreferences.min}-${preferences.prepTimePreferences.max} minutes
- Equipment: ${preferences.equipmentAvailable.join(', ')}

INGREDIENTS TO AVOID:
- Disliked: ${dislikedIngredients.join(', ')}
- Allergies: ${allergies.join(', ')}

RECENT CONSUMPTION (last 30 days):
${consumptionHistory
  .slice(0, 10)
  .map((item) => `- ${item.name} (${item.count}x)`)
  .join('\n')}

Generate recipes that:
1. Use at least 50% available ingredients
2. Match user cuisine preferences
3. Fit within prep time constraints
4. Avoid all allergens and dislikes
5. Suggest varied cuisines and ingredients

For each recipe, provide:
{
  "id": "recipe-<uuid>",
  "name": "Recipe name",
  "cuisine": "cuisine type",
  "prepTime": 30,
  "servings": 4,
  "ingredients": ["ingredient1", "ingredient2"],
  "matchedIngredients": ["available1", "available2"],
  "missingIngredients": ["needed1", "needed2"],
  "instructions": "Step-by-step cooking instructions",
  "score": 85,
  "reason": "Why this recipe matches preferences"
}`;
  }

  /**
   * Parse recipe JSON from Claude response
   */
  _parseRecipes(response) {
    try {
      // Try to extract JSON array from response
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('No JSON array found in response');
      }

      const recipes = JSON.parse(jsonMatch[0]);
      return Array.isArray(recipes) ? recipes : [recipes];
    } catch (err) {
      console.warn('Failed to parse recipes:', err.message);
      return [];
    }
  }
}

module.exports = BedrockClient;
```

---

## Recommendation Engine

**File**: `infra/cdk/lib/appsync/resolvers/recommendations.js`

```javascript
const crypto = require('crypto');

class Recommendations {
  constructor(dynamodb, bedrockClient, cache, tableName) {
    this.dynamodb = dynamodb;
    this.bedrock = bedrockClient;
    this.cache = cache;
    this.tableName = tableName;
  }

  /**
   * Get personalized recommendations for user
   */
  async getRecommendations(userId, householdId, options = {}) {
    const cacheKey = `USER#${userId}:recommendations`;

    try {
      // Check cache first
      const cached = await this.cache.get(
        cacheKey,
        async () => {
          // Not cached - generate new recommendations
          return this._generateRecommendations(userId, householdId, options);
        },
        21600,
      ); // 6-hour TTL

      return cached;
    } catch (err) {
      console.error('Error getting recommendations:', err);
      throw err;
    }
  }

  /**
   * Generate fresh recommendations
   */
  async _generateRecommendations(userId, householdId, options = {}) {
    // Fetch user preferences
    const preferences = await this._getUserPreferences(userId);

    // Fetch available items
    const availableItems = await this._getAvailableItems(householdId);

    // Fetch recent consumption
    const consumption = await this._getConsumptionHistory(householdId, options.days || 30);

    // Build context
    const context = {
      availableIngredients: availableItems.map((item) => item.name),
      preferences,
      consumptionHistory: consumption,
      dislikedIngredients: preferences.dislikedIngredients || [],
      allergies: preferences.allergies || [],
    };

    // Generate recipes via Bedrock
    const recipes = await this.bedrock.generateRecipeRecommendations(context);

    // Score and rank recipes
    const scoredRecipes = recipes.map((recipe) => ({
      ...recipe,
      score: this._calculateScore(recipe, context),
    }));

    // Sort by score
    const ranked = scoredRecipes.sort((a, b) => b.score - a.score).slice(0, 5); // Top 5

    // Save recommendations
    await Promise.all(ranked.map((recipe) => this._saveRecommendation(userId, recipe)));

    return ranked;
  }

  /**
   * Calculate composite recommendation score
   */
  _calculateScore(recipe, context) {
    let score = 50; // Base score

    // Ingredient match (0-30 points)
    const ingredientMatch = recipe.matchedIngredients.length / recipe.ingredients.length;
    score += ingredientMatch * 30;

    // Cuisine preference match (0-20 points)
    const cuisineMatch = context.preferences.cuisinePreferences.includes(recipe.cuisine) ? 20 : 0;
    score += cuisineMatch;

    // Prep time match (0-20 points)
    const prepInRange =
      recipe.prepTime >= context.preferences.prepTimePreferences.min &&
      recipe.prepTime <= context.preferences.prepTimePreferences.max;
    score += prepInRange ? 20 : -5;

    // No allergens penalty (-50 if contains allergen)
    const hasAllergen = recipe.ingredients.some((ing) =>
      context.allergies.some((allergen) => ing.toLowerCase().includes(allergen.toLowerCase())),
    );
    if (hasAllergen) score -= 50;

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Save recommendation for tracking
   */
  async _saveRecommendation(userId, recipe) {
    const item = {
      PK: { S: `USER#${userId}` },
      SK: { S: `RECOMMENDATION#${new Date().toISOString()}` },
      recipeId: { S: recipe.id || crypto.randomUUID() },
      recipeName: { S: recipe.name },
      cuisine: { S: recipe.cuisine },
      prepTime: { N: String(recipe.prepTime) },
      servings: { N: String(recipe.servings || 4) },
      ingredients: {
        L: recipe.ingredients.map((ing) => ({ S: ing })),
      },
      matchedIngredients: {
        L: recipe.matchedIngredients.map((ing) => ({ S: ing })),
      },
      missingIngredients: {
        L: recipe.missingIngredients.map((ing) => ({ S: ing })),
      },
      score: { N: String(recipe.score || 0) },
      reason: { S: recipe.reason || '' },
      createdAt: { S: new Date().toISOString() },
    };

    try {
      await this.dynamodb.putItem({
        TableName: this.tableName,
        Item: item,
      });
    } catch (err) {
      console.warn('Failed to save recommendation:', err);
      // Don't fail - saving is optional
    }
  }

  /**
   * Rate a recipe (for feedback loop)
   */
  async rateRecipe(userId, recipeId, rating, feedback = '') {
    const item = {
      PK: { S: `USER#${userId}` },
      SK: { S: `RECIPE_RATING#${recipeId}` },
      recipeId: { S: recipeId },
      rating: { N: String(rating) }, // 1-5 stars
      feedback: { S: feedback },
      createdAt: { S: new Date().toISOString() },
    };

    await this.dynamodb.putItem({
      TableName: this.tableName,
      Item: item,
    });

    // Invalidate recommendations cache (user preferences likely changed)
    const cacheKey = `USER#${userId}:recommendations`;
    await this.cache.invalidate(cacheKey);
  }

  // ─── Private Helpers ────────────────────────────────

  async _getUserPreferences(userId) {
    const response = await this.dynamodb.getItem({
      TableName: this.tableName,
      Key: {
        PK: { S: `USER#${userId}` },
        SK: { S: 'CONFIG#PREFERENCES' },
      },
    });

    if (!response.Item) {
      // Return defaults if no preferences set
      return {
        cuisinePreferences: ['any'],
        dietaryRestrictions: [],
        prepTimePreferences: { min: 5, max: 60 },
        equipmentAvailable: ['stovetop', 'oven'],
        dislikedIngredients: [],
        allergies: [],
      };
    }

    return this._deserializeDynamoDBItem(response.Item);
  }

  async _getAvailableItems(householdId) {
    // Query for recent items (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const response = await this.dynamodb.query({
      TableName: process.env.MAIN_TABLE_NAME,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk AND GSI1SK > :sk',
      ExpressionAttributeValues: {
        ':pk': { S: `HOUSEHOLD#${householdId}:items` },
        ':sk': { S: sevenDaysAgo.toISOString() },
      },
    });

    return (response.Items || []).map((item) => ({
      id: item.PK?.S,
      name: item.itemName?.S,
      category: item.category?.S,
    }));
  }

  async _getConsumptionHistory(householdId, days = 30) {
    // Query for eaten items in past N days
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const response = await this.dynamodb.query({
      TableName: this.tableName,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk AND GSI1SK BETWEEN :sk1 AND :sk2',
      ExpressionAttributeValues: {
        ':pk': { S: `HOUSEHOLD#${householdId}:eaten` },
        ':sk1': { S: startDate.toISOString() },
        ':sk2': { S: new Date().toISOString() },
      },
    });

    // Aggregate by item name
    const aggregated = {};
    (response.Items || []).forEach((item) => {
      const name = item.itemName?.S;
      if (name) {
        aggregated[name] = (aggregated[name] || 0) + 1;
      }
    });

    return Object.entries(aggregated)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }

  _deserializeDynamoDBItem(item) {
    const result = {};
    for (const [key, value] of Object.entries(item)) {
      if (value.S) {
        result[key] = value.S;
      } else if (value.N) {
        result[key] = Number(value.N);
      } else if (value.L) {
        result[key] = value.L.map((v) => v.S);
      } else if (value.M) {
        result[key] = this._deserializeDynamoDBItem(value.M);
      }
    }
    return result;
  }
}

module.exports = Recommendations;
```

---

## GraphQL Resolvers

### Query.getRecipeRecommendations

```javascript
// resolver: Query.getRecipeRecommendations.js
export const handler = async (event) => {
  const { householdId } = event.arguments;
  const { userId } = event.identity.claims;

  try {
    const recommendations = await recommendationEngine.getRecommendations(userId, householdId);

    return {
      userId,
      householdId,
      recommendations: recommendations.map((recipe) => ({
        id: recipe.id,
        name: recipe.name,
        cuisine: recipe.cuisine,
        prepTime: recipe.prepTime,
        servings: recipe.servings,
        ingredients: recipe.ingredients,
        matchedIngredients: recipe.matchedIngredients,
        missingIngredients: recipe.missingIngredients,
        instructions: recipe.instructions,
        score: recipe.score,
        reason: recipe.reason,
      })),
      generatedAt: new Date().toISOString(),
    };
  } catch (err) {
    console.error('Error getting recommendations:', err);
    throw err;
  }
};
```

### Mutation.setUserPreferences

```javascript
// resolver: Mutation.setUserPreferences.js
import Joi from 'joi';

const preferencesSchema = Joi.object({
  cuisinePreferences: Joi.array().items(Joi.string()),
  dietaryRestrictions: Joi.array().items(Joi.string()),
  prepTimePreferences: Joi.object({
    min: Joi.number().min(5).max(120),
    max: Joi.number().min(5).max(120),
  }),
  equipmentAvailable: Joi.array().items(Joi.string()),
  dislikedIngredients: Joi.array().items(Joi.string()),
  allergies: Joi.array().items(Joi.string()),
});

export const handler = async (event) => {
  const { preferences } = event.arguments;
  const { userId } = event.identity.claims;

  try {
    // Validate input
    const { value, error } = preferencesSchema.validate(preferences);
    if (error) {
      throw new Error(`Validation failed: ${error.message}`);
    }

    // Update DynamoDB
    const item = {
      PK: { S: `USER#${userId}` },
      SK: { S: 'CONFIG#PREFERENCES' },
      entityType: { S: 'UserPreferences' },
      ...Object.entries(value).reduce((acc, [key, val]) => {
        if (Array.isArray(val)) {
          acc[key] = { L: val.map((v) => ({ S: String(v) })) };
        } else if (typeof val === 'object') {
          acc[key] = { M: this._serializeObject(val) };
        } else {
          acc[key] = { S: String(val) };
        }
        return acc;
      }, {}),
      _version: { N: '1' },
      updatedAt: { S: new Date().toISOString() },
    };

    await dynamodb.putItem({
      TableName: process.env.TABLE_NAME,
      Item: item,
    });

    // Invalidate recommendations cache
    const cacheKey = `USER#${userId}:recommendations`;
    await cache.invalidate(cacheKey);

    return {
      success: true,
      message: 'Preferences updated',
      preferences: value,
    };
  } catch (err) {
    console.error('Error updating preferences:', err);
    return {
      success: false,
      message: err.message,
      preferences: null,
    };
  }
};
```

### Mutation.rateRecipe

```javascript
// resolver: Mutation.rateRecipe.js
export const handler = async (event) => {
  const { recipeId, rating, feedback } = event.arguments;
  const { userId } = event.identity.claims;

  try {
    // Validate rating
    if (rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }

    // Save rating
    await recommendationEngine.rateRecipe(userId, recipeId, rating, feedback || '');

    return {
      success: true,
      message: 'Recipe rated successfully',
    };
  } catch (err) {
    console.error('Error rating recipe:', err);
    return {
      success: false,
      message: err.message,
    };
  }
};
```

---

## GraphQL Schema

```graphql
type Recipe {
  id: ID!
  name: String!
  cuisine: String!
  prepTime: Int!
  servings: Int!
  ingredients: [String!]!
  matchedIngredients: [String!]!
  missingIngredients: [String!]!
  instructions: String!
  score: Int! # 0-100
  reason: String!
}

type RecipeRecommendationResult {
  userId: ID!
  householdId: ID!
  recommendations: [Recipe!]!
  generatedAt: DateTime!
}

type UserPreferences {
  cuisinePreferences: [String!]!
  dietaryRestrictions: [String!]!
  prepTimePreferences: PrepTimeRange!
  equipmentAvailable: [String!]!
  dislikedIngredients: [String!]!
  allergies: [String!]!
}

type PrepTimeRange {
  min: Int!
  max: Int!
}

type SetPreferencesResult {
  success: Boolean!
  message: String!
  preferences: UserPreferences
}

type RateRecipeResult {
  success: Boolean!
  message: String!
}

extend type Query {
  getRecipeRecommendations(householdId: ID!): RecipeRecommendationResult!
  getUserPreferences: UserPreferences!
}

extend type Mutation {
  setUserPreferences(preferences: UserPreferencesInput!): SetPreferencesResult!
  rateRecipe(recipeId: ID!, rating: Int!, feedback: String): RateRecipeResult!
}

input UserPreferencesInput {
  cuisinePreferences: [String!]
  dietaryRestrictions: [String!]
  prepTimePreferences: PrepTimeRangeInput
  equipmentAvailable: [String!]
  dislikedIngredients: [String!]
  allergies: [String!]
}

input PrepTimeRangeInput {
  min: Int!
  max: Int!
}
```

---

## Cost Tracking & Optimization

### Cost Analysis

| Model           | Cost/Call | Est. Daily        | Est. Monthly | With 70% Cache |
| --------------- | --------- | ----------------- | ------------ | -------------- |
| Claude 3 Sonnet | $0.003    | $2.40 (800 calls) | ~$72         | ~$21           |
| Cached hits     | $0.000    | -                 | -            | -              |
| **Total**       | -         | **$2.40**         | **~$72**     | **~$21**       |

### Optimization Strategies

1. **Aggressive Caching**: 6-hour TTL covers ~70% of requests
2. **Preference Inference**: Learn from user ratings to improve prompts
3. **Batch Requests**: Generate for multiple users simultaneously
4. **Rate Limiting**: Prevent excessive calls from single user
5. **Model Selection**: Use faster/cheaper models for simple queries

---

## A/B Testing Framework

```javascript
class RecipeABTest {
  /**
   * Run A/B test between two recommendation strategies
   */
  async runTest(userId, householdId, variants = ['baseline', 'improved']) {
    const results = {};

    for (const variant of variants) {
      const recommendations = await this.getRecommendations(userId, householdId, { variant });

      results[variant] = {
        recommendations,
        metrics: {
          avgScore: this._calculateAvgScore(recommendations),
          ingredientMatch: this._calculateAvgMatch(recommendations),
          cuisineMatch: this._calculateCuisineMatch(recommendations),
        },
      };
    }

    // Track for analysis
    await this._saveTestResult(userId, results);

    return results;
  }
}
```

---

## Monitoring & Cost Control

```typescript
// CloudWatch metrics
const bedrockCalls = new cloudwatch.Metric({
  namespace: 'WhatsFresh/ML',
  metricName: 'BedrockInvocations',
  statistic: 'Sum',
});

const cacheHitRate = new cloudwatch.Metric({
  namespace: 'WhatsFresh/ML',
  metricName: 'RecommendationCacheHitRate',
  statistic: 'Average',
  unit: cloudwatch.Unit.PERCENT,
});

const estimatedCost = new cloudwatch.Metric({
  namespace: 'WhatsFresh/ML',
  metricName: 'EstimatedMonthlyCost',
  statistic: 'Sum',
});

// Alarms
new cloudwatch.Alarm(this, 'HighBedrockCost', {
  metric: bedrockCalls,
  threshold: 30000, // 30K calls/month = $90
  alarmName: 'wfl-bedrock-cost-high',
});
```

---

## Deployment Checklist

- [ ] Bedrock access enabled in AWS account
- [ ] Claude 3 Sonnet model enabled
- [ ] IAM roles configured for Lambda → Bedrock
- [ ] UserPreferences and RecipeRecommendation tables created
- [ ] BedrockClient implemented and tested
- [ ] Recommendations engine deployed
- [ ] GraphQL resolvers deployed
- [ ] Cache integration verified
- [ ] Cost monitoring dashboard created
- [ ] Rate limiting configured
- [ ] A/B testing framework ready

---

## Performance Expectations

| Metric                       | Target              |
| ---------------------------- | ------------------- |
| Cache hit rate               | 70%+                |
| Cached response latency      | <10ms               |
| Fresh recommendation latency | <3s                 |
| Recipe relevance             | 85%+ (user ratings) |
| Monthly cost                 | <$100 with caching  |
| Bedrock availability         | 99.9%               |

---

## Future Enhancements

1. **Fine-tuning**: Custom model trained on user feedback
2. **Real-time Updates**: Invalidate cache on preference changes
3. **Collaborative Filtering**: Cross-user recommendations
4. **Seasonal Recipes**: Adjust based on ingredient seasonality
5. **Batch Recommendations**: Pre-generate for all users nightly

---

## Next Steps

1. ✅ Get Bedrock access enabled
2. ✅ Deploy UserPreferences storage
3. ✅ Implement BedrockClient
4. ✅ Deploy recommendation engine
5. ✅ Test end-to-end flow
6. ✅ Monitor costs and hit rates
7. Continue to Phase C.4 (Image Optimization)
