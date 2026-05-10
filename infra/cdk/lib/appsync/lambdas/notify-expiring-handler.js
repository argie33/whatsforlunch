// Notify Expiring Handler
// Scheduled Lambda to send push notifications for items expiring soon

const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();
const https = require('https');

const TABLE_NAME = process.env.TABLE_NAME || 'WFL-Main-dev';
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

async function sendExpoPushNotification(token, title, message, data = {}) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      to: token,
      title,
      body: message,
      data,
      ttl: 86400, // 24 hours
      priority: 'high',
    });

    const options = {
      hostname: 'exp.host',
      path: '/--/api/v2/push/send',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`Expo API error: ${res.statusCode}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(payload);
    req.end();
  });
}

async function getExpiringItems() {
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const in72Hours = new Date(now.getTime() + 72 * 60 * 60 * 1000);

  const result = await dynamodb
    .query({
      TableName: TABLE_NAME,
      IndexName: 'GSI2',
      KeyConditionExpression: 'GSI2PK = :pk AND GSI2SK BETWEEN :start AND :end',
      ExpressionAttributeValues: {
        ':pk': 'EXPIRING',
        ':start': new Date(0).toISOString(),
        ':end': in72Hours.toISOString(),
      },
      FilterExpression: '#status = :status AND deletedAt IS NULL',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: {
        ':status': 'active',
      },
    })
    .promise();

  return result.Items || [];
}

async function getUserDevices(userId) {
  const result = await dynamodb
    .query({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `USER#${userId}`,
        ':sk': 'DEVICE#',
      },
      FilterExpression: 'deletedAt IS NULL',
    })
    .promise();

  return result.Items || [];
}

async function notifyExpiringItems() {
  console.log('[notify-expiring] Starting expiring items notification batch');

  const expiringItems = await getExpiringItems();
  console.log(`[notify-expiring] Found ${expiringItems.length} expiring items`);

  const notificationsByUser = {};

  for (const item of expiringItems) {
    const userId = item.createdByUserId;
    const hoursUntilExpiry = Math.floor(
      (new Date(item.expiryDate).getTime() - Date.now()) / (60 * 60 * 1000)
    );

    if (!notificationsByUser[userId]) {
      notificationsByUser[userId] = [];
    }

    notificationsByUser[userId].push({
      itemId: item.PK.replace('ITEM#', ''),
      name: item.name,
      expiryDate: item.expiryDate,
      hoursUntilExpiry,
    });
  }

  let successCount = 0;
  let failureCount = 0;
  const notifications = [];

  for (const [userId, items] of Object.entries(notificationsByUser)) {
    try {
      const devices = await getUserDevices(userId);

      if (devices.length === 0) {
        console.log(`[notify-expiring] No devices found for user ${userId}`);
        continue;
      }

      for (const item of items) {
        const urgency = item.hoursUntilExpiry < 24 ? 'red' : 'orange';
        const title = `${urgency === 'red' ? '🔴' : '🟠'} ${item.name} expiring soon`;
        const message =
          urgency === 'red'
            ? `${item.name} expires in ${item.hoursUntilExpiry} hours`
            : `${item.name} expires in ${Math.ceil(item.hoursUntilExpiry / 24)} days`;

        for (const device of devices) {
          if (!device.expoToken) continue;

          try {
            await sendExpoPushNotification(device.expoToken, title, message, {
              itemId: item.itemId,
              urgency,
              expiryDate: item.expiryDate,
            });

            successCount++;
            notifications.push({
              userId,
              itemId: item.itemId,
              deviceToken: device.expoToken,
              title,
              message,
              timestamp: new Date().toISOString(),
            });

            console.log(`[notify-expiring] Sent notification to ${device.expoToken.substring(0, 10)}...`);
          } catch (error) {
            failureCount++;
            console.error(`[notify-expiring] Failed to send notification:`, error.message);
          }
        }
      }
    } catch (error) {
      failureCount++;
      console.error(`[notify-expiring] Error processing user ${userId}:`, error.message);
    }
  }

  // Log notification batch
  const logEntry = {
    PK: 'NOTIFICATIONS#LOG',
    SK: `BATCH#${Date.now()}`,
    entityType: 'NotificationBatch',
    timestamp: new Date().toISOString(),
    itemsProcessed: expiringItems.length,
    usersNotified: Object.keys(notificationsByUser).length,
    notificationsSent: successCount,
    notificationsFailed: failureCount,
  };

  await dynamodb.put({ TableName: TABLE_NAME, Item: logEntry }).promise();

  return {
    itemsProcessed: expiringItems.length,
    usersNotified: Object.keys(notificationsByUser).length,
    notificationsSent: successCount,
    notificationsFailed: failureCount,
    notifications: notifications.slice(0, 100), // Return first 100 for logging
  };
}

exports.handler = async (event) => {
  console.log('[notify-expiring] Handler invoked', JSON.stringify(event, null, 2));

  try {
    const result = await notifyExpiringItems();
    console.log('[notify-expiring] Handler completed successfully', result);
    return {
      statusCode: 200,
      body: JSON.stringify(result),
    };
  } catch (error) {
    console.error('[notify-expiring] Handler error', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message,
        type: 'NotificationBatchFailed',
      }),
    };
  }
};
