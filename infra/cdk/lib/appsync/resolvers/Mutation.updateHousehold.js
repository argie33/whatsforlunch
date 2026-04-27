// Mutation.updateHousehold resolver
// Update household metadata (owner only)

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
  const input = event.arguments.input;
  const householdId = input.id;

  try {
    // Verify user is owner
    await checkHouseholdOwner(userId, householdId);

    // Get current household
    const result = await ddb
      .get({
        TableName: TABLE_NAME,
        Key: {
          PK: `HOUSEHOLD#${householdId}`,
          SK: 'META',
        },
      })
      .promise();

    if (!result.Item) {
      return { errorType: 'NOT_FOUND', message: 'Household not found' };
    }

    const household = result.Item;

    // Verify version match
    if (input.expectedVersion !== household._version) {
      return { errorType: 'CONFLICT', message: 'Household was modified' };
    }

    // Update fields
    const updated = {
      ...household,
      name: input.name || household.name,
      imageUrl: input.imageUrl !== undefined ? input.imageUrl : household.imageUrl,
      updatedAt: getCurrentTimestamp(),
      _version: household._version + 1,
      _lastChangedAt: Date.now(),
    };

    await putItem(updated);

    return mapHouseholdToGraphQL(updated);
  } catch (error) {
    console.error('Error updating household:', error);
    return { errorType: 'MUTATION_ERROR', message: error.message };
  }
};

function mapHouseholdToGraphQL(h) {
  return {
    id: h.id,
    name: h.name,
    ownerId: h.ownerId,
    imageUrl: h.imageUrl,
    memberCount: h.memberCount || 1,
    members: h.members || [],
    createdAt: h.createdAt,
    updatedAt: h.updatedAt,
    _version: h._version,
    _lastChangedAt: h._lastChangedAt,
  };
}
