import { DynamoDBDocumentClient, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { getHours, getMinutes } from 'date-fns';
import { utcToZonedTime } from 'date-fns-tz';

const dynamodb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const sns = new SNSClient({});

const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || 'WFL-Main-dev';
const SNS_TOPIC_ARN = process.env.SNS_TOPIC_ARN || '';

interface ExpiringItem {
  id: string;
  foodName: string;
  expiryAt: string;
  hoursUntilExpiry: number;
}

interface DigestData {
  userId: string;
  householdIds: string[];
  digestTime: string;
  digestTimezone: string;
  expiringItems: ExpiringItem[];
}

async function getUsersForDigest(): Promise<Map<string, DigestData>> {
  const users = new Map<string, DigestData>();

  try {
    const result = await dynamodb.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :pk',
        ExpressionAttributeValues: {
          ':pk': 'PROFILE',
        },
      }),
    );

    if (!result.Items) return users;

    for (const profile of result.Items) {
      if (profile.digestEnabled && profile.digestTime && profile.digestTimezone && profile.id) {
        users.set(profile.id, {
          userId: profile.id,
          householdIds: [],
          digestTime: profile.digestTime,
          digestTimezone: profile.digestTimezone,
          expiringItems: [],
        });
      }
    }
  } catch (error) {
    console.error('Error fetching users for digest:', error);
  }

  return users;
}

async function getHouseholdsForUser(userId: string): Promise<string[]> {
  const householdIds: string[] = [];

  try {
    const result = await dynamodb.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: 'GSI2',
        KeyConditionExpression: 'GSI2PK = :pk',
        ExpressionAttributeValues: {
          ':pk': `USER_HOUSEHOLDS#${userId}`,
        },
      }),
    );

    if (result.Items) {
      householdIds.push(...result.Items.map((item) => item.householdId));
    }
  } catch (error) {
    console.error('Error fetching households for user:', error);
  }

  return householdIds;
}

async function getExpiringItems(
  householdId: string,
  hoursUntilExpiry = 24,
): Promise<ExpiringItem[]> {
  const items: ExpiringItem[] = [];
  const now = new Date();
  const expiryThreshold = new Date(now.getTime() + hoursUntilExpiry * 60 * 60 * 1000);

  try {
    const result = await dynamodb.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: {
          ':pk': `HOUSEHOLD#${householdId}`,
          ':sk': 'ITEM#',
        },
      }),
    );

    if (result.Items) {
      for (const item of result.Items) {
        if (
          item.status === 'active' &&
          !item.deletedAt &&
          new Date(item.expiryAt) <= expiryThreshold
        ) {
          const hoursUntil = Math.ceil(
            (new Date(item.expiryAt).getTime() - now.getTime()) / (1000 * 60 * 60),
          );
          items.push({
            id: item.id,
            foodName: item.foodName,
            expiryAt: item.expiryAt,
            hoursUntilExpiry: hoursUntil,
          });
        }
      }
    }
  } catch (error) {
    console.error('Error fetching expiring items:', error);
  }

  return items;
}

function shouldSendDigest(digestTime: string, digestTimezone: string): boolean {
  const now = new Date();
  const zonedNow = utcToZonedTime(now, digestTimezone);

  const [digestHour, digestMinute = 0] = digestTime.split(':').map(Number);
  const currentHour = getHours(zonedNow);
  const currentMinute = getMinutes(zonedNow);

  return (
    currentHour === digestHour && currentMinute >= digestMinute && currentMinute < digestMinute + 5
  );
}

async function sendDigest(digestData: DigestData): Promise<void> {
  if (!shouldSendDigest(digestData.digestTime, digestData.digestTimezone)) {
    return;
  }

  let allExpiringItems: ExpiringItem[] = [];

  for (const householdId of digestData.householdIds) {
    const expiringItems = await getExpiringItems(householdId);
    allExpiringItems.push(...expiringItems);
  }

  if (allExpiringItems.length === 0) {
    console.log(`No expiring items for user ${digestData.userId}`);
    return;
  }

  const message = buildDigestMessage(digestData.userId, allExpiringItems);

  try {
    await sns.send(
      new PublishCommand({
        TopicArn: SNS_TOPIC_ARN,
        Subject: 'Your Daily Food Digest from WhatsForLunch',
        Message: message,
        MessageAttributes: {
          userId: {
            DataType: 'String',
            StringValue: digestData.userId,
          },
          digestType: {
            DataType: 'String',
            StringValue: 'daily',
          },
        },
      }),
    );

    await updateLastSentAt(digestData.userId);
  } catch (error) {
    console.error('Error sending digest:', error);
    throw error;
  }
}

function buildDigestMessage(_userId: string, items: ExpiringItem[]): string {
  const urgent = items.filter((i) => i.hoursUntilExpiry <= 6);
  const soon = items.filter((i) => i.hoursUntilExpiry > 6 && i.hoursUntilExpiry <= 24);

  let message = 'Your Daily Food Digest\n\n';

  if (urgent.length > 0) {
    message += `⚠️  EAT TODAY (${urgent.length}):\n`;
    urgent.forEach((item) => {
      message += `• ${item.foodName} - expires in ${item.hoursUntilExpiry}h\n`;
    });
    message += '\n';
  }

  if (soon.length > 0) {
    message += `📅 Use Soon (${soon.length}):\n`;
    soon.forEach((item) => {
      message += `• ${item.foodName} - expires in ${item.hoursUntilExpiry}h\n`;
    });
  }

  message += '\nOpen WhatsForLunch to see recipes and get cooking!\n';
  return message;
}

async function updateLastSentAt(userId: string): Promise<void> {
  try {
    await dynamodb.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `PROFILE#${userId}`,
          SK: 'PROFILE',
        },
        UpdateExpression: 'SET digestLastSentAt = :now',
        ExpressionAttributeValues: {
          ':now': new Date().toISOString(),
        },
      }),
    );
  } catch (error) {
    console.error('Error updating last sent at:', error);
  }
}

export async function handler(event: any): Promise<void> {
  console.log('Send Digest Lambda triggered', { event });

  try {
    const usersForDigest = await getUsersForDigest();
    console.log(`Found ${usersForDigest.size} users with digest enabled`);

    for (const [userId, digestData] of usersForDigest) {
      try {
        digestData.householdIds = await getHouseholdsForUser(userId);
        await sendDigest(digestData);
      } catch (error) {
        console.error(`Error processing digest for user ${userId}:`, error);
      }
    }
  } catch (error) {
    console.error('Error in send-digest handler:', error);
    throw error;
  }
}
