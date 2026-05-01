import Anthropic from '@anthropic-ai/sdk';

interface ClassificationResult {
  foodName: string;
  category: string;
  fridgeDays: number;
  confidence: number;
  source: 'bedrock' | 'mock';
}

interface OCRResult {
  expiryDate: string;
  confidence: number;
  source: 'textract' | 'mock';
}

export class AIService {
  private client: Anthropic;

  constructor() {
    // Initialize Anthropic client with API key
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error(
        'ANTHROPIC_API_KEY not set. Please set it to use real Claude AI for food classification.'
      );
    }
    this.client = new Anthropic({ apiKey });
    console.log('[AIService] Using REAL Claude API for food classification & recipes');
  }

  async classifyFood(photoUrl: string): Promise<ClassificationResult> {
    return this.classifyFoodWithClaude(photoUrl);
  }

  async ocrExpiryDate(photoUrl: string): Promise<OCRResult> {
    return this.ocrExpiryDateWithClaude(photoUrl);
  }

  async generateRecipes(itemNames: string[], dietaryPreferences?: string[], allergens?: string[]) {
    return this.generateRecipesWithClaude(itemNames, dietaryPreferences, allergens);
  }

  private async classifyFoodWithClaude(photoUrl: string): Promise<ClassificationResult> {
    try {
      // Extract base64 from dataURL if needed
      let imageData = photoUrl;
      let mediaType = 'image/jpeg';
      if (photoUrl.startsWith('data:')) {
        const matches = photoUrl.match(/^data:([^;]+);base64,(.+)$/);
        if (matches) {
          mediaType = matches[1];
          imageData = matches[2];
        } else {
          imageData = photoUrl.split(',')[1];
        }
      }

      const message = await this.client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 500,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mediaType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
                  data: imageData,
                },
              },
              {
                type: 'text',
                text: `You are a food identification expert. Analyze this food image and identify:
1. Food name (be specific, e.g., "Roasted chicken with herbs")
2. Food category (one of: protein, grain, dairy, produce, leftover, sauce, baked, prepared, beverage)
3. Estimated shelf life in fridge (in days, typically 1-30)
4. Your confidence level (0.0-1.0)

Respond ONLY with valid JSON, no markdown or extra text:
{
  "foodName": "string",
  "category": "string",
  "fridgeDays": number,
  "confidence": number
}`,
              },
            ],
          },
        ],
      });

      const textContent = message.content.find((c) => c.type === 'text');
      if (!textContent || textContent.type !== 'text') {
        throw new Error('No text response from Claude');
      }

      const result = JSON.parse(textContent.text);

      return {
        foodName: result.foodName || 'Unknown food',
        category: result.category || 'leftover',
        fridgeDays: Math.min(Math.max(result.fridgeDays || 3, 1), 30),
        confidence: Math.min(Math.max(result.confidence || 0.85, 0), 1),
        source: 'bedrock',
      };
    } catch (err) {
      console.error('[AIService] Claude classification error:', err);
      throw err;
    }
  }

  private async ocrExpiryDateWithClaude(photoUrl: string): Promise<OCRResult> {
    try {
      // Extract base64 from dataURL if needed
      let imageData = photoUrl;
      let mediaType = 'image/jpeg';
      if (photoUrl.startsWith('data:')) {
        const matches = photoUrl.match(/^data:([^;]+);base64,(.+)$/);
        if (matches) {
          mediaType = matches[1];
          imageData = matches[2];
        } else {
          imageData = photoUrl.split(',')[1];
        }
      }

      const message = await this.client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 200,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mediaType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
                  data: imageData,
                },
              },
              {
                type: 'text',
                text: `Find the expiry/best before date on this product packaging. Return ONLY valid JSON:
{
  "expiryDate": "YYYY-MM-DD",
  "confidence": 0.0-1.0
}

If no date found, set expiryDate to null and confidence to 0.`,
              },
            ],
          },
        ],
      });

      const textContent = message.content.find((c) => c.type === 'text');
      if (!textContent || textContent.type !== 'text') {
        throw new Error('No text response from Claude');
      }

      const result = JSON.parse(textContent.text);

      if (!result.expiryDate) {
        throw new Error('No expiry date found');
      }

      return {
        expiryDate: result.expiryDate,
        confidence: Math.min(Math.max(result.confidence || 0.8, 0), 1),
        source: 'textract',
      };
    } catch (err) {
      console.error('[AIService] Claude OCR error:', err);
      throw err;
    }
  }

  private async generateRecipesWithClaude(
    itemNames: string[],
    dietaryPreferences?: string[],
    allergens?: string[]
  ) {
    try {
      const availableItems = itemNames.join(', ');
      let prompt = `You are a chef. Generate 2-5 creative, practical recipes using these available ingredients: ${availableItems}.

Keep recipes simple (15-60 min cook time). Return ONLY valid JSON array:
[
  {
    "title": "Recipe name",
    "summary": "One sentence description",
    "durationMinutes": 30,
    "difficulty": "easy|medium|hard",
    "servings": 4,
    "missingIngredients": ["optional pantry items if needed"],
    "steps": ["Step 1", "Step 2", "..."]
  }
]`;

      if (dietaryPreferences?.length) {
        prompt += `\nDietary preferences: ${dietaryPreferences.join(', ')}`;
      }
      if (allergens?.length) {
        prompt += `\nAVOID these allergens: ${allergens.join(', ')}`;
      }

      const message = await this.client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const textContent = message.content.find((c) => c.type === 'text');
      if (!textContent || textContent.type !== 'text') {
        throw new Error('No text response from Claude');
      }

      const recipes = JSON.parse(textContent.text);

      if (!Array.isArray(recipes)) {
        throw new Error('Expected array of recipes');
      }

      return recipes.map((recipe: any) => ({
        title: recipe.title || 'Recipe',
        summary: recipe.summary || '',
        cuisine: 'mixed',
        durationMinutes: Math.min(Math.max(recipe.durationMinutes || 30, 5), 300),
        difficulty: recipe.difficulty || 'medium',
        servings: Math.min(Math.max(recipe.servings || 4, 1), 12),
        missingIngredients: recipe.missingIngredients || [],
        steps: recipe.steps || [],
      }));
    } catch (err) {
      console.error('[AIService] Claude recipe generation error:', err);
      throw err;
    }
  }

}

// Singleton instance
let aiServiceInstance: AIService | null = null;

export function getAIService(): AIService {
  if (!aiServiceInstance) {
    aiServiceInstance = new AIService();
  }
  return aiServiceInstance;
}
