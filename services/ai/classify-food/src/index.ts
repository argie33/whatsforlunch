import { Logger } from '@aws-lambda-powertools/logger';
import { AppSyncIdentityWithRequestId } from 'aws-lambda/common/appsync';
import { Anthropic } from '@anthropic-ai/sdk';
import { BedrockClient } from '@wfl/services-shared/bedrock';
import { BedrockMockClient } from '@wfl/services-shared/bedrock-mock';
import { ClassifyFoodResponseSchema } from '@wfl/shared/schemas/ai';
import { consumeQuota } from '@wfl/services-shared/ai-quota';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { z } from 'zod';
import { v4 as uuid } from 'uuid';
import { buildSystemPrompt, buildUserPrompt, ACTIVE_PROMPT_VERSION } from './prompts';

const logger = new Logger({ serviceName: 'classify-food' });
const isLocalDev = process.env.NODE_ENV === 'development' || !process.env.AWS_REGION;
const ddb = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const s3 = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
const TABLE_NAME = process.env.DYNAMODB_TABLE || 'wfl-main-dev';
const S3_BUCKET = process.env.CLASSIFICATION_LOGS_BUCKET || 'wfl-classification-logs-dev';

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
      required: [
        'food_type',
        'food_name',
        'days_safe',
        'confidence',
        'reasoning',
        'alternatives',
        'visual_warning',
      ],
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
    const systemPrompt = buildSystemPrompt(foodRulesJson, ACTIVE_PROMPT_VERSION);
    const userPrompt = buildUserPrompt(
      new Date().toISOString(),
      input.storageLocation,
      input.userTimeZone,
      input.userHint,
    );

    logger.info('Prompts built', {
      systemPromptLength: systemPrompt.length,
      userPromptLength: userPrompt.length,
    });

    // Create Bedrock client (mock in dev, real in prod)
    const bedrockClient = isLocalDev ? new BedrockMockClient() : new BedrockClient();

    let bedrockResponse: any;
    let usedFallback = false;

    try {
      // Invoke Bedrock with tool forcing
      bedrockResponse = await bedrockClient.invoke({
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
        usedFallback: false,
      });
    } catch (bedrockError) {
      logger.warn('Bedrock invoke failed, falling back to Claude API', {
        error: bedrockError instanceof Error ? bedrockError.message : String(bedrockError),
      });

      // Fallback: Use Claude API via Anthropic SDK
      usedFallback = true;
      const client = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });

      const claudeResponse = await client.messages.create({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 500,
        system: systemPrompt,
        tools: [
          {
            name: 'classify_food',
            description: 'Return classification of the food in the photo.',
            input_schema: {
              type: 'object' as const,
              properties: {
                food_type: { type: 'string' },
                food_name: { type: 'string' },
                days_safe: { type: 'integer' },
                confidence: { type: 'number' },
                reasoning: { type: 'string' },
                alternatives: {
                  type: 'array',
                  items: { type: 'object' },
                },
                visual_warning: {
                  type: 'string',
                  enum: ['none', 'possible_mold', 'discoloration', 'freezer_burn'],
                },
              },
              required: [
                'food_type',
                'food_name',
                'days_safe',
                'confidence',
                'reasoning',
                'alternatives',
                'visual_warning',
              ],
            },
          },
        ],
        messages: [
          {
            role: 'user',
            content: userPrompt,
          },
        ],
      });

      // Convert Claude response to Bedrock-compatible format
      const toolUseBlock = claudeResponse.content.find((block) => block.type === 'tool_use');
      if (!toolUseBlock || toolUseBlock.type !== 'tool_use') {
        throw new Error('No tool use response from Claude fallback');
      }

      bedrockResponse = {
        content: [{ type: 'tool_use', input: toolUseBlock.input }],
        usage: {
          inputTokens: claudeResponse.usage.input_tokens,
          outputTokens: claudeResponse.usage.output_tokens,
          cacheReadInputTokens: 0,
        },
      };

      logger.info('Claude fallback succeeded', {
        contentCount: bedrockResponse.content.length,
        inputTokens: bedrockResponse.usage.inputTokens,
        outputTokens: bedrockResponse.usage.outputTokens,
        usedFallback: true,
      });
    }

    // Parse tool use response
    const toolUseBlock = bedrockResponse.content.find((block) => block.type === 'tool_use');
    if (!toolUseBlock || !toolUseBlock.input) {
      throw new Error('No tool use response from Bedrock or Claude');
    }

    const rawResponse = toolUseBlock.input as Record<string, unknown>;

    // Map API response to output schema (snake_case → camelCase)
    const classification = ClassifyFoodResponseSchema.parse({
      foodType: rawResponse.food_type,
      foodName: rawResponse.food_name,
      daysSafe: rawResponse.days_safe,
      confidence: rawResponse.confidence,
      reasoning: rawResponse.reasoning,
      alternatives:
        (
          rawResponse.alternatives as Array<{ food_type: string; confidence: number }> | undefined
        )?.map((alt) => ({
          foodType: alt.food_type,
          confidence: alt.confidence,
        })) || [],
      visualWarning: rawResponse.visual_warning,
    });

    // Calculate cost
    const cacheHit =
      !usedFallback &&
      bedrockResponse.usage.cacheReadInputTokens !== undefined &&
      bedrockResponse.usage.cacheReadInputTokens > 0;
    let costUsd = 0;

    if (usedFallback) {
      // Claude Haiku pricing: $0.80/$20 per 1M input/output tokens
      const inputCost = (bedrockResponse.usage.inputTokens / 1_000_000) * 0.8;
      const outputCost = (bedrockResponse.usage.outputTokens / 1_000_000) * 4.0;
      costUsd = inputCost + outputCost;
    } else if (cacheHit) {
      // Bedrock cached: $0.00008 per cache-read token, $0.004 per output token
      const cacheReadCost = (bedrockResponse.usage.cacheReadInputTokens! / 1_000_000) * 0.08;
      const outputCost = (bedrockResponse.usage.outputTokens / 1_000_000) * 4.0;
      costUsd = cacheReadCost + outputCost;
    } else {
      // Bedrock non-cached: $0.0008 per input, $0.004 per output
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

    // Persist classification record for audit trail and model improvement
    if (!isLocalDev) {
      const classificationId = uuid();
      const now = new Date().toISOString();

      const classificationRecord = {
        id: classificationId,
        userId: input.userId,
        householdId: input.householdId,
        itemId: input.itemId,
        photoPath: input.photoPath,
        classification: {
          foodType: classification.foodType,
          foodName: classification.foodName,
          daysSafe: classification.daysSafe,
          confidence: classification.confidence,
          reasoning: classification.reasoning,
          visualWarning: classification.visualWarning,
        },
        alternatives: classification.alternatives,
        promptVersion: ACTIVE_PROMPT_VERSION,
        model: usedFallback ? 'claude-fallback' : 'bedrock-haiku',
        usedFallback,
        latencyMs,
        costUsd,
        cacheHit: usedFallback ? false : cacheHit,
        createdAt: now,
      };

      // Persist to DynamoDB
      try {
        await ddb.send(
          new PutCommand({
            TableName: TABLE_NAME,
            Item: {
              ...classificationRecord,
              PK: `AICLASS#${input.householdId}`,
              SK: `${now}#${classificationId}`,
              ttl: Math.floor(Date.now() / 1000) + 90 * 24 * 60 * 60, // 90-day retention
            },
          }),
        );
        logger.info('Classification persisted to DynamoDB', { classificationId, usedFallback });
      } catch (err) {
        logger.warn('Failed to persist classification to DynamoDB', { error: err });
        // Don't fail the request if DDB write fails
      }

      // Export to S3 for ML pipeline
      try {
        const date = new Date(now);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const s3Key = `classifications/${input.householdId}/${year}/${month}/${day}/${classificationId}.json`;

        await s3.send(
          new PutObjectCommand({
            Bucket: S3_BUCKET,
            Key: s3Key,
            Body: JSON.stringify(classificationRecord),
            ContentType: 'application/json',
            Metadata: {
              'household-id': input.householdId,
              'user-id': input.userId,
              model: usedFallback ? 'claude-fallback' : 'bedrock-haiku',
            },
          }),
        );
        logger.info('Classification exported to S3', { classificationId, s3Key });
      } catch (err) {
        logger.warn('Failed to export classification to S3', { error: err });
        // Don't fail the request if S3 write fails
      }
    }

    return {
      classification,
      latencyMs,
      costUsd,
      promptVersion: ACTIVE_PROMPT_VERSION,
    };
  } catch (error) {
    logger.error('classify-food failed', { error });
    throw error;
  }
};
