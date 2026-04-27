/**
 * Bedrock Client Wrapper
 * Handles Claude model invocations with prompt caching
 * Used by classify-food, suggest-recipes, suggest-restaurants, learn-preferences
 */

import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

interface BedrockMessage {
  role: 'user' | 'assistant';
  content: string | ContentBlock[];
}

interface ContentBlock {
  type: 'text' | 'tool_use' | 'tool_result';
  text?: string;
  id?: string;
  name?: string;
  input?: Record<string, any>;
  tool_use_id?: string;
}

interface InvokeOptions {
  model: string; // e.g., claude-3-5-haiku-20241022
  messages: BedrockMessage[];
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
  cacheControl?: boolean; // Enable prompt caching
  tools?: any[];
}

interface InvokeResponse {
  content: string;
  stopReason: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    cacheCreationTokens?: number;
    cacheReadTokens?: number;
  };
  cacheHit?: boolean;
}

export class BedrockClient {
  private client: BedrockRuntimeClient;
  private defaultModel: string = 'claude-3-5-haiku-20241022';

  constructor(region: string = 'us-east-1') {
    this.client = new BedrockRuntimeClient({ region });
  }

  /**
   * Invoke Claude model with Bedrock
   * Supports prompt caching for repeated prompts (cost optimization)
   */
  async invoke(options: InvokeOptions): Promise<InvokeResponse> {
    const model = options.model || this.defaultModel;
    const maxTokens = options.maxTokens || 1024;

    // Build system prompt array (supports caching)
    const system = options.systemPrompt
      ? [
          {
            type: 'text' as const,
            text: options.systemPrompt,
            ...(options.cacheControl && {
              cache_control: { type: 'ephemeral' as const },
            }),
          },
        ]
      : [];

    const payload = {
      anthropic_version: 'bedrock-2023-06-01',
      max_tokens: maxTokens,
      ...(options.temperature !== undefined && {
        temperature: options.temperature,
      }),
      ...(system.length > 0 && { system }),
      messages: options.messages.map((msg) => ({
        role: msg.role,
        content: typeof msg.content === 'string' ? msg.content : msg.content,
      })),
      ...(options.tools && { tools: options.tools }),
    };

    try {
      const command = new InvokeModelCommand({
        modelId: model,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify(payload),
      });

      const response = await this.client.send(command);
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));

      // Extract text from response
      let text = '';
      if (responseBody.content && Array.isArray(responseBody.content)) {
        text = responseBody.content
          .filter((block: any) => block.type === 'text')
          .map((block: any) => block.text)
          .join('\n');
      }

      return {
        content: text,
        stopReason: responseBody.stop_reason || 'end_turn',
        usage: {
          inputTokens: responseBody.usage?.input_tokens || 0,
          outputTokens: responseBody.usage?.output_tokens || 0,
          cacheCreationTokens: responseBody.usage?.cache_creation_input_tokens,
          cacheReadTokens: responseBody.usage?.cache_read_input_tokens,
        },
        cacheHit: (responseBody.usage?.cache_read_input_tokens || 0) > 0,
      };
    } catch (error) {
      console.error('Bedrock invocation error:', error);
      throw new Error(`Failed to invoke Bedrock model: ${error}`);
    }
  }

  /**
   * Classify food from image description
   * Used by classify-food Lambda
   */
  async classifyFood(imageDescription: string): Promise<{
    foodType: string;
    foodName: string;
    category: string;
    confidence: number;
    suggestedExpiryDays: Record<string, number>;
  }> {
    const systemPrompt = `You are a food identification expert. Analyze food images and provide structured classification.

Return a JSON object with:
{
  "foodType": "identifier like 'cooked_chicken'",
  "foodName": "display name like 'Cooked Chicken Breast'",
  "category": "protein|grain|dairy|produce|leftover|sauce|baked|prepared|beverage",
  "confidence": 0.0-1.0,
  "suggestedExpiryDays": {
    "fridge": 3,
    "freezer": 30,
    "pantry": null
  }
}`;

    const response = await this.invoke({
      model: this.defaultModel,
      systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Classify this food: ${imageDescription}. Respond with only JSON.`,
        },
      ],
      maxTokens: 512,
      cacheControl: true, // Cache this system prompt
    });

    try {
      return JSON.parse(response.content);
    } catch (error) {
      console.error('Failed to parse classification response:', response.content);
      throw new Error('Invalid classification response format');
    }
  }

  /**
   * Learn user preferences from their food history
   * Used by learn-preferences Lambda
   */
  async learnPreferences(foodHistory: string): Promise<{
    likelyPreferences: string[];
    likelyAllergies: string[];
    preferredCategories: string[];
    confidence: number;
  }> {
    const response = await this.invoke({
      model: this.defaultModel,
      systemPrompt:
        'Analyze food history and infer user preferences. Return JSON with likelyPreferences, likelyAllergies, preferredCategories, and confidence (0-1).',
      messages: [
        {
          role: 'user',
          content: `Food history: ${foodHistory}\n\nInfer preferences. Respond with JSON only.`,
        },
      ],
      maxTokens: 512,
    });

    return JSON.parse(response.content);
  }
}

export default BedrockClient;
