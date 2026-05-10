// Query.listContainers resolver
// List all containers in a household

const {
  ddb,
  TABLE_NAME,
  getUserId,
  checkHouseholdMembership,
} = require('./utils');

exports.handler = async (event) => {
  const userId = getUserId(event);
  const householdId = event.arguments.householdId;
  const includeArchived = event.arguments.includeArchived || false;

  try {
    await checkHouseholdMembership(userId, householdId);

    const result = await ddb
      .query({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: {
          ':pk': `HOUSEHOLD#${householdId}`,
          ':sk': 'CONTAINER#',
        },
      })
      .promise();

    let containers = result.Items || [];

    // Filter out archived containers unless requested
    if (!includeArchived) {
      containers = containers.filter((c) => !c.archivedAt);
    }

    return containers.map(mapContainerToGraphQL);
  } catch (error) {
    console.error('Error listing containers:', error);
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
