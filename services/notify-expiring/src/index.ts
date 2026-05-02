/**
 * Lambda: notify-expiring
 * Runs daily via EventBridge. Scans DynamoDB for items expiring within
 * the next 24 hours and sends push notifications to registered devices.
 *
 * Supports:
 *   - Expo push tokens (default, works with FCM/APNS)
 *   - AWS SNS endpoints (fallback)
 *
 * Environment variables:
 *   MAIN_TABLE       — DynamoDB table name
 *   EXPO_ACCESS_TOKEN — Expo push service access token (optional)
 *   AWS_REGION       — AWS region
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { Logger } from '@aws-lambda-powertools/logger';
import https from 'https';

const logger = new Logger({ serviceName: 'notify-expiring' });

const ddbClient = new DynamoDBClient({ region: process.env.AWS_REGION ?? 'us-east-1' });
const ddb = DynamoDBDocumentClient.from(ddbClient);
const sns = new SNSClient({ region: process.env.AWS_REGION ?? 'us-east-1' });

const TABLE = process.env.MAIN_TABLE ?? 'wfl-main-dev';
const WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

interface ExpiringItem {
  id: string;
  householdId: string;
  foodName: string;
  expiryAt: string;
  status: string;
  addedByUserId: string;
}

async function getItemsExpiringInWindow(): Promise<ExpiringItem[]> {
  const now = new Date().toISOString();
  const cutoff = new Date(Date.now() + WINDOW_MS).toISOString();

  // Uses GSI2: EXPIRING#householdId → expiryAt (range key)
  // We scan all households via a GSI scan. In production this would be
  // per-household based on an EventBridge schedule per household.
  const result = await ddb.send(new QueryCommand({
    TableName: TABLE,
    IndexName: 'GSI2',
    KeyConditionExpression: 'begins_with(GSI2PK, :prefix) AND GSI2SK BETWEEN :now AND :cutoff',
    ExpressionAttributeValues: {
      ':prefix': 'EXPIRING#',
      ':now': now,
      ':cutoff': cutoff,
    },
    FilterExpression: '#st = :active',
    ExpressionAttributeNames: { '#st': 'status' },
  }));

  return (result.Items ?? []) as ExpiringItem[];
}

async function getPushTokensForHousehold(householdId: string): Promise<string[]> {
  // Get all registered push tokens for a household
  const result = await ddb.send(new QueryCommand({
    TableName: TABLE,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
    ExpressionAttributeValues: {
      ':pk': `HOUSEHOLD#${householdId}`,
      ':sk': 'PUSH_TOKEN#',
    },
    ProjectionExpression: 'token',
  }));

  return ((result.Items ?? []) as Record<string, unknown>[]).map((item) => item.token as string);
}

async function sendExpoNotification(
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, unknown>,
): Promise<{ success: number; failed: number }> {
  if (!tokens.length) return { success: 0, failed: 0 };

  const expoToken = process.env.EXPO_ACCESS_TOKEN;
  if (!expoToken) {
    logger.warn('EXPO_ACCESS_TOKEN not set, skipping Expo notifications');
    return { success: 0, failed: tokens.length };
  }

  let success = 0;
  let failed = 0;

  for (const token of tokens) {
    try {
      const payload = JSON.stringify({
        to: token,
        title,
        body,
        data: data || {},
      });

      await new Promise<void>((resolve, reject) => {
        const req = https.request('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload),
            'Authorization': `Bearer ${expoToken}`,
          },
        }, (res) => {
          if (res.statusCode === 200 || res.statusCode === 201) {
            resolve();
          } else {
            reject(new Error(`HTTP ${res.statusCode}`));
          }
        });

        req.on('error', reject);
        req.write(payload);
        req.end();
      });

      success++;
    } catch (err) {
      logger.error('Failed to send Expo notification', { token, error: err });
      failed++;
    }
  }

  return { success, failed };
}

async function getDeviceEndpointArn(userId: string): Promise<string | null> {
  // Look up the user's SNS endpoint ARN stored in their profile (fallback)
  const result = await ddb.send(new GetCommand({
    TableName: TABLE,
    Key: { PK: `USER#${userId}`, SK: 'PROFILE' },
    ProjectionExpression: 'snsEndpointArn, notificationsEnabled',
  }));

  const profile = result.Item as Record<string, unknown> | undefined;
  if (!profile) return null;
  if (profile['notificationsEnabled'] === false) return null;
  return (profile['snsEndpointArn'] as string | undefined) ?? null;
}

function buildPushPayload(item: ExpiringItem): string {
  const expiryDate = new Date(item.expiryAt).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  });

  const hoursLeft = Math.ceil((new Date(item.expiryAt).getTime() - Date.now()) / 3_600_000);
  const timeText = hoursLeft <= 2
    ? 'in the next couple hours'
    : hoursLeft <= 8
    ? 'today'
    : 'tomorrow';

  return JSON.stringify({
    default: `${item.foodName} expires ${timeText}`,
    APNS: JSON.stringify({
      aps: {
        alert: {
          title: '🧊 Use it up!',
          body: `${item.foodName} expires ${timeText} (${expiryDate})`,
        },
        sound: 'default',
        badge: 1,
        'content-available': 1,
      },
      itemId: item.id,
    }),
    GCM: JSON.stringify({
      notification: {
        title: '🧊 Use it up!',
        body: `${item.foodName} expires ${timeText} (${expiryDate})`,
      },
      data: { itemId: item.id },
    }),
  });
}

export const handler = async (): Promise<{ sent: number; failed: number }> => {
  logger.info('notify-expiring: starting scan');

  const items = await getItemsExpiringInWindow();
  logger.info(`Found ${items.length} expiring items`);

  let sent = 0;
  let failed = 0;

  // Group by household to send notifications to all household members
  const byHousehold = new Map<string, ExpiringItem[]>();
  for (const item of items) {
    const hid = item.householdId;
    if (!byHousehold.has(hid)) byHousehold.set(hid, []);
    byHousehold.get(hid)!.push(item);
  }

  for (const [householdId, householdItems] of byHousehold) {
    // Get push tokens for this household
    const pushTokens = await getPushTokensForHousehold(householdId);

    if (!pushTokens.length) {
      logger.debug('No push tokens for household', { householdId });
      failed += householdItems.length;
      continue;
    }

    // Find the most urgent item
    const mostUrgent = householdItems.sort(
      (a, b) => new Date(a.expiryAt).getTime() - new Date(b.expiryAt).getTime(),
    )[0]!;

    const title = '🧊 Use it up!';
    const body =
      householdItems.length === 1
        ? `${mostUrgent.foodName} is expiring soon`
        : `${householdItems.length} items are expiring soon`;

    // Try Expo first (modern approach)
    const expoResult = await sendExpoNotification(pushTokens, title, body, {
      householdId,
      itemId: mostUrgent.id,
    });

    sent += expoResult.success;
    failed += expoResult.failed;

    if (expoResult.success > 0) {
      logger.info('Notifications sent via Expo', {
        householdId,
        tokens: expoResult.success,
        items: householdItems.length,
      });
    }

    // Fallback: Try SNS for any tokens that failed
    if (expoResult.failed > 0) {
      try {
        const userId = householdItems[0]!.addedByUserId;
        const endpointArn = await getDeviceEndpointArn(userId);

        if (endpointArn) {
          const message = buildPushPayload(mostUrgent);
          await sns.send(new PublishCommand({
            TargetArn: endpointArn,
            Message: message,
            MessageStructure: 'json',
          }));
          logger.info('Fallback: Notification sent via SNS', { householdId, userId });
        }
      } catch (err) {
        logger.error('Failed to send SNS fallback notification', { householdId, error: err });
      }
    }
  }

  logger.info('notify-expiring: done', { sent, failed });
  return { sent, failed };
};
