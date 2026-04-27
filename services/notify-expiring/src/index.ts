/**
 * Lambda: notify-expiring
 * Runs daily via EventBridge. Scans DynamoDB for items expiring within
 * the next 24 hours and sends SNS mobile push notifications per user.
 *
 * Environment variables:
 *   MAIN_TABLE       — DynamoDB table name
 *   SNS_PLATFORM_ARN — SNS Application ARN for mobile push (APNs/FCM)
 *   AWS_REGION       — AWS region
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { Logger } from '@aws-lambda-powertools/logger';

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

async function getDeviceEndpointArn(userId: string): Promise<string | null> {
  // Look up the user's SNS endpoint ARN stored in their profile
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

export const handler = async (): Promise<{ sent: number; skipped: number }> => {
  logger.info('notify-expiring: starting scan');

  const items = await getItemsExpiringInWindow();
  logger.info(`Found ${items.length} expiring items`);

  let sent = 0;
  let skipped = 0;

  // Group by user to batch per-user (avoid duplicate notifications)
  const byUser = new Map<string, ExpiringItem[]>();
  for (const item of items) {
    const uid = item.addedByUserId;
    if (!byUser.has(uid)) byUser.set(uid, []);
    byUser.get(uid)!.push(item);
  }

  for (const [userId, userItems] of byUser) {
    const endpointArn = await getDeviceEndpointArn(userId);
    if (!endpointArn) {
      skipped += userItems.length;
      continue;
    }

    // Send one notification for the most urgent item
    const mostUrgent = userItems.sort(
      (a, b) => new Date(a.expiryAt).getTime() - new Date(b.expiryAt).getTime(),
    )[0]!;

    const message =
      userItems.length === 1
        ? buildPushPayload(mostUrgent)
        : JSON.stringify({
            default: `${userItems.length} items expiring soon — use them up!`,
            APNS: JSON.stringify({
              aps: {
                alert: {
                  title: '🧊 Use them up!',
                  body: `${userItems.length} items are expiring soon, including ${mostUrgent.foodName}.`,
                },
                sound: 'default',
                badge: userItems.length,
              },
              itemId: mostUrgent.id,
            }),
            GCM: JSON.stringify({
              notification: {
                title: '🧊 Use them up!',
                body: `${userItems.length} items are expiring soon.`,
              },
              data: { itemId: mostUrgent.id },
            }),
          });

    try {
      await sns.send(new PublishCommand({
        TargetArn: endpointArn,
        Message: message,
        MessageStructure: 'json',
      }));
      sent++;
      logger.info('Notification sent', { userId, items: userItems.length });
    } catch (err) {
      logger.error('Failed to send notification', { userId, error: err });
      skipped++;
    }
  }

  logger.info('notify-expiring: done', { sent, skipped });
  return { sent, skipped };
};
