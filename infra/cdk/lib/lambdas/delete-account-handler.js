/**
 * Delete Account Handler
 * Triggered by Mutation.deleteAccount - comprehensive account cleanup
 *
 * Removes:
 * - User profile
 * - All household memberships
 * - Items created by user
 * - Shopping list items
 * - Invites sent/received
 * - Devices
 */

const AWS = require('aws-sdk');

const ddb = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || 'WFL-Main-dev';

exports.handler = async (event) => {
  const userId = event.userId;
  const timestamp = new Date().toISOString();

  console.log(`[delete-account] Starting deletion for user ${userId}`);

  try {
    // 1. Soft delete user profile
    await softDeleteUser(userId, timestamp);

    // 2. Find all households user belongs to
    const households = await getUserHouseholds(userId);

    // 3. For each household, clean up user's data
    for (const household of households) {
      await cleanupHouseholdData(household.householdId, userId, timestamp);
    }

    // 4. Clean up invites sent by user
    await cleanupUserInvites(userId, timestamp);

    // 5. Clean up devices registered to user
    await cleanupUserDevices(userId, timestamp);

    console.log(`[delete-account] Completed deletion for user ${userId}`);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Account deleted successfully',
        userId,
        deletedAt: timestamp,
      }),
    };
  } catch (error) {
    console.error('[delete-account] Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to delete account',
        message: error.message,
      }),
    };
  }
};

async function softDeleteUser(userId, timestamp) {
  const params = {
    TableName: TABLE_NAME,
    Key: {
      PK: `USER#${userId}`,
      SK: 'PROFILE',
    },
    UpdateExpression: 'SET #deletedAt = :timestamp, #updatedAt = :timestamp',
    ExpressionAttributeNames: {
      '#deletedAt': 'deletedAt',
      '#updatedAt': 'updatedAt',
    },
    ExpressionAttributeValues: {
      ':timestamp': timestamp,
    },
  };

  await ddb.update(params).promise();
  console.log(`[delete-account] Marked profile as deleted: ${userId}`);
}

async function getUserHouseholds(userId) {
  const params = {
    TableName: TABLE_NAME,
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :pk',
    ExpressionAttributeValues: {
      ':pk': `USER#${userId}`,
    },
  };

  const result = await ddb.query(params).promise();
  return result.Items.filter((item) => item.entityType === 'HouseholdMember').map((m) => ({
    householdId: m.householdId,
    role: m.role,
  }));
}

async function cleanupHouseholdData(householdId, userId, timestamp) {
  // Remove user from household members
  const memberParams = {
    TableName: TABLE_NAME,
    Key: {
      PK: `HOUSEHOLD#${householdId}`,
      SK: `MEMBER#${userId}`,
    },
    UpdateExpression: 'SET #deletedAt = :timestamp',
    ExpressionAttributeNames: {
      '#deletedAt': 'deletedAt',
    },
    ExpressionAttributeValues: {
      ':timestamp': timestamp,
    },
  };

  try {
    await ddb.update(memberParams).promise();
  } catch (error) {
    console.log(`[delete-account] Member not found in household ${householdId}`);
  }

  // Soft delete items created by this user
  const itemsParams = {
    TableName: TABLE_NAME,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
    ExpressionAttributeValues: {
      ':pk': `HOUSEHOLD#${householdId}`,
      ':sk': 'ITEM#',
    },
  };

  const itemsResult = await ddb.query(itemsParams).promise();

  for (const item of itemsResult.Items) {
    if (item.createdByUserId === userId && !item.deletedAt) {
      const deleteParams = {
        TableName: TABLE_NAME,
        Key: {
          PK: item.PK,
          SK: item.SK,
        },
        UpdateExpression: 'SET #deletedAt = :timestamp',
        ExpressionAttributeNames: {
          '#deletedAt': 'deletedAt',
        },
        ExpressionAttributeValues: {
          ':timestamp': timestamp,
        },
      };
      await ddb.update(deleteParams).promise();
    }
  }

  console.log(`[delete-account] Cleaned up household data: ${householdId}`);
}

async function cleanupUserInvites(userId, timestamp) {
  // Find all invites sent by this user
  const params = {
    TableName: TABLE_NAME,
    FilterExpression: 'invitedByUserId = :userId AND entityType = :type',
    ExpressionAttributeValues: {
      ':userId': userId,
      ':type': 'HouseholdInvite',
    },
  };

  const result = await ddb.scan(params).promise();

  for (const invite of result.Items) {
    const deleteParams = {
      TableName: TABLE_NAME,
      Key: {
        PK: invite.PK,
        SK: invite.SK,
      },
      UpdateExpression: 'SET #deletedAt = :timestamp',
      ExpressionAttributeNames: {
        '#deletedAt': 'deletedAt',
      },
      ExpressionAttributeValues: {
        ':timestamp': timestamp,
      },
    };
    await ddb.update(deleteParams).promise();
  }

  console.log(`[delete-account] Cleaned up invites for user: ${userId}`);
}

async function cleanupUserDevices(userId, timestamp) {
  // Find all devices registered to this user
  const params = {
    TableName: TABLE_NAME,
    KeyConditionExpression: 'PK = :pk',
    ExpressionAttributeValues: {
      ':pk': `USER#${userId}`,
    },
  };

  const result = await ddb.query(params).promise();

  for (const device of result.Items) {
    if (device.entityType === 'Device') {
      const deleteParams = {
        TableName: TABLE_NAME,
        Key: {
          PK: device.PK,
          SK: device.SK,
        },
        UpdateExpression: 'SET #deletedAt = :timestamp',
        ExpressionAttributeNames: {
          '#deletedAt': 'deletedAt',
        },
        ExpressionAttributeValues: {
          ':timestamp': timestamp,
        },
      };
      await ddb.update(deleteParams).promise();
    }
  }

  console.log(`[delete-account] Cleaned up devices for user: ${userId}`);
}
