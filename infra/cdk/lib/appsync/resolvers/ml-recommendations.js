import { BedrockRuntime } from '@aws-sdk/client-bedrock-runtime';
import { DynamoDBDocumentClient, get, put, query } from '@aws-sdk/lib-dynamodb';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

const MODEL_ID = 'anthropic.claude-3-sonnet-20240229-v1:0';
const RECOMMENDATIONS_TABLE = process.env.RECOMMENDATIONS_TABLE || 'WhatsForLunch-Recommendations';
const PREFERENCES_TABLE = process.env.PREFERENCES_TABLE || 'WhatsForLunch-Preferences';

export class Recommendations {
  constructor(options = {}) {
    this.bedrockClient = new BedrockRuntime({ region: process.env.AWS_REGION || 'us-east-1' });
    this.dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
    this.docClient = DynamoDBDocumentClient.from(this.dynamoClient);
    this.recommendationsTable = options.recommendationsTable || RECOMMENDATIONS_TABLE;
    this.preferencesTable = options.preferencesTable || PREFERENCES_TABLE;
    this.stats = {
      generated: 0,
      cached: 0,
      failed: 0,
    };
  }

  async getRecipeRecommendations(userId, householdId, options = {}) {
    try {
      const limit = options.limit || 5;
      const preferences = await this.getUserPreferences(userId);
      const pantryItems = await this.getHouseholdPantry(householdId);
      const history = await this.getConsumptionHistory(userId, { days: 30 });

      const prompt = this.buildPrompt(preferences, pantryItems, history, limit);
      const recommendations = await this.invokeBedrockClaudeSonnet(prompt);
      const parsed = this.parseRecommendations(recommendations, limit);

      // Store recommendations
      await this.storeRecommendations(userId, householdId, parsed);
      this.stats.generated++;

      return {
        success: true,
        recommendations: parsed,
        source: 'generated',
      };
    } catch (error) {
      console.error('[Recommendations] Get recommendations error:', error.message);
      this.stats.failed++;
      return {
        success: false,
        error: error.message,
        recommendations: [],
        source: 'error',
      };
    }
  }

  buildPrompt(preferences, pantryItems, history, limit) {
    const pantryList = pantryItems
      .slice(0, 15)
      .map((item) => `- ${item.name} (expires: ${item.expiryDate})`)
      .join('\n');
    const historyList = history
      .slice(0, 10)
      .map((h) => `- ${h.itemName}`)
      .join('\n');

    return `
You are a helpful recipe recommendation engine for WhatsForLunch, a food waste reduction app.

User Preferences:
- Dietary Restrictions: ${preferences.dietary?.join(', ') || 'None'}
- Cuisines: ${preferences.cuisines?.join(', ') || 'Any'}
- Cooking Time: ${preferences.cookingTime || 'Any'}
- Skill Level: ${preferences.skillLevel || 'Intermediate'}

Available Pantry Items:
${pantryList}

Recent Consumption:
${historyList}

Generate exactly ${limit} recipe recommendations that:
1. Use available pantry items (prioritize items expiring soon)
2. Match user preferences
3. Are practical to prepare given skill level
4. Help reduce food waste

Return ONLY a JSON array with this format:
[
  {
    "title": "Recipe Name",
    "description": "Brief description",
    "ingredients": ["item1", "item2"],
    "preparationTime": "30 mins",
    "difficulty": "Easy|Medium|Hard",
    "wasteScore": 0.9
  }
]

Do not include markdown, explanations, or any other text. Only JSON.
`;
  }

  async invokeBedrockClaudeSonnet(prompt) {
    try {
      const response = await this.bedrockClient.invokeModel({
        modelId: MODEL_ID,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify({
          anthropic_version: 'bedrock-2023-06-01',
          max_tokens: 1024,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        }),
      });

      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      if (responseBody.content && responseBody.content[0]) {
        return responseBody.content[0].text;
      }
      throw new Error('No content in Bedrock response');
    } catch (error) {
      console.error('[Recommendations] Bedrock invocation error:', error.message);
      throw error;
    }
  }

