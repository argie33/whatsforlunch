// Query.householdActivity resolver
// Fetch activity log for a household with optional actor filter and pagination

const {
  getUserId,
  checkHouseholdMembership,
  query,
  getCurrentEpoch,
} = require('./utils');

exports.handler = async (event) => {
  const userId = getUserId(event);
  const { householdId, actorId, limit = 50, nextToken } = event.arguments;

  try {
    // Verify user is member of household
    await checkHouseholdMembership(userId, householdId);

    // Build query for activities in household
    const params = {
      TableName: process.env.DYNAMODB_TABLE_NAME || 'WFL-Main-dev',
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `HOUSEHOLD#${householdId}`,
        ':sk': 'ACTIVITY#',
      },
      ScanIndexForward: false, // Newest first
      Limit: Math.min(limit, 100), // Cap at 100
    };

    // Optional: Filter by actor
    if (actorId) {
      params.FilterExpression = 'actorId = :actorId';
      params.ExpressionAttributeValues[':actorId'] = actorId;
    }

    // Handle pagination token
    if (nextToken) {
      params.ExclusiveStartKey = JSON.parse(Buffer.from(nextToken, 'base64').toString());
    }

    const result = await query(params);

    // Transform items to API format
    const items = result.items.map((item) => ({
      id: item.id,
      householdId: item.householdId,
      actorId: item.actorId,
      actor: item.actor, // Loaded via resolver @connection
      action: item.action,
      resourceType: item.resourceType,
      resourceId: item.resourceId,
      resourceData: item.resourceData ? JSON.stringify(item.resourceData) : null,
      timestamp: item.timestamp,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      _version: item._version,
      _lastChangedAt: item._lastChangedAt,
    }));

    // Encode next token for pagination
    const nextTokenStr = result.lastEvaluatedKey
      ? Buffer.from(JSON.stringify(result.lastEvaluatedKey)).toString('base64')
      : null;

    return {
      items,
      nextToken: nextTokenStr,
    };
  } catch (error) {
    console.error('Error fetching household activity:', error);
    throw error;
  }
};
