// Mutation.deleteHousehold resolver
// Delete household (owner only) - soft delete

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

  try {
    // Verify user is owner of household
    await checkHouseholdOwner(userId, householdId);

    // Get household metadata
    const result = await ddb
      .query({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'PK = :pk AND SK = :sk',
        ExpressionAttributeValues: {
          ':pk': `HOUSEHOLD#${householdId}`,
          ':sk': 'METADATA',
        },
      })
      .promise();

    if (!result.Items || result.Items.length === 0) {
      return { errorType: 'NOT_FOUND', message: 'Household not found' };
    }

    const household = result.Items[0];

    // Soft delete household
    const updated = {
      ...household,
      deletedAt: getCurrentTimestamp(),
      updatedAt: getCurrentTimestamp(),
      _version: household._version + 1,
      _lastChangedAt: Date.now(),
    };

    await putItem(updated);

    // Soft delete all members
    const membersResult = await ddb
      .query({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: {
          ':pk': `HOUSEHOLD#${householdId}`,
          ':sk': 'MEMBER#',
        },
      })
      .promise();

    if (membersResult.Items) {
      for (const member of membersResult.Items) {
        member.deletedAt = getCurrentTimestamp();
        member.updatedAt = getCurrentTimestamp();
        member._version = member._version + 1;
        member._lastChangedAt = Date.now();
        await putItem(member);
      }
    }

    return true;
  } catch (error) {
    console.error('Error deleting household:', error);
    return { errorType: 'MUTATION_ERROR', message: error.message };
  }
};
