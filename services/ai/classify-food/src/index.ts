import { Logger } from '@aws-lambda-powertools/logger';
import { AppSyncIdentityWithRequestId } from 'aws-lambda/common/appsync';
import { BedrockClient } from '@wfl/services-shared/bedrock';
import { BedrockMockClient } from '@wfl/services-shared/bedrock-mock';
import { ClassifyFoodResponseSchema } from '@wfl/shared/schemas/ai';
import { consumeQuota } from '@wfl/services-shared/ai-quota';
import { z } from 'zod';
import { buildSystemPrompt, buildUserPrompt, CLASSIFY_FOOD_PROMPT_VERSION } from './prompts';

const logger = new Logger({ serviceName: 'classify-food' });
const isLocalDev = process.env.NODE_ENV === 'development' || !process.env.AWS_REGION;

const ClassifyFoodInputSchema = z.object({
  photoPath: z.string(),
  userId: z.string(),
  householdId: z.string(),
  itemId: z.string(),
  storageLocation: z.enum(['fridge', 'freezer', 'pantry', 'counter', 'lunchbox']),
  userHint: z.string().optional(),
  userTimeZone: z.string(),
});

type ClassifyFoodInput = z.infer<typeof ClassifyFoodInputSchema>;

interface LambdaEvent {
  arguments: ClassifyFoodInput;
  identity: AppSyncIdentityWithRequestId;
}

interface LambdaResponse {
  classification: z.infer<typeof ClassifyFoodResponseSchema>;
  latencyMs: number;
  costUsd: number;
  promptVersion: number;
}

// Sample food rules (would come from DynamoDB in production)
const SAMPLE_FOOD_RULES = [
  {
    foodType: 'leftover_pasta',
    displayName: 'Leftover pasta',
    category: 'leftovers',
    defaultDaysSafe: 3,
    defaultDaysSafeByLocation: { fridge: 3, freezer: 30, pantry: 0, counter: 2 },
  },
  {
    foodType: 'leftover_rice',
    displayName: 'Leftover rice',
    category: 'leftovers',
    defaultDaysSafe: 4,
    defaultDaysSafeByLocation: { fridge: 4, freezer: 30, pantry: 0, counter: 2 },
  },
  {
    foodType: 'leftover_chicken',
    displayName: 'Leftover chicken',
    category: 'leftovers',
    defaultDaysSafe: 2,
    defaultDaysSafeByLocation: { fridge: 2, freezer: 30, pantry: 0, counter: 1 },
  },
  {
    foodType: 'strawberry',
    displayName: 'Fresh strawberries',
    category: 'produce',
    defaultDaysSafe: 5,
    defaultDaysSafeByLocation: { fridge: 5, freezer: 30, pantry: 0, counter: 1 },
  },
  {
    foodType: 'milk',
    displayName: 'Whole milk',
    category: 'dairy',
    defaultDaysSafe: 7,
    defaultDaysSafeByLocation: { fridge: 7, freezer: 30, pantry: 0, counter: 0 },
  },
];

function createToolDefinition() {
  return {
    name: 'classify_food',
    description: 'Return classification of the food in the photo.',
    input_schema: {
      type: 'object',
      properties: {
        food_type: {
          type: 'string',
          description: "Exact food_type key from rules, or 'unknown'.",
        },
        food_name: {
          type: 'string',
          description: 'Human-readable name shown to user.',
        },
        days_safe: {
          type: 'integer',
          description: 'Days until food becomes unsafe to eat.',
          minimum: 0,
          maximum: 365,
        },
        confidence: {
          type: 'number',
          description: 'Your confidence in this classification (0-1).',
          minimum: 0,
          maximum: 1,
        },
        reasoning: {
          type: 'string',
          description: '1-2 sentences explaining your classification.',
          maxLength: 200,
        },
        alternatives: {
          type: 'array',
          maxItems: 3,
          items: {
            type: 'object',
            properties: {
              food_type: { type: 'string' },
              confidence: { type: 'number' },
            },
          },
        },
        visual_warning: {
          type: 'string',
          enum: ['none', 'possible_mold', 'discoloration', 'freezer_burn'],
        },
      },
      required: ['food_type', 'food_name', 'days_safe', 'confidence', 'reasoning', 'alternatives', 'visual_warning'],
    },
  };
}

