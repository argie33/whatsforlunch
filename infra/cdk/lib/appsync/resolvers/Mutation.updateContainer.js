// Mutation.updateContainer resolver
// Update container name and image

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
  const input = event.arguments.input;

  try {
    await checkHouseholdMembership(userId, input.householdId);

    // Find container
    const result = await ddb
      .scan({
        TableName: TABLE_NAME,
        FilterExpression: 'id = :id AND entityType = :type',
        ExpressionAttributeValues: {
          ':id': input.containerId,
          ':type': 'Container',
        },
      })
      .promise();

    if (!result.Items || result.Items.length === 0) {
      return { errorType: 'NOT_FOUND', message: 'Container not found' };
    }

    const container = result.Items[0];

    const updated = {
      ...container,
      nickname: input.nickname !== undefined ? input.nickname : container.nickname,
      imageUrl: input.imageUrl !== undefined ? input.imageUrl : container.imageUrl,
      updatedAt: getCurrentTimestamp(),
      _version: container._version + 1,
      _lastChangedAt: Date.now(),
    };

    await putItem(updated);

    return mapContainerToGraphQL(updated);
  } catch (error) {
    console.error('Error updating container:', error);
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
