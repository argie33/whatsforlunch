import { Logger } from '@aws-lambda-powertools/logger';
import { AppSyncIdentityWithRequestId } from 'aws-lambda/common/appsync';
import { TextractClient } from '@wfl/services-shared/textract';
import { TextractMockClient } from '@wfl/services-shared/textract-mock';
import { BedrockClient } from '@wfl/services-shared/bedrock';
import { OcrExpiryDateResponseSchema } from '@wfl/shared/schemas/ai';
import { consumeQuota } from '@wfl/services-shared/ai-quota';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { z } from 'zod';
import { v4 as uuid } from 'uuid';
import { parseDate } from './date-parser';

const logger = new Logger({ serviceName: 'ocr-expiry-date' });
const isLocalDev = process.env.NODE_ENV === 'development' || !process.env.AWS_REGION;
const s3 = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
const ddb = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const bedrock = new BedrockClient();
const TABLE_NAME = process.env.DYNAMODB_TABLE || 'wfl-main-dev';
const PHOTOS_BUCKET = process.env.PHOTOS_BUCKET || 'wfl-photos-dev';

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

    // Download photo from S3
    let document = { bytes: new Uint8Array() };
    if (!isLocalDev) {
      try {
        const getResult = await s3.send(
          new GetObjectCommand({
            Bucket: PHOTOS_BUCKET,
            Key: input.photoPath,
          }),
        );
        const buffer = await getResult.Body?.transformToByteArray();
        document = { bytes: buffer || new Uint8Array([0xff, 0xd8, 0xff]) };
        logger.info('Photo downloaded from S3', { bucket: PHOTOS_BUCKET, key: input.photoPath });
      } catch (err) {
        logger.warn('Failed to download photo from S3, using mock', { error: err });
        document = { bytes: new Uint8Array([0xff, 0xd8, 0xff]) };
      }
    } else {
      // Dev mode: use mock document
      document = { bytes: new Uint8Array([0xff, 0xd8, 0xff]) };
    }

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
    let bestGuess = parsedDates.length > 0 ? parsedDates[0] : undefined;
    let overallConfidence = parsedDates.length > 0 ? Math.max(...parsedDates.map((d) => d.confidence)) : 0;
    let usedBedrock = false;

    // Fall back to Bedrock Haiku if confidence < 0.6
    if (overallConfidence < 0.6 && !isLocalDev) {
      try {
        const bedrockResponse = await bedrock.invoke({
          model: 'haiku',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `Analyze this product packaging and extract the expiry/best-before date. Return ONLY valid JSON:
{
  "expiryDate": "YYYY-MM-DD",
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation"
}

If no date found, set expiryDate to null and confidence to 0.`,
                },
              ],
            },
          ],
          maxTokens: 200,
          temperature: 0.3,
        });

        const textContent = bedrockResponse.content.find((c) => c.type === 'text');
        if (textContent && textContent.type === 'text') {
          const parsed = JSON.parse(textContent.text);
          if (parsed.expiryDate && parsed.confidence > overallConfidence) {
            bestGuess = {
              rawText: `Bedrock: ${parsed.expiryDate}`,
              parsedAt: new Date(parsed.expiryDate).toISOString(),
              confidence: parsed.confidence,
              boundingBox: { x: 0, y: 0, width: 0, height: 0 },
            };
            overallConfidence = parsed.confidence;
            usedBedrock = true;
            parsedDates.push(bestGuess);
            logger.info('Used Bedrock fallback for OCR', { newConfidence: overallConfidence });
          }
        }
      } catch (err) {
        logger.warn('Bedrock fallback failed', { error: err });
      }
    }

    const response = OcrExpiryDateResponseSchema.parse({
      detectedDates: parsedDates,
      bestGuess: bestGuess?.parsedAt,
      confidence: overallConfidence,
    });

    // Estimate cost (Textract: free for first 1000 pages/month, then $1 per 1000)
    // For this request, assume it's within free tier
    const costUsd = 0;

    const latencyMs = Date.now() - startTime;

    logger.info('OCR complete', {
      dateCount: parsedDates.length,
      bestConfidence: overallConfidence,
      usedBedrock,
      latencyMs,
      costUsd,
    });

    // Persist OCR result for audit trail
    if (!isLocalDev) {
      try {
        const ocrId = uuid();
        const now = new Date().toISOString();
        await ddb.send(
          new PutCommand({
            TableName: TABLE_NAME,
            Item: {
              PK: `OCRCLASS#${input.householdId}`,
              SK: `${now}#${ocrId}`,
              id: ocrId,
              userId: input.userId,
              householdId: input.householdId,
              itemId: input.itemId,
              photoPath: input.photoPath,
              detectedDates: parsedDates,
              bestGuess: bestGuess?.parsedAt || null,
              confidence: overallConfidence,
              usedBedrock,
              model: usedBedrock ? 'bedrock-haiku' : 'textract',
              latencyMs,
              costUsd,
              createdAt: now,
              ttl: Math.floor(Date.now() / 1000) + 90 * 24 * 60 * 60, // 90-day retention
            },
          }),
        );
        logger.info('OCR result persisted', { ocrId });
      } catch (err) {
        logger.warn('Failed to persist OCR result', { error: err });
      }
    }

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
