// Delete Account Handler
// Comprehensive account cleanup with soft-delete and hard-purge phases

const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();

const TABLE_NAME = process.env.TABLE_NAME || 'WFL-Main-dev';

async function softDeleteUser(userId, householdIds) {
  // Soft-delete user profile
  const profileKey = { PK: `USER#${userId}`, SK: 'PROFILE' };
  await dynamodb
    .update({
      TableName: TABLE_NAME,
      Key: profileKey,
      UpdateExpression:
        'SET deletedAt = :now, #status = :status, _lastChangedAt = :now, _version = _version + :inc',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: {
        ':now': new Date().toISOString(),
        ':status': 'deleted',
        ':inc': 1,
      },
    })
    .promise();

  console.log(`[delete-account] Soft-deleted profile for user ${userId}`);

  // Soft-delete household memberships
  for (const householdId of householdIds) {
    await dynamodb
      .update({
        TableName: TABLE_NAME,
        Key: {
          PK: `HOUSEHOLD#${householdId}`,
          SK: `MEMBER#${userId}`,
        },
        UpdateExpression:
          'SET deletedAt = :now, #status = :status, _lastChangedAt = :now, _version = _version + :inc',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: {
          ':now': new Date().toISOString(),
          ':status': 'deleted',
          ':inc': 1,
        },
      })
      .promise();

    console.log(
      `[delete-account] Soft-deleted membership for user ${userId} in household ${householdId}`
    );
  }

  // Soft-delete all items created by user across households
  const userItemsResult = await dynamodb
    .query({
      TableName: TABLE_NAME,
      IndexName: 'GSI3',
      KeyConditionExpression: 'GSI3PK = :pk',
      ExpressionAttributeValues: {
        ':pk': `USER#${userId}#ITEMS`,
      },
    })
    .promise();

  const userItems = userItemsResult.Items || [];
  console.log(
    `[delete-account] Found ${userItems.length} items created by user ${userId}`
  );

  // Batch soft-delete items
  for (const item of userItems) {
    await dynamodb
      .update({
        TableName: TABLE_NAME,
        Key: { PK: item.PK, SK: item.SK },
        UpdateExpression:
          'SET deletedAt = :now, #status = :status, _lastChangedAt = :now, _version = _version + :inc',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: {
          ':now': new Date().toISOString(),
          ':status': 'deleted',
          ':inc': 1,
        },
      })
      .promise();
  }

  // Soft-delete household invites sent by user
  const invitesResult = await dynamodb
    .query({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `INVITE#${userId}`,
        ':sk': 'TOKEN#',
      },
    })
    .promise();

  const invites = invitesResult.Items || [];
  for (const invite of invites) {
    await dynamodb
      .update({
        TableName: TABLE_NAME,
        Key: { PK: invite.PK, SK: invite.SK },
        UpdateExpression: 'SET deletedAt = :now, _lastChangedAt = :now, _version = _version + :inc',
        ExpressionAttributeValues: {
          ':now': new Date().toISOString(),
          ':inc': 1,
        },
      })
      .promise();
  }

  // Soft-delete mobile devices (for push notifications)
  const devicesResult = await dynamodb
    .query({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `USER#${userId}`,
        ':sk': 'DEVICE#',
      },
    })
    .promise();

  const devices = devicesResult.Items || [];
  for (const device of devices) {
    await dynamodb
      .update({
        TableName: TABLE_NAME,
        Key: { PK: device.PK, SK: device.SK },
        UpdateExpression: 'SET deletedAt = :now, _lastChangedAt = :now, _version = _version + :inc',
        ExpressionAttributeValues: {
          ':now': new Date().toISOString(),
          ':inc': 1,
        },
      })
      .promise();
  }

  // Log deletion event
  const eventEntry = {
    PK: `USER#${userId}`,
    SK: `EVENT#${Date.now()}#DELETE`,
    entityType: 'UserEvent',
    eventType: 'AccountSoftDeleted',
    timestamp: new Date().toISOString(),
    userId,
    householdsAffected: householdIds.length,
    itemsDeleted: userItems.length,
    invitesDeleted: invites.length,
    devicesDeleted: devices.length,
  };

  await dynamodb.put({ TableName: TABLE_NAME, Item: eventEntry }).promise();

  return {
    phase: 'soft-delete',
    userId,
    householdsAffected: householdIds.length,
    itemsDeleted: userItems.length,
    invitesDeleted: invites.length,
    devicesDeleted: devices.length,
  };
}

