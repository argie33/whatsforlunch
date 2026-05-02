// Mutation.unarchiveContainer resolver
// Restore an archived container to active state

const {
  ddb,
  TABLE_NAME,
  getUserId,
  checkHouseholdMembership,
  putItem,
  getCurrentTimestamp,
} = require('./utils');

exports.handler = async (event) => {
  const userId = getUserId(event);
  const containerId = event.arguments.id;

  try {
    // Find container
    let container = null;
    let householdId = null;

    const result = await ddb
      .scan({
        TableName: TABLE_NAME,
        FilterExpression: 'id = :id AND entityType = :type',
        ExpressionAttributeValues: {
          ':id': containerId,
          ':type': 'Container',
        },
      })
      .promise();

    if (result.Items && result.Items.length > 0) {
      container = result.Items[0];
      householdId = container.householdId;
    }

    if (!container) {
      throw new Error('Resource not found');
    }

    await checkHouseholdMembership(userId, householdId);

    const updated = {
      ...container,
      archivedAt: null,
      updatedAt: getCurrentTimestamp(),
      _version: container._version + 1,
      _lastChangedAt: Date.now(),
    };

    await putItem(updated);

    return mapContainerToGraphQL(updated);
  } catch (error) {
    console.error('Error unarchiving container:', error);
    throw error;
  }
};

function mapContainerToGraphQL(c) {
  return {
    id: c.id,
    qrToken: c.qrToken,
    householdId: c.householdId,
    nickname: c.nickname,
    imageUrl: c.imageUrl,
    claimedAt: c.claimedAt,
    claimedBy: c.claimedBy,
    archivedAt: c.archivedAt,
    currentItem: null,
    history: [],
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    _version: c._version,
    _lastChangedAt: c._lastChangedAt,
  };
}
