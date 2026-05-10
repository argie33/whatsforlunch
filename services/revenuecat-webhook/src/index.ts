/**
 * Lambda: revenuecat-webhook
 * HTTPS endpoint called by RevenueCat for subscription lifecycle events.
 * Updates the user's subscriptionTier in DynamoDB.
 *
 * Environment variables:
 *   MAIN_TABLE            — DynamoDB table name
 *   REVENUECAT_WEBHOOK_SECRET — Authorization header value set in RevenueCat dashboard
 *   AWS_REGION            — AWS region
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { Logger } from '@aws-lambda-powertools/logger';
import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';

const logger = new Logger({ serviceName: 'revenuecat-webhook' });

const ddbClient = new DynamoDBClient({ region: process.env.AWS_REGION ?? 'us-east-1' });
const ddb = DynamoDBDocumentClient.from(ddbClient);

const TABLE = process.env.MAIN_TABLE ?? 'wfl-main-dev';
const WEBHOOK_SECRET = process.env.REVENUECAT_WEBHOOK_SECRET ?? '';

type SubscriptionTier = 'free' | 'premium' | 'family';

// RevenueCat event types that indicate an active subscription
const ACTIVE_EVENTS = new Set([
  'INITIAL_PURCHASE',
  'RENEWAL',
  'PRODUCT_CHANGE',
  'UNCANCELLATION',
]);

// Events that revert to free
const FREE_EVENTS = new Set([
  'CANCELLATION',
  'EXPIRATION',
  'BILLING_ISSUE',
  'SUBSCRIBER_ALIAS',
]);

interface RevenueCatEvent {
  type: string;
  app_user_id: string;
  product_id?: string;
  entitlement_ids?: string[];
  currency?: string;
  price?: number;
  store?: string;
  transaction_id?: string;
  event_timestamp_ms?: number;
}

interface RevenueCatPayload {
  event: RevenueCatEvent;
  api_version?: string;
}

function tierFromEntitlements(entitlementIds: string[]): SubscriptionTier {
  if (entitlementIds.includes('family')) return 'family';
  if (entitlementIds.includes('premium')) return 'premium';
  return 'premium'; // default active subscription to premium
}

async function findUserByRevenueCatId(appUserId: string): Promise<string | null> {
  // appUserId is the Cognito sub (userId) set during RevenueCat login
  // Try direct lookup first
  const result = await ddb.send(new QueryCommand({
    TableName: TABLE,
    KeyConditionExpression: 'PK = :pk AND SK = :sk',
    ExpressionAttributeValues: {
      ':pk': `USER#${appUserId}`,
      ':sk': 'PROFILE',
    },
    ProjectionExpression: 'id',
    Limit: 1,
  }));

  if (result.Items?.length) {
    return result.Items[0]!['id'] as string;
  }

  return null;
}

async function updateSubscriptionTier(userId: string, tier: SubscriptionTier, eventType: string): Promise<void> {
  const now = new Date().toISOString();
  await ddb.send(new UpdateCommand({
    TableName: TABLE,
    Key: { PK: `USER#${userId}`, SK: 'PROFILE' },
    UpdateExpression: 'SET subscriptionTier = :tier, subscriptionUpdatedAt = :now, lastBillingEvent = :event, updatedAt = :now',
    ExpressionAttributeValues: {
      ':tier': tier,
      ':now': now,
      ':event': eventType,
    },
    ConditionExpression: 'attribute_exists(PK)',
  }));
}

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  // Validate webhook secret
  const authHeader = event.headers['authorization'] ?? event.headers['Authorization'] ?? '';
  if (WEBHOOK_SECRET && authHeader !== WEBHOOK_SECRET) {
    logger.warn('revenuecat-webhook: unauthorized request');
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  if (!event.body) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Empty body' }) };
  }

  let payload: RevenueCatPayload;
  try {
    payload = JSON.parse(event.body) as RevenueCatPayload;
  } catch {
    logger.warn('revenuecat-webhook: invalid JSON');
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const rcEvent = payload.event;
  logger.info('revenuecat-webhook: received event', {
    type: rcEvent.type,
    appUserId: rcEvent.app_user_id,
  });

  const userId = await findUserByRevenueCatId(rcEvent.app_user_id);
  if (!userId) {
    // User not found — may have deleted account; acknowledge and move on
    logger.warn('revenuecat-webhook: user not found', { appUserId: rcEvent.app_user_id });
    return { statusCode: 200, body: JSON.stringify({ ok: true, skipped: true }) };
  }

  let tier: SubscriptionTier;
  if (ACTIVE_EVENTS.has(rcEvent.type)) {
    tier = tierFromEntitlements(rcEvent.entitlement_ids ?? []);
    await updateSubscriptionTier(userId, tier, rcEvent.type);
    logger.info('revenuecat-webhook: upgraded', { userId, tier });
  } else if (FREE_EVENTS.has(rcEvent.type)) {
    tier = 'free';
    await updateSubscriptionTier(userId, tier, rcEvent.type);
    logger.info('revenuecat-webhook: reverted to free', { userId });
  } else {
    logger.info('revenuecat-webhook: no-op event type', { type: rcEvent.type });
  }

  return { statusCode: 200, body: JSON.stringify({ ok: true }) };
};
