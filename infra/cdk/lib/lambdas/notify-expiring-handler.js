/**
 * Notify Expiring Items Handler
 * Scheduled Lambda (CloudWatch Events)
 * Runs every 6 hours to send push notifications for items expiring soon
 *
 * Triggers push notifications via Expo:
 * - Expiring in 24 hours (red alert)
 * - Expiring in 72 hours (orange warning)
 */

const AWS = require('aws-sdk');
const https = require('https');

const ddb = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || 'WFL-Main-dev';
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

exports.handler = async (event) => {
  console.log('[notify-expiring] Starting expiring items notification scan');

  try {
    const now = Date.now();
    const in24h = new Date(now + 24 * 60 * 60 * 1000).toISOString();
    const in72h = new Date(now + 72 * 60 * 60 * 1000).toISOString();

    // Find items expiring within 24 hours
    const urgentItems = await getExpiringItems(now, in24h);
    console.log(`[notify-expiring] Found ${urgentItems.length} items expiring in 24h`);

    // Find items expiring within 72 hours
    const warningItems = await getExpiringItems(in24h, in72h);
    console.log(`[notify-expiring] Found ${warningItems.length} items expiring in 72h`);

    // Send notifications
    const notificationResults = {
      urgent: 0,
      warning: 0,
      failed: 0,
    };

    // Send urgent notifications (red alert)
    for (const item of urgentItems) {
      try {
        await notifyHousehold(item.householdId, {
          title: '🚨 Item Expiring Soon!',
          body: `${item.foodType} expires in less than 24 hours`,
          data: { itemId: item.id, type: 'itemExpiring' },
          priority: 'high',
        });
        notificationResults.urgent++;
      } catch (error) {
        console.error(`[notify-expiring] Failed to notify for item ${item.id}:`, error);
        notificationResults.failed++;
      }
    }

    // Send warning notifications (orange)
    for (const item of warningItems) {
      try {
        await notifyHousehold(item.householdId, {
          title: '⏰ Item Expiring Soon',
          body: `${item.foodType} expires in 2-3 days`,
          data: { itemId: item.id, type: 'itemExpiring' },
          priority: 'normal',
        });
        notificationResults.warning++;
      } catch (error) {
        console.error(`[notify-expiring] Failed to notify for item ${item.id}:`, error);
        notificationResults.failed++;
      }
    }

    console.log('[notify-expiring] Notification results:', notificationResults);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Notifications sent',
        results: notificationResults,
      }),
    };
  } catch (error) {
    console.error('[notify-expiring] Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to send notifications',
        message: error.message,
      }),
    };
  }
};

async function getExpiringItems(afterTime, beforeTime) {
  // Query GSI2 for items in expiry window
  const params = {
    TableName: TABLE_NAME,
    IndexName: 'GSI2',
    KeyConditionExpression:
      'begins_with(GSI2PK, :prefix) AND GSI2SK BETWEEN :after AND :before',
    ExpressionAttributeValues: {
      ':prefix': 'EXPIRING#',
      ':after': afterTime,
      ':before': beforeTime,
    },
    FilterExpression: '#status = :active AND attribute_not_exists(deletedAt)',
    ExpressionAttributeNames: {
      '#status': 'status',
    },
    ExpressionAttributeValues: {
      ':active': 'active',
    },
  };

  const result = await ddb.scan(params).promise();
  return result.Items || [];
}

async function notifyHousehold(householdId, notification) {
  // Get all members of household with devices
  const memberParams = {
    TableName: TABLE_NAME,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
    ExpressionAttributeValues: {
      ':pk': `HOUSEHOLD#${householdId}`,
      ':sk': 'MEMBER#',
    },
    FilterExpression: 'attribute_not_exists(deletedAt)',
  };

  const members = await ddb.query(memberParams).promise();

  for (const member of members.Items) {
    const devices = await getUserDevices(member.userId);

    for (const device of devices) {
      if (device.expoPushToken && device.pushEnabled !== false) {
        await sendExpoPushNotification(device.expoPushToken, notification);
      }
    }
  }
}

async function getUserDevices(userId) {
  const params = {
    TableName: TABLE_NAME,
    KeyConditionExpression: 'PK = :pk',
    ExpressionAttributeValues: {
      ':pk': `USER#${userId}`,
    },
    FilterExpression: 'entityType = :type AND attribute_not_exists(deletedAt)',
    ExpressionAttributeValues: {
      ':type': 'Device',
    },
  };

  const result = await ddb.query(params).promise();
  return result.Items || [];
}

async function sendExpoPushNotification(token, notification) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      to: token,
      title: notification.title,
      body: notification.body,
      data: notification.data,
      priority: notification.priority || 'default',
    });

    const options = {
      hostname: 'exp.host',
      path: '/--/api/v2/push/send',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': payload.length,
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(data);
        } else {
          reject(new Error(`Expo API returned ${res.statusCode}`));
        }
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}
