import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { TextractClient, AnalyzeDocumentCommand } from '@aws-sdk/client-textract';

// Mock data for fallback
const MOCK_FOODS = [
  {
    foodType: 'leftover_pasta',
    foodName: 'Pasta with marinara',
    category: 'leftover',
    fridgeDays: 3,
  },
  { foodType: 'roasted_chicken', foodName: 'Roasted chicken', category: 'protein', fridgeDays: 4 },
  { foodType: 'greek_yogurt', foodName: 'Greek yogurt', category: 'dairy', fridgeDays: 14 },
  { foodType: 'mixed_salad', foodName: 'Mixed green salad', category: 'produce', fridgeDays: 1 },
  { foodType: 'cooked_rice', foodName: 'White rice', category: 'grain', fridgeDays: 4 },
  { foodType: 'tomato_soup', foodName: 'Tomato soup', category: 'sauce', fridgeDays: 5 },
  { foodType: 'chocolate_cake', foodName: 'Chocolate cake', category: 'baked', fridgeDays: 7 },
  { foodType: 'grilled_salmon', foodName: 'Grilled salmon', category: 'protein', fridgeDays: 3 },
  { foodType: 'orange_juice', foodName: 'Fresh orange juice', category: 'beverage', fridgeDays: 7 },
  { foodType: 'cheddar_cheese', foodName: 'Cheddar cheese', category: 'dairy', fridgeDays: 30 },
];

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
  private bedrockClient: BedrockRuntimeClient | null = null;
  private textractClient: TextractClient | null = null;
  private useRealAI = false;

  constructor() {
    // Initialize AWS clients if credentials are available
    try {
      const region = process.env.AWS_REGION || 'us-east-1';

      // Check if AWS credentials are available
      if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
        this.bedrockClient = new BedrockRuntimeClient({ region });
        this.textractClient = new TextractClient({ region });
        this.useRealAI = true;
        console.log('[AIService] AWS credentials found, using real AI services');
      } else {
        console.log('[AIService] No AWS credentials found, falling back to mocks');
      }
    } catch (err) {
      console.warn('[AIService] Failed to initialize AWS clients:', err);
    }
  }

  async classifyFood(photoUrl: string): Promise<ClassificationResult> {
    // If real AI is available, try it first
    if (this.bedrockClient) {
      try {
        return await this.classifyFoodWithBedrock(photoUrl);
      } catch (err) {
        console.warn('[AIService] Bedrock classification failed, falling back to mock:', err);
      }
    }

    // Fall back to mock
    return this.classifyFoodMock();
  }

  async ocrExpiryDate(photoUrl: string): Promise<OCRResult> {
    // If real AI is available, try it first
    if (this.textractClient) {
      try {
        return await this.ocrExpiryDateWithTextract(photoUrl);
      } catch (err) {
        console.warn('[AIService] Textract OCR failed, falling back to mock:', err);
      }
    }

    // Fall back to mock
    return this.ocrExpiryDateMock();
  }

  private async classifyFoodWithBedrock(photoUrl: string): Promise<ClassificationResult> {
    if (!this.bedrockClient) throw new Error('Bedrock client not initialized');

    try {
      // Extract base64 from dataURL if needed
      let imageData = photoUrl;
      if (photoUrl.startsWith('data:')) {
        imageData = photoUrl.split(',')[1];
      }

      // Create prompt for Claude to classify food from image
      const prompt = `You are a food identification expert. Analyze this food image and provide:
1. Food name (be specific, e.g., "Roasted chicken with herbs")
2. Food category (protein, grain, dairy, produce, leftover, sauce, baked, prepared, or beverage)
3. Estimated shelf life in fridge (in days, typically 1-30)
4. Your confidence level (0.0-1.0)

Respond in JSON format:
{
  "foodName": "string",
  "category": "string",
  "fridgeDays": number,
  "confidence": number
}`;

      const command = new InvokeModelCommand({
        modelId: 'anthropic.claude-3-haiku-20240307-v1:0',
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify({
          anthropic_version: 'bedrock-2023-06-01',
          max_tokens: 500,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'image',
                  source: {
                    type: 'base64',
                    media_type: 'image/jpeg',
                    data: imageData,
                  },
                },
                {
                  type: 'text',
                  text: prompt,
                },
              ],
            },
          ],
        }),
      });

      const response = await this.bedrockClient.send(command);
      const body = JSON.parse(new TextDecoder().decode(response.body));
      const content = body.content[0]?.text || '{}';
      const result = JSON.parse(content);

      return {
        foodName: result.foodName || 'Unknown food',
        category: result.category || 'leftover',
        fridgeDays: Math.min(Math.max(result.fridgeDays || 3, 1), 30),
        confidence: Math.min(Math.max(result.confidence || 0.85, 0), 1),
        source: 'bedrock',
      };
    } catch (err) {
      console.error('[AIService] Bedrock error:', err);
      throw err;
    }
  }

  private async ocrExpiryDateWithTextract(photoUrl: string): Promise<OCRResult> {
    if (!this.textractClient) throw new Error('Textract client not initialized');

    try {
      // Extract base64 from dataURL if needed
      let imageData = photoUrl;
      if (photoUrl.startsWith('data:')) {
        imageData = photoUrl.split(',')[1];
      }

      // Convert base64 to bytes
      const imageBytes = Buffer.from(imageData, 'base64');

      const command = new AnalyzeDocumentCommand({
        Document: {
          Bytes: imageBytes,
        },
        FeatureTypes: ['FORMS', 'TABLES'],
      });

      const response = await this.textractClient.send(command);

      // Extract expiry date from document text
      let expiryDate: string | null = null;
      let confidence = 0;

      if (response.Blocks) {
        const text = response.Blocks.map((block) => block.Text || '').join(' ');

        // Look for common date patterns (MM/DD/YY, DD/MM/YY, YYYY-MM-DD, etc.)
        const datePattern = /(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}-\d{2}-\d{2})/g;
        const matches = text.match(datePattern);

        if (matches && matches.length > 0) {
          // Use the first date found
          const dateStr = matches[0];
          expiryDate = this.parseDate(dateStr);
          confidence = 0.9;
        }
      }

      if (!expiryDate) {
        throw new Error('No date found in document');
      }

      return {
        expiryDate,
        confidence,
        source: 'textract',
      };
    } catch (err) {
      console.error('[AIService] Textract error:', err);
      throw err;
    }
  }

  private classifyFoodMock(): ClassificationResult {
    const food = MOCK_FOODS[Math.floor(Math.random() * MOCK_FOODS.length)];
    return {
      foodName: food.foodName,
      category: food.category,
      fridgeDays: food.fridgeDays,
      confidence: 0.85 + Math.random() * 0.14,
      source: 'mock',
    };
  }

  private ocrExpiryDateMock(): OCRResult {
    const daysFromNow = Math.floor(Math.random() * 180) + 1;
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + daysFromNow);
    return {
      expiryDate: expiryDate.toISOString().split('T')[0],
      confidence: 0.8 + Math.random() * 0.19,
      source: 'mock',
    };
  }

  private parseDate(dateStr: string): string {
    try {
      // Handle MM/DD/YY or MM/DD/YYYY
      if (dateStr.includes('/')) {
        const parts = dateStr.split('/');
        if (parts.length === 3) {
          let month = parts[0];
          let day = parts[1];
          let year = parts[2];

          // Pad month and day
          month = month.padStart(2, '0');
          day = day.padStart(2, '0');

          // Handle 2-digit vs 4-digit year
          if (year.length === 2) {
            year = `20${year}`;
          }

          // Check if it's DD/MM instead of MM/DD
          const monthNum = parseInt(month);
          const dayNum = parseInt(day);
          if (monthNum > 12 && dayNum <= 12) {
            // Swap them
            [month, day] = [day, month];
          }

          return `${year}-${month}-${day}`;
        }
      }

      // Handle YYYY-MM-DD
      if (dateStr.includes('-')) {
        return dateStr;
      }

      throw new Error('Unknown date format');
    } catch (err) {
      console.warn('[AIService] Date parsing failed:', err);
      // Return a default expiry 7 days from now
      const defaultDate = new Date();
      defaultDate.setDate(defaultDate.getDate() + 7);
      return defaultDate.toISOString().split('T')[0];
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
