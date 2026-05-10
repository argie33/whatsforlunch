// Mutation.changeRole resolver
// Change household member role (owner only)

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
  const newRole = event.arguments.role;

  try {
    // Verify user is owner of household
    await checkHouseholdOwner(userId, householdId);

    // Validate role
    const validRoles = ['owner', 'member'];
    if (!validRoles.includes(newRole)) {
      throw new Error('Invalid role. Must be owner or member.');
    }

    // Find member record
    const memberResult = await ddb
      .query({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'PK = :pk AND SK = :sk',
        ExpressionAttributeValues: {
          ':pk': `HOUSEHOLD#${householdId}`,
          ':sk': `MEMBER#${targetUserId}`,
        },
      })
      .promise();

    if (!memberResult.Items || memberResult.Items.length === 0) {
      throw new Error('Resource not found');
    }

    const member = memberResult.Items[0];

    // Cannot change owner role to member if they're the only owner
    if (member.role === 'owner' && newRole === 'member') {
      // Check if there are other owners
      const ownersResult = await ddb
        .query({
          TableName: TABLE_NAME,
          KeyConditionExpression: 'PK = :pk',
          ExpressionAttributeValues: {
            ':pk': `HOUSEHOLD#${householdId}`,
          },
          FilterExpression: 'begins_with(SK, :sk) AND #role = :role AND attribute_not_exists(deletedAt)',
          ExpressionAttributeNames: {
            '#role': 'role',
          },
          ExpressionAttributeValues: {
            ':sk': 'MEMBER#',
            ':role': 'owner',
          },
        })
        .promise();

      if (!ownersResult.Items || ownersResult.Items.length <= 1) {
        throw new Error('Household must have at least one owner');
      }
    }

    const updated = {
      ...member,
      role: newRole,
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
    console.error('Error changing member role:', error);
    throw error;
  }
};