async function hardPurgeUser(userId, householdIds) {
  // Hard delete (permanent removal) after retention window
  const profileKey = { PK: `USER#${userId}`, SK: 'PROFILE' };
  await dynamodb.delete({ TableName: TABLE_NAME, Key: profileKey }).promise();

  console.log(`[delete-account] Hard-purged profile for user ${userId}`);

  // Hard-delete household memberships
  for (const householdId of householdIds) {
    await dynamodb
      .delete({
        TableName: TABLE_NAME,
        Key: {
          PK: `HOUSEHOLD#${householdId}`,
          SK: `MEMBER#${userId}`,
        },
      })
      .promise();
  }

  // Hard-delete all items created by user
  const userItemsResult = await dynamodb
    .query({
      TableName: TABLE_NAME,
      IndexName: 'GSI3',
      KeyConditionExpression: 'GSI3PK = :pk',
      ExpressionAttributeValues: {
        ':pk': `USER#${userId}#ITEMS`,
      },
    })
    .promise();

  const userItems = userItemsResult.Items || [];
  for (const item of userItems) {
    await dynamodb.delete({ TableName: TABLE_NAME, Key: { PK: item.PK, SK: item.SK } }).promise();
  }

  // Hard-delete invites
  const invitesResult = await dynamodb
    .query({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `INVITE#${userId}`,
        ':sk': 'TOKEN#',
      },
    })
    .promise();

  const invites = invitesResult.Items || [];
  for (const invite of invites) {
    await dynamodb.delete({ TableName: TABLE_NAME, Key: { PK: invite.PK, SK: invite.SK } }).promise();
  }

  // Hard-delete devices
  const devicesResult = await dynamodb
    .query({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `USER#${userId}`,
        ':sk': 'DEVICE#',
      },
    })
    .promise();

  const devices = devicesResult.Items || [];
  for (const device of devices) {
    await dynamodb
      .delete({ TableName: TABLE_NAME, Key: { PK: device.PK, SK: device.SK } })
      .promise();
  }

  // Log purge completion
  const eventEntry = {
    PK: `ARCHIVE#PURGED`,
    SK: `USER#${userId}#${Date.now()}`,
    entityType: 'PurgeEvent',
    eventType: 'AccountHardPurged',
    timestamp: new Date().toISOString(),
    userId,
    householdsAffected: householdIds.length,
    itemsDeleted: userItems.length,
    invitesDeleted: invites.length,
  };

  await dynamodb.put({ TableName: TABLE_NAME, Item: eventEntry }).promise();

  return {
    phase: 'hard-purge',
    userId,
    householdsAffected: householdIds.length,
    itemsDeleted: userItems.length,
    invitesDeleted: invites.length,
  };
}

exports.handler = async (event) => {
  console.log('[delete-account] Handler invoked', JSON.stringify(event, null, 2));

  try {
    const { userId, householdIds, purge } = event.Payload || event;

    if (!userId) {
      throw new Error('Missing required parameter: userId');
    }

    if (!householdIds || !Array.isArray(householdIds)) {
      throw new Error('Missing or invalid required parameter: householdIds');
    }

    let result;
    if (purge) {
      result = await hardPurgeUser(userId, householdIds);
    } else {
      result = await softDeleteUser(userId, householdIds);
    }

    console.log('[delete-account] Handler completed successfully', result);
    return {
      statusCode: 200,
      body: JSON.stringify(result),
    };
  } catch (error) {
    console.error('[delete-account] Handler error', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message,
        type: 'DeleteAccountFailed',
      }),
    };
  }
};
