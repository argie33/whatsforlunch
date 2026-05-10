/**
 * Lambda Layer: AI Quota Check
 *
 * Shared layer used by all AI Lambdas to:
 * 1. Check if user has exceeded daily quota
 * 2. Deduct usage after successful operation
 * 3. Reset quota at midnight UTC
 *
 * Export: aiQuotaLayer = { checkQuota, deductQuota, resetQuota }
 */

const { DynamoDBClient, UpdateItemCommand, GetItemCommand } = require('@aws-sdk/client-dynamodb');
const dynamodb = new DynamoDBClient({});

const DAILY_QUOTA = {
  free: 50, // Free tier: 50 AI ops/day
  premium: 500, // Premium: 500 AI ops/day
  family: 2000, // Family: 2000 AI ops/day
};

/**
 * Check if user has quota available
 * @param {string} userId - User ID
 * @param {string} tier - Subscription tier
 * @returns {Promise<{available: boolean, remaining: number, resetAt: number}>}
 */
async function checkQuota(userId, tier = 'free') {
  const profilesTable = process.env.PROFILES_TABLE || 'wfl-profiles';

  try {
    const result = await dynamodb.send(
      new GetItemCommand({
        TableName: profilesTable,
        Key: {
          PK: { S: `USER#${userId}` },
          SK: { S: 'PROFILE' },
        },
        ProjectionExpression: 'aiQuotaUsedToday, aiQuotaResetAt, subscriptionTier',
      })
    );

    if (!result.Item) {
      throw new Error('User profile not found');
    }

    const usedToday = parseInt(result.Item.aiQuotaUsedToday?.N || '0');
    const resetAt = parseInt(result.Item.aiQuotaResetAt?.N || String(Date.now()));
    const userTier = result.Item.subscriptionTier?.S || tier;

    const quota = DAILY_QUOTA[userTier] || DAILY_QUOTA.free;
    const remaining = Math.max(0, quota - usedToday);

    return {
      available: remaining > 0,
      remaining,
      resetAt,
      quota,
      usedToday,
    };
  } catch (error) {
    console.error('Error checking quota:', error);
    throw error;
  }
}

/**
 * Deduct quota usage after successful operation
 * @param {string} userId - User ID
 * @param {number} amount - Amount to deduct (default 1)
 * @returns {Promise<void>}
 */
async function deductQuota(userId, amount = 1) {
  const profilesTable = process.env.PROFILES_TABLE || 'wfl-profiles';
  const now = new Date();
  const today = new Date(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const tomorrow = new Date(today);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

  try {
    await dynamodb.send(
      new UpdateItemCommand({
        TableName: profilesTable,
        Key: {
          PK: { S: `USER#${userId}` },
          SK: { S: 'PROFILE' },
        },
        UpdateExpression:
          'SET aiQuotaUsedToday = if_not_exists(aiQuotaUsedToday, :zero) + :amount, aiQuotaResetAt = :resetAt',
        ExpressionAttributeValues: {
          ':zero': { N: '0' },
          ':amount': { N: String(amount) },
          ':resetAt': { N: String(tomorrow.getTime()) },
        },
      })
    );
  } catch (error) {
    console.error('Error deducting quota:', error);
    throw error;
  }
}

/**
 * Reset quota at midnight UTC (called by EventBridge rule)
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 */
async function resetQuota(userId) {
  const profilesTable = process.env.PROFILES_TABLE || 'wfl-profiles';
  const tomorrow = new Date();
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

  try {
    await dynamodb.send(
      new UpdateItemCommand({
        TableName: profilesTable,
        Key: {
          PK: { S: `USER#${userId}` },
          SK: { S: 'PROFILE' },
        },
        UpdateExpression: 'SET aiQuotaUsedToday = :zero, aiQuotaResetAt = :resetAt',
        ExpressionAttributeValues: {
          ':zero': { N: '0' },
          ':resetAt': { N: String(tomorrow.getTime()) },
        },
      })
    );
  } catch (error) {
    console.error('Error resetting quota:', error);
    throw error;
  }
}

/**
 * Middleware for Lambda handlers
 * Usage: const { checkQuota, deductQuota } = require('/opt/nodejs/ai-quota-check');
 */
module.exports = {
  checkQuota,
  deductQuota,
  resetQuota,
  DAILY_QUOTA,
};
