// Query.myHouseholds resolver
// Lists all households user is a member of

const { getUserId, query } = require('./utils');

exports.handler = async (event) => {
  const userId = getUserId(event);

  try {
    // Query via GSI1: USER#{userId} -> HOUSEHOLD#{...}
    const households = await query({
      TableName: process.env.DYNAMODB_TABLE_NAME || 'WFL-Main-dev',
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk AND begins_with(GSI1SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `USER#${userId}`,
        ':sk': 'HOUSEHOLD#',
      },
    });

    return households.map(h => ({
      id: h.householdId || h.id,
      name: h.householdName || h.name,
      ownerId: h.ownerId,
      imageUrl: h.imageUrl,
      memberCount: h.memberCount || 0,
      members: h.members || [],
      createdAt: h.createdAt,
      updatedAt: h.updatedAt,
      _version: h._version,
      _lastChangedAt: h._lastChangedAt,
    }));
  } catch (error) {
    console.error('Error fetching households:', error);
    return {
      errorType: 'QUERY_ERROR',
      message: error.message,
    };
  }
};
