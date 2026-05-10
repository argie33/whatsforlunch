// Mutation.deleteAccount resolver
// Delete user account and all associated data

const {
  ddb,
  TABLE_NAME,
  getUserId,
  getCurrentTimestamp,
} = require('./utils');

exports.handler = async (event) => {
  const userId = getUserId(event);

  try {
    // Soft delete user profile
    const profileResult = await ddb
      .query({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'PK = :pk AND SK = :sk',
        ExpressionAttributeValues: {
          ':pk': `USER#${userId}`,
          ':sk': 'PROFILE',
        },
      })
      .promise();

    if (profileResult.Items && profileResult.Items.length > 0) {
      const profile = profileResult.Items[0];
      profile.deletedAt = getCurrentTimestamp();
      profile.updatedAt = getCurrentTimestamp();
      profile._version = profile._version + 1;
      profile._lastChangedAt = Date.now();

      await ddb.put({ TableName: TABLE_NAME, Item: profile }).promise();
    }

    // Mark all household memberships as deleted
    const membershipsResult = await ddb
      .query({
        TableName: TABLE_NAME,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :pk',
        ExpressionAttributeValues: {
          ':pk': `USER#${userId}`,
        },
      })
      .promise();

    if (membershipsResult.Items) {
      for (const membership of membershipsResult.Items) {
        membership.deletedAt = getCurrentTimestamp();
        membership.updatedAt = getCurrentTimestamp();
        membership._version = membership._version + 1;
        membership._lastChangedAt = Date.now();
        await ddb.put({ TableName: TABLE_NAME, Item: membership }).promise();
      }
    }

    return true;
  } catch (error) {
    console.error('Error deleting account:', error);
    throw error;
  }
};
