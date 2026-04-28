/**
 * AI quota enforcement shared by classify-food and ocr-expiry-date Lambdas.
 *
 * Daily quota is stored on the user's PROFILE record:
 *   aiQuotaUsedToday  — counter that resets at aiQuotaResetAt
 *   aiQuotaResetAt    — ISO timestamp of next reset (midnight UTC)
 *
 * Limits (free tier):
 *   - 20 AI classifications per day
 *   - 10 OCR calls per day
 * Premium: 200 / 50 per day
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const TABLE = process.env.MAIN_TABLE ?? 'wfl-main-dev';

const ddbClient = new DynamoDBClient({ region: process.env.AWS_REGION ?? 'us-east-1' });
const ddb = DynamoDBDocumentClient.from(ddbClient);

const DAILY_LIMIT: Record<string, number> = {
  free_classify: 20,
  free_ocr: 10,
  premium_classify: 200,
  premium_ocr: 50,
  family_classify: 200,
  family_ocr: 50,
};

function nextMidnightUTC(): string {
  const d = new Date();
  d.setUTCHours(24, 0, 0, 0);
  return d.toISOString();
}

export type QuotaOperation = 'classify' | 'ocr';

export interface QuotaCheckResult {
  allowed: boolean;
  used: number;
  limit: number;
  resetAt: string;
}

/**
 * Check quota WITHOUT consuming it. Returns current state.
 */
export async function checkQuota(
  userId: string,
  operation: QuotaOperation,
): Promise<QuotaCheckResult> {
  const item = await ddb.send(
    new GetCommand({ TableName: TABLE, Key: { PK: `USER#${userId}`, SK: 'PROFILE' } }),
  );
  const profile = item.Item;
  if (!profile) throw new Error(`Profile not found for user ${userId}`);

  const tier = (profile.subscriptionTier as string) ?? 'free';
  const limit = DAILY_LIMIT[`${tier}_${operation}`] ?? DAILY_LIMIT[`free_${operation}`] ?? 20;

  const resetAt = (profile.aiQuotaResetAt as string) ?? nextMidnightUTC();
  const now = new Date().toISOString();

  // If reset time has passed, treat quota as 0 used
  const used = now > resetAt ? 0 : ((profile.aiQuotaUsedToday as number) ?? 0);

  return { allowed: used < limit, used, limit, resetAt };
}

/**
 * Atomically increment quota and return updated state.
 * Throws if quota is exceeded.
 */
export async function consumeQuota(
  userId: string,
  operation: QuotaOperation,
): Promise<QuotaCheckResult> {
  const current = await checkQuota(userId, operation);
  if (!current.allowed) {
    throw new Error(
      `AI quota exceeded: ${current.used}/${current.limit} ${operation} calls today. Resets at ${current.resetAt}.`,
    );
  }

  const now = new Date().toISOString();
  const resetAt = current.resetAt > now ? current.resetAt : nextMidnightUTC();

  // Conditionally increment or reset + increment
  await ddb.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { PK: `USER#${userId}`, SK: 'PROFILE' },
      UpdateExpression:
        'SET aiQuotaUsedToday = if_not_exists(aiQuotaUsedToday, :zero) + :inc, aiQuotaResetAt = :reset, updatedAt = :now',
      ConditionExpression: 'aiQuotaUsedToday < :limit OR attribute_not_exists(aiQuotaUsedToday)',
      ExpressionAttributeValues: {
        ':zero': 0,
        ':inc': 1,
        ':limit': current.limit,
        ':reset': resetAt,
        ':now': now,
      },
    }),
  );

  return { ...current, used: current.used + 1 };
}
