// Query.listExpiringItems resolver
// List items expiring within N days (default 14)

const {
  ddb,
  TABLE_NAME,
  getUserId,
  checkHouseholdMembership,
} = require('./utils');

exports.handler = async (event) => {
  const userId = getUserId(event);
  const householdId = event.arguments.householdId;
  const days = event.arguments.days || 14;

  try {
    await checkHouseholdMembership(userId, householdId);

    // Query GSI2 (EXPIRING index)
    const futureDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

    const result = await ddb
      .query({
        TableName: TABLE_NAME,
        IndexName: 'GSI2',
        KeyConditionExpression: 'GSI2PK = :pk AND GSI2SK <= :sk',
        ExpressionAttributeValues: {
          ':pk': `EXPIRING#${householdId}`,
          ':sk': futureDate,
        },
        ScanIndexForward: true, // Sort ascending by expiry date
      })
      .promise();

    let items = result.Items || [];

    // Filter out deleted and non-active items
    items = items.filter((i) => !i.deletedAt && i.status === 'active');

    // Sort by expiry date ascending (most urgent first)
    items.sort((a, b) => new Date(a.expiryAt) - new Date(b.expiryAt));

    return items.map(mapItemToGraphQL);
  } catch (error) {
    console.error('Error listing expiring items:', error);
    return { errorType: 'QUERY_ERROR', message: error.message };
  }
};

function mapItemToGraphQL(item) {
  const now = Date.now();
  const expiryAtMs = new Date(item.expiryAt).getTime();
  const hoursUntilExpiry = Math.max(0, Math.floor((expiryAtMs - now) / (1000 * 60 * 60)));

  let statusColor = 'green';
  if (item.status === 'eaten' || item.status === 'tossed') {
    statusColor = 'gray';
  } else if (hoursUntilExpiry === 0) {
    statusColor = 'red';
  } else if (hoursUntilExpiry <= 24) {
    statusColor = 'orange';
  } else if (hoursUntilExpiry <= 72) {
    statusColor = 'yellow';
  }

  return {
    id: item.id,
    householdId: item.householdId,
    containerId: item.containerId,
    foodType: item.foodType,
    quantity: item.quantity,
    quantityUnit: item.quantityUnit,
    status: item.status,
    expiryAt: item.expiryAt,
    hoursUntilExpiry,
    statusColor,
    storageLocation: item.storageLocation,
    purchasedAt: item.purchasedAt,
    notes: item.notes,
    barcode: item.barcode,
    photoUrl: item.photoUrl,
    createdByUserId: item.createdByUserId,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    _version: item._version,
    _lastChangedAt: item._lastChangedAt,
  };
}
