// Mutation.leaveHousehold resolver
// User leaves a household

const {
  ddb,
  TABLE_NAME,
  getUserId,
  putItem,
  getCurrentTimestamp,
} = require('./utils');

exports.handler = async (event) => {
  const userId = getUserId(event);
  const householdId = event.arguments.householdId;

  try {
    // Find member record
    const memberResult = await ddb
      .query({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'PK = :pk AND SK = :sk',
        ExpressionAttributeValues: {
          ':pk': `HOUSEHOLD#${householdId}`,
          ':sk': `MEMBER#${userId}`,
        },
      })
      .promise();

    if (!memberResult.Items || memberResult.Items.length === 0) {
      throw new Error('Resource not found');
    }

    const member = memberResult.Items[0];

    // Prevent owner from leaving (must transfer ownership or delete household)
    if (member.role === 'owner') {
      throw new Error('Owner cannot leave household. Transfer ownership or delete household.');
    }

    // Soft delete membership
    const updated = {
      ...member,
      deletedAt: getCurrentTimestamp(),
      updatedAt: getCurrentTimestamp(),
      _version: member._version + 1,
      _lastChangedAt: Date.now(),
    };

    await putItem(updated);

    return {
      id: updated.id,
      householdId: updated.householdId,
      userId: updated.userId,
      role: updated.role,
      joinedAt: updated.joinedAt,
      updatedAt: updated.updatedAt,
    };
  } catch (error) {
    console.error('Error leaving household:', error);
    throw error;
  }
};
