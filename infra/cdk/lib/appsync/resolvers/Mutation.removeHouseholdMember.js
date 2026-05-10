// Mutation.removeHouseholdMember resolver
// Remove a member from household (owner only)

const {
  ddb,
  TABLE_NAME,
  getUserId,
  checkHouseholdOwner,
  putItem,
  getCurrentTimestamp,
} = require('./utils');

exports.handler = async (event) => {
  const userId = getUserId(event);
  const householdId = event.arguments.householdId;
  const targetUserId = event.arguments.userId;

  try {
    // Verify user is owner of household
    await checkHouseholdOwner(userId, householdId);

    // Cannot remove owner from household
    const ownerResult = await ddb
      .query({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'PK = :pk AND SK = :sk',
        ExpressionAttributeValues: {
          ':pk': `HOUSEHOLD#${householdId}`,
          ':sk': `MEMBER#${targetUserId}`,
        },
      })
      .promise();

    if (!ownerResult.Items || ownerResult.Items.length === 0) {
      throw new Error('Resource not found');
    }

    const member = ownerResult.Items[0];

    // Prevent removing the owner
    if (member.role === 'owner') {
      throw new Error('Cannot remove household owner');
    }

    // Soft delete the member record
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
    console.error('Error removing household member:', error);
    throw error;
  }
};
