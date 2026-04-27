/**
 * Lambda: ocrExpiryDate
 * Extracts expiry date from a photo of food packaging using OCR
 * Falls back to Bedrock vision if Textract doesn't find dates
 * Returns parsed ISO 8601 date
 */

import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { DynamoDBClient, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import TextractClientWrapper from '../shared/textractClient';
import BedrockClient from '../shared/bedrockClient';

const s3 = new S3Client({});
const dynamodb = new DynamoDBClient({});
const textract = new TextractClientWrapper(process.env.AWS_REGION);
const bedrock = new BedrockClient(process.env.AWS_REGION);

interface OcrExpiryDateEvent {
  householdId: string;
  itemId: string;
  photoUrl: string; // S3 URL
}

interface OcrExpiryDateResponse {
  itemId: string;
  householdId: string;
  detectedDate: string | null; // ISO 8601
  confidence: number;
  method: 'textract' | 'bedrock';
  rawText: string;
  cost: number;
}

export async function handler(event: OcrExpiryDateEvent): Promise<OcrExpiryDateResponse> {
  const startTime = Date.now();

  try {
    // Parse S3 URL to get bucket and key
    const urlPattern = /s3:\/\/([^/]+)\/(.+)/;
    const match = event.photoUrl.match(urlPattern);

    if (!match) {
      throw new Error('Invalid S3 URL format');
    }

    const [, bucket, key] = match;

    // Try Textract first (faster, cheaper)
    let result = await textract.extractDates(bucket, key);

    let method: 'textract' | 'bedrock' = 'textract';
    let confidence = result.confidence;
    let detectedDate = result.mostLikelyExpiry;

    // If Textract didn't find a date, fall back to Bedrock vision
    if (!detectedDate) {
      console.log('Textract did not find dates, falling back to Bedrock');
      const bedrockResult = await bedrock.invoke({
        model: 'claude-3-5-haiku-20241022',
        systemPrompt:
          'Extract expiry/best-by date from food packaging image. Return JSON with { "date": "YYYY-MM-DD", "confidence": 0-1, "rawText": "..." }',
        messages: [
          {
            role: 'user',
            content: `Extract expiry date from image: ${event.photoUrl}`,
          },
        ],
        maxTokens: 256,
      });

      try {
        const parsed = JSON.parse(bedrockResult.content);
        detectedDate = parsed.date;
        confidence = parsed.confidence;
        method = 'bedrock';
      } catch (e) {
        console.warn('Failed to parse Bedrock response:', bedrockResult.content);
      }
    }

    const latencyMs = Date.now() - startTime;
    let cost = 0;

    if (method === 'textract') {
      // Textract pricing: $0.015 per page
      cost = 0.015;
    } else {
      // Bedrock cost (same as classify-food)
      cost = 0.001; // Approximate
    }

    // Store OCR job record
    const now = new Date().toISOString();
    const jobId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    await dynamodb.send(
      new UpdateItemCommand({
        TableName: process.env.MAIN_TABLE || '',
        Key: {
          PK: { S: `HOUSEHOLD#${event.householdId}` },
          SK: { S: `OCR#${jobId}` },
        },
        UpdateExpression: `
          SET entityType = :et, kind = :kind,
              #status = :status, result = :result,
              confidence = :conf, usedFallback = :fallback,
              costUsd = :cost, createdAt = :now
        `,
        ExpressionAttributeNames: {
          '#status': 'status',
        },
        ExpressionAttributeValues: {
          ':et': { S: 'OcrJob' },
          ':kind': { S: 'expiry_date' },
          ':status': { S: 'complete' },
          ':result': {
            M: {
              detectedDate: { S: detectedDate || 'unknown' },
              method: { S: method },
              rawText: { S: result.dates?.join(', ') || '' },
            },
          },
          ':conf': { N: String(confidence) },
          ':fallback': { BOOL: method === 'bedrock' },
          ':cost': { N: String(cost) },
          ':now': { S: now },
        },
      })
    );

    // Update the Item if date was found
    if (detectedDate) {
      const expiryDate = new Date(detectedDate);
      await dynamodb.send(
        new UpdateItemCommand({
          TableName: process.env.MAIN_TABLE || '',
          Key: {
            PK: { S: `HOUSEHOLD#${event.householdId}` },
            SK: { S: `ITEM#${event.itemId}` },
          },
          UpdateExpression: `
            SET expiryAt = :expiryAt, expirySource = :source,
                expiryConfidence = :conf, ocrJobId = :jobId,
                updatedAt = :now, _version = _version + :inc, _lastChangedAt = :lastChangedAt
          `,
          ExpressionAttributeValues: {
            ':expiryAt': { S: expiryDate.toISOString() },
            ':source': { S: 'ocr' },
            ':conf': { N: String(confidence) },
            ':jobId': { S: jobId },
            ':now': { S: now },
            ':inc': { N: '1' },
            ':lastChangedAt': { N: Date.now().toString() },
          },
        })
      );
    }

    return {
      itemId: event.itemId,
      householdId: event.householdId,
      detectedDate,
      confidence,
      method,
      rawText: result.dates?.join(', ') || '',
      cost,
    };
  } catch (error) {
    console.error('ocrExpiryDate error:', error);
    throw new Error(`Failed to extract expiry date: ${error}`);
  }
}