  parseRecommendations(response, limit) {
    try {
      // Extract JSON from response
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        console.warn('[Recommendations] No JSON found in response');
        return [];
      }

      const parsed = JSON.parse(jsonMatch[0]);
      if (!Array.isArray(parsed)) {
        console.warn('[Recommendations] Response is not an array');
        return [];
      }

      return parsed.slice(0, limit).map((rec) => ({
        id: this._generateId(),
        title: rec.title || 'Unknown Recipe',
        description: rec.description || '',
        ingredients: Array.isArray(rec.ingredients) ? rec.ingredients : [],
        preparationTime: rec.preparationTime || 'Unknown',
        difficulty: rec.difficulty || 'Medium',
        wasteScore: typeof rec.wasteScore === 'number' ? rec.wasteScore : 0.5,
        generatedAt: new Date().toISOString(),
      }));
    } catch (error) {
      console.error('[Recommendations] Parse error:', error.message);
      return [];
    }
  }

  async getUserPreferences(userId) {
    try {
      const response = await this.docClient.send(
        new get.constructor({
          TableName: this.preferencesTable,
          Key: {
            PK: `USER#${userId}`,
            SK: 'PREFERENCES',
          },
        }),
      );

      return (
        response.Item?.preferences || {
          dietary: [],
          cuisines: [],
          cookingTime: 'any',
          skillLevel: 'intermediate',
        }
      );
    } catch (error) {
      console.warn('[Recommendations] Get preferences error:', error.message);
      return {
        dietary: [],
        cuisines: [],
        cookingTime: 'any',
        skillLevel: 'intermediate',
      };
    }
  }

  async setUserPreferences(userId, preferences) {
    try {
      await this.docClient.send(
        new put.constructor({
          TableName: this.preferencesTable,
          Item: {
            PK: `USER#${userId}`,
            SK: 'PREFERENCES',
            preferences,
            updatedAt: new Date().toISOString(),
          },
        }),
      );
      return true;
    } catch (error) {
      console.error('[Recommendations] Set preferences error:', error.message);
      return false;
    }
  }

  async getHouseholdPantry(householdId) {
    try {
      const response = await this.docClient.send(
        new query.constructor({
          TableName: 'WhatsForLunch-Items',
          IndexName: 'HouseholdId-ExpiryDate-Index',
          KeyConditionExpression: 'householdId = :hid',
          ExpressionAttributeValues: {
            ':hid': householdId,
          },
          Limit: 50,
          ScanIndexForward: true, // Oldest first (expiring soon)
        }),
      );

      return (response.Items || [])
        .filter((item) => !item.status || item.status === 'active')
        .map((item) => ({
          id: item.id,
          name: item.name,
          expiryDate: item.expiryDate,
          quantity: item.quantity,
          unit: item.unit,
        }));
    } catch (error) {
      console.warn('[Recommendations] Get pantry error:', error.message);
      return [];
    }
  }

  async getConsumptionHistory(userId, options = {}) {
    try {
      const days = options.days || 30;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const response = await this.docClient.send(
        new query.constructor({
          TableName: 'WhatsForLunch-Items',
          IndexName: 'UserId-UpdatedAt-Index',
          KeyConditionExpression: 'userId = :uid AND updatedAt > :date',
          ExpressionAttributeValues: {
            ':uid': userId,
            ':date': startDate.toISOString(),
          },
          Limit: 50,
          ScanIndexForward: false,
        }),
      );

      return (response.Items || [])
        .filter((item) => item.status === 'eaten')
        .map((item) => ({
          itemName: item.name,
          eatenAt: item.updatedAt,
        }));
    } catch (error) {
      console.warn('[Recommendations] Get history error:', error.message);
      return [];
    }
  }

  async storeRecommendations(userId, householdId, recommendations) {
    try {
      await this.docClient.send(
        new put.constructor({
          TableName: this.recommendationsTable,
          Item: {
            PK: `USER#${userId}`,
            SK: `RECOMMENDATIONS#${new Date().toISOString()}`,
            householdId,
            recommendations,
            expiresAt: Math.floor(Date.now() / 1000) + 24 * 60 * 60, // 24 hour TTL
          },
        }),
      );
    } catch (error) {
      console.warn('[Recommendations] Store error:', error.message);
    }
  }

  _generateId() {
    return `rec_${Math.random().toString(36).substring(2, 9)}`;
  }

  getStats() {
    return this.stats;
  }
}

export class RecommendationABTest {
  constructor(options = {}) {
    this.docClient = DynamoDBDocumentClient.from(
      new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' }),
    );
    this.testsTable = options.testsTable || 'WhatsForLunch-ABTests';
  }

  async trackImpression(userId, testId, variant) {
    try {
      await this.docClient.send(
        new put.constructor({
          TableName: this.testsTable,
          Item: {
            PK: `TEST#${testId}`,
            SK: `IMPRESSION#${userId}#${new Date().toISOString()}`,
            userId,
            variant,
            type: 'impression',
            timestamp: new Date().toISOString(),
          },
        }),
      );
    } catch (error) {
      console.error('[ABTest] Track impression error:', error.message);
    }
  }

  async trackConversion(userId, testId, variant, metadata = {}) {
    try {
      await this.docClient.send(
        new put.constructor({
          TableName: this.testsTable,
          Item: {
            PK: `TEST#${testId}`,
            SK: `CONVERSION#${userId}#${new Date().toISOString()}`,
            userId,
            variant,
            type: 'conversion',
            metadata,
            timestamp: new Date().toISOString(),
          },
        }),
      );
    } catch (error) {
      console.error('[ABTest] Track conversion error:', error.message);
    }
  }
}

export default Recommendations;