export const handler = async (event: LambdaEvent): Promise<LambdaResponse> => {
  const startTime = Date.now();
  logger.info('classify-food invoked', { event });

  try {
    const input = ClassifyFoodInputSchema.parse(event.arguments);
    logger.info('Input validated', { input });

    // Enforce per-user AI quota
    if (!isLocalDev) {
      await consumeQuota(input.userId, 'classify');
    }

    // Build prompt
    const foodRulesJson = JSON.stringify(SAMPLE_FOOD_RULES, null, 2);
    const systemPrompt = buildSystemPrompt(foodRulesJson);
    const userPrompt = buildUserPrompt(new Date().toISOString(), input.storageLocation, input.userTimeZone, input.userHint);

    logger.info('Prompts built', { systemPromptLength: systemPrompt.length, userPromptLength: userPrompt.length });

    // Create Bedrock client (mock in dev, real in prod)
    const bedrockClient = isLocalDev ? new BedrockMockClient() : new BedrockClient();

    // Invoke Bedrock with tool forcing
    const bedrockResponse = await bedrockClient.invoke({
      model: 'haiku',
      messages: [
        {
          role: 'user',
          content: [{ type: 'text', text: userPrompt }],
        },
      ],
      systemPrompt,
      systemPromptCacheControl: true,
      tools: [createToolDefinition()],
      toolChoice: { type: 'tool', name: 'classify_food' },
      maxTokens: 500,
      temperature: 0.3,
    });

    logger.info('Bedrock response received', {
      contentCount: bedrockResponse.content.length,
      inputTokens: bedrockResponse.usage.inputTokens,
      outputTokens: bedrockResponse.usage.outputTokens,
    });

    // Parse tool use response
    const toolUseBlock = bedrockResponse.content.find((block) => block.type === 'tool_use');
    if (!toolUseBlock || !toolUseBlock.input) {
      throw new Error('No tool use response from Bedrock');
    }

    const rawResponse = toolUseBlock.input as Record<string, unknown>;

    // Map API response to output schema (snake_case → camelCase)
    const classification = ClassifyFoodResponseSchema.parse({
      foodType: rawResponse.food_type,
      foodName: rawResponse.food_name,
      daysSafe: rawResponse.days_safe,
      confidence: rawResponse.confidence,
      reasoning: rawResponse.reasoning,
      alternatives: (rawResponse.alternatives as Array<{ food_type: string; confidence: number }> | undefined)?.map(
        (alt) => ({
          foodType: alt.food_type,
          confidence: alt.confidence,
        }),
      ) || [],
      visualWarning: rawResponse.visual_warning,
    });

    // Calculate cost (Haiku pricing)
    const cacheHit = bedrockResponse.usage.cacheReadInputTokens !== undefined && bedrockResponse.usage.cacheReadInputTokens > 0;
    let costUsd = 0;

    if (cacheHit) {
      // Cached: $0.00008 per cache-read token, $0.004 per output token
      const cacheReadCost = (bedrockResponse.usage.cacheReadInputTokens! / 1_000_000) * 0.08;
      const outputCost = (bedrockResponse.usage.outputTokens / 1_000_000) * 4.0;
      costUsd = cacheReadCost + outputCost;
    } else {
      // Non-cached: $0.0008 per input, $0.004 per output
      const inputCost = (bedrockResponse.usage.inputTokens / 1_000_000) * 0.8;
      const outputCost = (bedrockResponse.usage.outputTokens / 1_000_000) * 4.0;
      costUsd = inputCost + outputCost;
    }

    const latencyMs = Date.now() - startTime;

    logger.info('Classification complete', {
      foodType: classification.foodType,
      confidence: classification.confidence,
      latencyMs,
      costUsd,
      cacheHit,
    });

    // TODO: Write ai_classifications record to DynamoDB

    return {
      classification,
      latencyMs,
      costUsd,
      promptVersion: CLASSIFY_FOOD_PROMPT_VERSION,
    };
  } catch (error) {
    logger.error('classify-food failed', { error });
    throw error;
  }
};
