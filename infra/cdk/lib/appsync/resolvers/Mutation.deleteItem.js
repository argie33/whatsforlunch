// Mutation.deleteItem resolver
// Soft deletes an item (marks as deleted, doesn't remove from DB)

const {
  ddb,
  TABLE_NAME,
  getUserId,
  checkHouseholdMembership,
  getCurrentTimestamp,
} = require('./utils');

exports.handler = async (event) => {
  const userId = getUserId(event);
  const itemId = event.arguments.id;

  try {
    // Find item
    const items = await ddb
      .query({
        TableName: TABLE_NAME,
        IndexName: 'GSI3',
        KeyConditionExpression: 'GSI3PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: {
          ':pk': `USER_ITEMS#${userId}`,
          ':sk': `ITEM#${itemId}`,
        },
      })
      .promise();

    if (!items.Items || items.Items.length === 0) {
      throw new Error('Resource not found');
    }

    const item = items.Items[0];
    await checkHouseholdMembership(userId, item.householdId);

    // Soft delete
    const params = {
      TableName: TABLE_NAME,
      Key: { PK: item.PK, SK: item.SK },
      UpdateExpression: 'SET #deletedAt = :now, #updatedAt = :now, #version = #version + :inc',
      ExpressionAttributeNames: {
        '#deletedAt': 'deletedAt',
        '#updatedAt': 'updatedAt',
        '#version': '_version',
      },
      ExpressionAttributeValues: {
        ':now': getCurrentTimestamp(),
        ':inc': 1,
      },
      ReturnValues: 'ALL_NEW',
    };

    const result = await ddb.update(params).promise();

    // Log deletion event
    await logItemEvent(item.householdId, itemId, userId, 'deleted', {});

    return {
      success: true,
      id: itemId,
    };
  } catch (error) {
    console.error('Error deleting item:', error);
    throw error;
  }
};

async function logItemEvent(householdId, itemId, userId, eventType, payload) {
  const ddb = require('aws-sdk').DynamoDB.DocumentClient();
  const timestamp = new Date().toISOString();
  await ddb
    .put({
      TableName: process.env.DYNAMODB_TABLE_NAME || 'WFL-Main-dev',
      Item: {
        PK: `HOUSEHOLD#${householdId}`,
        SK: `EVENT#${itemId}#${timestamp}`,
        entityType: 'ItemEvent',
        id: require('crypto').randomUUID(),
        itemId,
        actorUserId: userId,
        eventType,
        payload,
        createdAt: timestamp,
      },
    })
    .promise();
}
