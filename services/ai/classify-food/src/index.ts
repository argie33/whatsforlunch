import { Logger } from '@aws-lambda-powertools/logger';
import { AppSyncIdentityWithRequestId } from 'aws-lambda/common/appsync';
import { BedrockClient } from '@wfl/services-shared/bedrock';
import { z } from 'zod';

const logger = new Logger({ serviceName: 'classify-food' });

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

const ClassifyFoodResponseSchema = z.object({
  foodType: z.string(),
  foodName: z.string(),
  daysSafe: z.number().int().min(0).max(365),
  confidence: z.number().min(0).max(1),
  reasoning: z.string().max(200),
  alternatives: z
    .array(
      z.object({
        foodType: z.string(),
        confidence: z.number(),
      }),
    )
    .max(3),
  visualWarning: z.enum(['none', 'possible_mold', 'discoloration', 'freezer_burn']),
  cacheHit: z.boolean().optional(),
});

type ClassifyFoodResponse = z.infer<typeof ClassifyFoodResponseSchema>;

interface LambdaEvent {
  arguments: ClassifyFoodInput;
  identity: AppSyncIdentityWithRequestId;
}

interface LambdaResponse {
  classification: ClassifyFoodResponse;
  latencyMs: number;
  costUsd: number;
}

export const handler = async (event: LambdaEvent): Promise<LambdaResponse> => {
  const startTime = Date.now();
  logger.info('classify-food invoked', { event });

  try {
    const input = ClassifyFoodInputSchema.parse(event.arguments);
    logger.info('Input validated', { input });

    // TODO: Phase B implementation
    // 1. Authorize: check household membership
    // 2. Check AI quota
    // 3. Load food_rules from cache or DynamoDB
    // 4. Download photo from S3
    // 5. Build prompt with cached system + per-request user
    // 6. Call Bedrock InvokeModel
    // 7. Parse tool use response
    // 8. Validate with Zod
    // 9. Write ai_classifications record
    // 10. Return response

    const bedrockClient = new BedrockClient();
    logger.info('Bedrock client initialized');

    // Stub response for Phase A
    const stubResponse: ClassifyFoodResponse = {
      foodType: 'unknown',
      foodName: 'Unknown food',
      daysSafe: 7,
      confidence: 0,
      reasoning: 'Classification not yet implemented (Phase B)',
      alternatives: [],
      visualWarning: 'none',
    };

    const latencyMs = Date.now() - startTime;

    return {
      classification: stubResponse,
      latencyMs,
      costUsd: 0,
    };
  } catch (error) {
    logger.error('classify-food failed', { error });
    throw error;
  }
};
