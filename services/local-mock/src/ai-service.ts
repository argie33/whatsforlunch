import Anthropic from '@anthropic-ai/sdk';
import { execSync } from 'child_process';

interface ClassificationResult {
  foodName: string;
  category: string;
  fridgeDays: number;
  confidence: number;
  source: 'bedrock' | 'claude-local' | 'claude-api' | 'mock';
}

interface OCRResult {
  expiryDate: string;
  confidence: number;
  source: 'textract' | 'claude-local' | 'claude-api' | 'mock';
}

export class AIService {
  private client: Anthropic | null = null;
  private usesMocks = false;
  private useClaudeCode = false;

  constructor() {
    // Priority: Claude Code subprocess > Claude API key > Mocks
    const apiKey = process.env.ANTHROPIC_API_KEY;

    // Try to detect Claude Code availability
    try {
      execSync('claude --version', { stdio: 'pipe' });
      this.useClaudeCode = true;
      console.log('[AIService] ✅ Using Claude Code (local subprocess) for food classification & recipes');
    } catch {
      if (apiKey) {
        this.client = new Anthropic({ apiKey });
        console.log('[AIService] ✅ Using Claude API for food classification & recipes');
      } else {
        console.log('[AIService] ℹ️  Claude Code & API not available. Using mock responses (set ANTHROPIC_API_KEY to enable real Claude)');
        this.usesMocks = true;
      }
    }
  }

  async classifyFood(photoUrl: string): Promise<ClassificationResult> {
    if (this.useClaudeCode) {
      return this.classifyFoodWithClaudeCode(photoUrl);
    }
    if (this.client) {
      return this.classifyFoodWithClaude(photoUrl);
    }
    return this.mockClassifyFood();
  }

  async ocrExpiryDate(photoUrl: string): Promise<OCRResult> {
    if (this.useClaudeCode) {
      return this.ocrExpiryDateWithClaudeCode(photoUrl);
    }
    if (this.client) {
      return this.ocrExpiryDateWithClaude(photoUrl);
    }
    return this.mockOCRExpiryDate();
  }

  async generateRecipes(itemNames: string[], dietaryPreferences?: string[], allergens?: string[]) {
    if (this.useClaudeCode) {
      return this.generateRecipesWithClaudeCode(itemNames, dietaryPreferences, allergens);
    }
    if (this.client) {
      return this.generateRecipesWithClaude(itemNames, dietaryPreferences, allergens);
    }
    return this.mockGenerateRecipes(itemNames);
  }

  private mockClassifyFood(): ClassificationResult {
    const foods = [
      { name: 'Greek Yogurt', category: 'dairy', days: 14 },
      { name: 'Leftover Pasta', category: 'leftover', days: 3 },
      { name: 'Baked Chicken', category: 'protein', days: 4 },
      { name: 'Fresh Berries', category: 'produce', days: 5 },
    ];
    const food = foods[Math.floor(Math.random() * foods.length)];
    return {
      foodName: food.name,
      category: food.category,
      fridgeDays: food.days,
      confidence: 0.85,
      source: 'mock' as const,
    };
  }

  private mockOCRExpiryDate(): OCRResult {
    const today = new Date();
    const inDays = Math.floor(Math.random() * 30) + 7;
    const expiry = new Date(today.getTime() + inDays * 86_400_000);
    return {
      expiryDate: expiry.toISOString().split('T')[0],
      confidence: 0.9,
      source: 'mock',
    };
  }

  private mockGenerateRecipes(itemNames: string[]) {
    return [
      {
        title: `Quick ${itemNames.slice(0, 2).join(' and ')} Stir Fry`,
        summary: `A simple and delicious stir fry using available ingredients`,
        cuisine: 'asian',
        durationMinutes: 20,
        difficulty: 'easy',
        servings: 4,
        missingIngredients: ['soy sauce', 'garlic'],
        steps: ['Heat oil', 'Add ingredients', 'Stir and cook'],
      },
    ];
  }

  // ─── Claude Code (Local Subprocess) ────────────────────────────────────────

