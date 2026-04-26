import { Logger } from '@aws-lambda-powertools/logger';
import { AppSyncIdentityWithRequestId } from 'aws-lambda/common/appsync';
import { TextractClient } from '@wfl/services-shared/textract';
import { z } from 'zod';

const logger = new Logger({ serviceName: 'ocr-expiry-date' });

const OcrExpiryDateInputSchema = z.object({
  photoPath: z.string(),
  userId: z.string(),
  householdId: z.string(),
  itemId: z.string(),
});

type OcrExpiryDateInput = z.infer<typeof OcrExpiryDateInputSchema>;

const DetectedDateSchema = z.object({
  rawText: z.string(),
  parsedAt: z.string().datetime(),
  confidence: z.number().min(0).max(1),
  boundingBox: z.object({
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number(),
  }),
});

const OcrExpiryDateResponseSchema = z.object({
  detectedDates: z.array(DetectedDateSchema),
  bestGuess: z.string().datetime().optional(),
  confidence: z.number().min(0).max(1),
});

type OcrExpiryDateResponse = z.infer<typeof OcrExpiryDateResponseSchema>;

interface LambdaEvent {
  arguments: OcrExpiryDateInput;
  identity: AppSyncIdentityWithRequestId;
}

interface LambdaResponse {
  expiryDate: OcrExpiryDateResponse;
  latencyMs: number;
  costUsd: number;
}

export const handler = async (event: LambdaEvent): Promise<LambdaResponse> => {
  const startTime = Date.now();
  logger.info('ocr-expiry-date invoked', { event });

  try {
    const input = OcrExpiryDateInputSchema.parse(event.arguments);
    logger.info('Input validated', { input });

    // TODO: Phase B implementation
    // 1. Authorize: check household membership
    // 2. Check AI quota
    // 3. Download photo from S3
    // 4. Call Textract DetectDocumentText
    // 5. Parse detected text for date patterns
    // 6. Score candidates by confidence, proximity to keywords, position
    // 7. If low confidence: fall back to Bedrock Haiku
    // 8. Return best guess + alternatives
    // 9. Write ai_classifications record

    const textractClient = new TextractClient();
    logger.info('Textract client initialized');

    // Stub response for Phase A
    const stubResponse: OcrExpiryDateResponse = {
      detectedDates: [],
      confidence: 0,
    };

    const latencyMs = Date.now() - startTime;

    return {
      expiryDate: stubResponse,
      latencyMs,
      costUsd: 0,
    };
  } catch (error) {
    logger.error('ocr-expiry-date failed', { error });
    throw error;
  }
};
