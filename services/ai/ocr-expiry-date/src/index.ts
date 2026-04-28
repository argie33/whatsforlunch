import { Logger } from '@aws-lambda-powertools/logger';
import { AppSyncIdentityWithRequestId } from 'aws-lambda/common/appsync';
import { TextractClient } from '@wfl/services-shared/textract';
import { TextractMockClient } from '@wfl/services-shared/textract-mock';
import { OcrExpiryDateResponseSchema } from '@wfl/shared/schemas/ai';
import { consumeQuota } from '@wfl/services-shared/ai-quota';
import { z } from 'zod';
import { parseDate } from './date-parser';

const logger = new Logger({ serviceName: 'ocr-expiry-date' });
const isLocalDev = process.env.NODE_ENV === 'development' || !process.env.AWS_REGION;

const OcrExpiryDateInputSchema = z.object({
  photoPath: z.string(),
  userId: z.string(),
  householdId: z.string(),
  itemId: z.string(),
});

type OcrExpiryDateInput = z.infer<typeof OcrExpiryDateInputSchema>;

interface LambdaEvent {
  arguments: OcrExpiryDateInput;
  identity: AppSyncIdentityWithRequestId;
}

interface LambdaResponse {
  expiryDate: z.infer<typeof OcrExpiryDateResponseSchema>;
  latencyMs: number;
  costUsd: number;
}

export const handler = async (event: LambdaEvent): Promise<LambdaResponse> => {
  const startTime = Date.now();
  logger.info('ocr-expiry-date invoked', { event });

  try {
    const input = OcrExpiryDateInputSchema.parse(event.arguments);
    logger.info('Input validated', { input });

    // Enforce per-user AI quota
    if (!isLocalDev) {
      await consumeQuota(input.userId, 'ocr');
    }

    // Create Textract client (mock in dev, real in prod)
    const textractClient = isLocalDev ? new TextractMockClient() : new TextractClient();

    // Download photo from S3 (TODO: production implementation)
    // For now, create a mock document
    const document = {
      bytes: new Uint8Array([0xff, 0xd8, 0xff]), // JPEG header
    };

    // Call Textract
    const textractResponse = await textractClient.detectDocumentText(document);

    logger.info('Textract response received', { blockCount: textractResponse.blocks.length });

    // Parse dates from Textract blocks
    const parsedDates = textractResponse.blocks
      .map((block) => {
        const parsed = parseDate(block.text);
        return parsed
          ? {
              rawText: block.text,
              parsedAt: parsed.date.toISOString(),
              confidence: Math.max(parsed.confidence, block.confidence),
              boundingBox: block.boundingBox || { x: 0, y: 0, width: 0, height: 0 },
            }
          : null;
      })
      .filter((d) => d !== null);

    logger.info('Dates parsed', { count: parsedDates.length });

    // Find best guess (highest confidence)
    const bestGuess = parsedDates.length > 0 ? parsedDates[0] : undefined;
    const overallConfidence = parsedDates.length > 0 ? Math.max(...parsedDates.map((d) => d.confidence)) : 0;

    // TODO: Fall back to Bedrock Haiku if confidence < 0.6

    const response = OcrExpiryDateResponseSchema.parse({
      detectedDates: parsedDates,
      bestGuess: bestGuess?.parsedAt,
      confidence: overallConfidence,
    });

    // Estimate cost (Textract: free for first 1000 pages/month, then $1 per 1000)
    // For this request, assume it's within free tier
    const costUsd = 0;

    const latencyMs = Date.now() - startTime;

    logger.info('OCR complete', { dateCount: parsedDates.length, bestConfidence: overallConfidence, latencyMs, costUsd });

    // TODO: Write ai_classifications record to DynamoDB

    return {
      expiryDate: response,
      latencyMs,
      costUsd,
    };
  } catch (error) {
    logger.error('ocr-expiry-date failed', { error });
    throw error;
  }
};
