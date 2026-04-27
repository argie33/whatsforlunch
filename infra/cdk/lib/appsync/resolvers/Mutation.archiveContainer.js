// Mutation.archiveContainer resolver
// Soft-archive a container (hide it but keep data)

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
      return { errorType: 'NOT_FOUND', message: 'Container not found' };
    }

    await checkHouseholdMembership(userId, householdId);

    const updated = {
      ...container,
      archivedAt: getCurrentTimestamp(),
      updatedAt: getCurrentTimestamp(),
      _version: container._version + 1,
      _lastChangedAt: Date.now(),
    };

    await putItem(updated);

    return mapContainerToGraphQL(updated);
  } catch (error) {
    console.error('Error archiving container:', error);
    return { errorType: 'MUTATION_ERROR', message: error.message };
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
