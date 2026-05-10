/**
 * Mock Bedrock client for local testing.
 * Returns realistic responses without calling AWS.
 */

import { BedrockInvokeOptions } from './bedrock.js';

export interface BedrockMockResponse {
  content: Array<{
    type: string;
    text?: string;
    id?: string;
    name?: string;
    input?: Record<string, unknown>;
  }>;
  usage: {
    inputTokens: number;
    outputTokens: number;
    cacheCreationInputTokens?: number;
    cacheReadInputTokens?: number;
  };
  stopReason: string;
}

export class BedrockMockClient {
  private cacheHits = 0;
  private callCount = 0;

  async invoke(options: BedrockInvokeOptions): Promise<BedrockMockResponse> {
    this.callCount++;

    // Simulate 95% cache hit rate on system prompts
    const isCacheHit = Math.random() < 0.95;
    const cacheReadTokens = isCacheHit ? 800 : 0;
    const cacheCreationTokens = this.callCount === 1 ? 800 : 0;

    if (isCacheHit) {
      this.cacheHits++;
    }

    // Estimate tokens based on content size
    let inputTokens = 200;
    for (const msg of options.messages) {
      inputTokens += 100;
      if (msg.content) {
        for (const block of msg.content) {
          if (block.type === 'text' && block.text) {
            inputTokens += Math.ceil(block.text.length / 4);
          }
        }
      }
    }

    const outputTokens = Math.random() * 200 + 100;

    // Simulate Bedrock tool_use response for classify_food
    if (
      options.tools &&
      options.tools.length > 0 &&
      options.tools.at(0)?.name === 'classify_food'
    ) {
      return this.mockClassifyFood(inputTokens, outputTokens, cacheReadTokens, cacheCreationTokens);
    }

    // Generic response
    return {
      content: [{ type: 'text', text: 'Mock response' }],
      usage: {
        inputTokens,
        outputTokens: Math.ceil(outputTokens),
        cacheReadInputTokens: cacheReadTokens,
        cacheCreationInputTokens: cacheCreationTokens,
      },
      stopReason: 'tool_use',
    };
  }

  private mockClassifyFood(
    inputTokens: number,
    outputTokens: number,
    cacheReadTokens: number,
    cacheCreationTokens: number,
  ): BedrockMockResponse {
    const foods = [
      { type: 'leftover_pasta', name: 'Pasta with marinara', days: 3, warning: 'none' },
      { type: 'leftover_rice', name: 'White rice', days: 4, warning: 'none' },
      { type: 'leftover_chicken', name: 'Roasted chicken', days: 2, warning: 'none' },
      { type: 'salad', name: 'Mixed green salad', days: 1, warning: 'discoloration' },
      { type: 'strawberry', name: 'Fresh strawberries', days: 5, warning: 'possible_mold' },
      { type: 'milk', name: 'Whole milk', days: 7, warning: 'none' },
      { type: 'yogurt', name: 'Greek yogurt', days: 14, warning: 'none' },
    ];

    const food = foods[Math.floor(Math.random() * foods.length)] ?? foods[0]!;

    return {
      content: [
        {
          type: 'tool_use',
          id: 'classify_food_' + Math.random().toString(36).substring(7),
          name: 'classify_food',
          input: {
            food_type: food.type,
            food_name: food.name,
            days_safe: food.days,
            confidence: 0.75 + Math.random() * 0.24, // 0.75-0.99
            reasoning: `Based on visual appearance and storage location.`,
            alternatives: [{ food_type: 'unknown', confidence: 0.1 }],
            visual_warning: food.warning,
          },
        },
      ],
      usage: {
        inputTokens,
        outputTokens: Math.ceil(outputTokens),
        cacheReadInputTokens: cacheReadTokens,
        cacheCreationInputTokens: cacheCreationTokens,
      },
      stopReason: 'tool_use',
    };
  }

  getStats() {
    return {
      totalCalls: this.callCount,
      cacheHits: this.cacheHits,
      hitRate:
        this.callCount > 0 ? ((this.cacheHits / this.callCount) * 100).toFixed(2) + '%' : 'N/A',
    };
  }
}