  private async classifyFoodWithClaudeCode(photoUrl: string): Promise<ClassificationResult> {
    try {
      const prompt = `You are a food identification expert. Analyze this food image and identify:
1. Food name (be specific)
2. Food category (one of: protein, grain, dairy, produce, leftover, sauce, baked, prepared, beverage)
3. Estimated shelf life in fridge (in days, 1-30)
4. Your confidence level (0.0-1.0)

Respond ONLY with JSON:
{"foodName": "...", "category": "...", "fridgeDays": number, "confidence": number}`;

      const result = this.callClaudeCode(prompt, photoUrl);
      return {
        ...result,
        source: 'claude-local',
      };
    } catch (err) {
      console.error('[AIService] Claude Code classification error:', err);
      return this.mockClassifyFood();
    }
  }

  private async ocrExpiryDateWithClaudeCode(photoUrl: string): Promise<OCRResult> {
    try {
      const prompt = `Find the expiry/best before date on this product packaging.
Return ONLY JSON: {"expiryDate": "YYYY-MM-DD", "confidence": 0.0-1.0}
If no date found, set expiryDate to null.`;

      const result = this.callClaudeCode(prompt, photoUrl);
      if (!result.expiryDate) {
        throw new Error('No expiry date found');
      }
      return {
        expiryDate: result.expiryDate,
        confidence: result.confidence || 0.8,
        source: 'claude-local',
      };
    } catch (err) {
      console.error('[AIService] Claude Code OCR error:', err);
      return this.mockOCRExpiryDate();
    }
  }

  private async generateRecipesWithClaudeCode(
    itemNames: string[],
    dietaryPreferences?: string[],
    allergens?: string[],
  ) {
    try {
      const availableItems = itemNames.join(', ');
      let prompt = `You are a chef. Generate 2-5 creative, practical recipes using these ingredients: ${availableItems}.
Keep recipes simple (15-60 min). Return ONLY JSON array:
[{"title": "...", "summary": "...", "durationMinutes": 30, "difficulty": "easy|medium|hard", "servings": 4, "missingIngredients": [...], "steps": [...]}]`;

      if (dietaryPreferences?.length) {
        prompt += `\nDietary preferences: ${dietaryPreferences.join(', ')}`;
      }
      if (allergens?.length) {
        prompt += `\nAllergens to avoid: ${allergens.join(', ')}`;
      }

      const result = this.callClaudeCode(prompt);
      return Array.isArray(result) ? result : [result];
    } catch (err) {
      console.error('[AIService] Claude Code recipe generation error:', err);
      return this.mockGenerateRecipes(itemNames);
    }
  }

  private callClaudeCode(prompt: string, imageUrl?: string): any {
    try {
      // Prepare the message for Claude Code
      let message = prompt;
      if (imageUrl && !imageUrl.startsWith('data:')) {
        // For HTTP URLs, include in the prompt
        message = `[Analyzing image: ${imageUrl}]\n\n${prompt}`;
      }

      // Call Claude Code via subprocess
      const result = execSync(`claude -q "${message.replace(/"/g, '\\"')}"`, {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      // Parse the JSON response
      const jsonMatch = result.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('No JSON in response');
      }

      return JSON.parse(jsonMatch[0]);
    } catch (err) {
      console.error('[AIService] Claude Code subprocess error:', err);
      throw err;
    }
  }

  private buildImageSource(photoUrl: string): any {
    // Handle data URLs (base64 encoded)
    if (photoUrl.startsWith('data:')) {
      const matches = photoUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (matches) {
        return {
          type: 'base64',
          media_type: matches[1] as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
          data: matches[2],
        };
      }
    }

    // Handle regular HTTP/HTTPS URLs
    return {
      type: 'url',
      url: photoUrl,
    };
  }

  private async classifyFoodWithClaude(photoUrl: string): Promise<ClassificationResult> {
    try {
      // Handle both data URLs and regular HTTP URLs
      const imageSource = this.buildImageSource(photoUrl);

      const message = await this.client!.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 500,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: imageSource,
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

      const textContent = message.content.find((c) => c.type === 'text') as any;
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
      // Handle both data URLs and regular HTTP URLs
      const imageSource = this.buildImageSource(photoUrl);

      const message = await this.client!.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 200,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: imageSource,
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

      const textContent = message.content.find((c) => c.type === 'text') as any;
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
    allergens?: string[],
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

      const message = await this.client!.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const textContent = message!.content.find((c) => c.type === 'text') as any;
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
