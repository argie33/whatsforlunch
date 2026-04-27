// Query.getContainerByQrToken resolver
// Get container by QR token for claiming/linking

const {
  ddb,
  TABLE_NAME,
  getUserId,
} = require('./utils');

exports.handler = async (event) => {
  const qrToken = event.arguments.qrToken;

  try {
    // Query by GSI4 (QR_TOKEN lookup)
    const result = await ddb
      .query({
        TableName: TABLE_NAME,
        IndexName: 'GSI4',
        KeyConditionExpression: 'GSI4PK = :pk AND GSI4SK = :sk',
        ExpressionAttributeValues: {
          ':pk': `QR_TOKEN#${qrToken}`,
          ':sk': 'CONTAINER',
        },
      })
      .promise();

    if (!result.Items || result.Items.length === 0) {
      return null;
    }

    const container = result.Items[0];
    return mapContainerToGraphQL(container);
  } catch (error) {
    console.error('Error getting container by QR token:', error);
    return { errorType: 'QUERY_ERROR', message: error.message };
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
