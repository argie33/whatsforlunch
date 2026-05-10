// Query.getHousehold resolver
// Get household details by ID

const {
  ddb,
  TABLE_NAME,
  getUserId,
  checkHouseholdMembership,
} = require('./utils');

exports.handler = async (event) => {
  const userId = getUserId(event);
  const householdId = event.arguments.id;

  try {
    await checkHouseholdMembership(userId, householdId);

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
      return null;
    }

    const household = result.Items[0];
    return mapHouseholdToGraphQL(household);
  } catch (error) {
    console.error('Error getting household:', error);
    throw error;
  }
};

function mapHouseholdToGraphQL(h) {
  return {
    id: h.id,
    name: h.name,
    imageUrl: h.imageUrl,
    ownerId: h.ownerId,
    createdAt: h.createdAt,
    updatedAt: h.updatedAt,
    _version: h._version,
    _lastChangedAt: h._lastChangedAt,
  };
}
