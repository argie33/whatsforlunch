// Query.itemsExpiringSoon resolver
// Get items expiring within N hours via GSI2 sparse index

const { getUserId, checkHouseholdMembership, ddb, TABLE_NAME } = require('./utils');

exports.handler = async (event) => {
  const userId = getUserId(event);
  const householdId = event.arguments.householdId;
  const withinHours = event.arguments.withinHours || 168; // default 1 week

  try {
    await checkHouseholdMembership(userId, householdId);

    const now = new Date();
    const expiryWindow = new Date(now.getTime() + withinHours * 60 * 60 * 1000);

    // Query GSI2: EXPIRING#{householdId} sorted by date
    const result = await ddb
      .query({
        TableName: TABLE_NAME,
        IndexName: 'GSI2',
        KeyConditionExpression: 'GSI2PK = :pk AND GSI2SK BETWEEN :now AND :future',
        ExpressionAttributeValues: {
          ':pk': `EXPIRING#${householdId}`,
          ':now': now.toISOString(),
          ':future': expiryWindow.toISOString(),
        },
      })
      .promise();

    const items = result.Items || [];

    // Sort by expiry date ascending (most urgent first)
    items.sort((a, b) => new Date(a.expiryAt) - new Date(b.expiryAt));

    return items.map(mapItemToGraphQL);
  } catch (error) {
    console.error('Error fetching expiring items:', error);
    return {
      errorType: 'QUERY_ERROR',
      message: error.message,
    };
  }
};

function mapItemToGraphQL(item) {
  return {
    id: item.id,
    householdId: item.householdId,
    containerId: item.containerId,
    addedByUserId: item.addedByUserId,
    foodType: item.foodType,
    foodName: item.foodName,
    category: item.category,
    storageLocation: item.storageLocation,
    quantityText: item.quantityText,
    quantityValue: item.quantityValue,
    quantityUnit: item.quantityUnit,
    storedAt: item.storedAt,
    storedTz: item.storedTz,
    expiryAt: item.expiryAt,
    expirySource: item.expirySource,
    expiryConfidence: item.expiryConfidence,
    notes: item.notes,
    photoUrl: item.photoPath,
    barcode: item.barcode,
    barcodeData: item.barcodeData,
    priceUsd: item.priceUsd,
    nutritionalData: item.nutritionalData,
    status: item.status,
    eatenAt: item.eatenAt,
    tossedAt: item.tossedAt,
    frozenAt: item.frozenAt,
    transferredToContainerId: item.transferredToContainerId,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    deletedAt: item.deletedAt,
    _version: item._version,
    _lastChangedAt: item._lastChangedAt,
    hoursUntilExpiry: Math.ceil((new Date(item.expiryAt) - new Date()) / (1000 * 60 * 60)),
    statusColor: computeStatusColor(item.expiryAt),
  };
}

function computeStatusColor(expiryAt) {
  const hoursUntil = (new Date(expiryAt) - new Date()) / (1000 * 60 * 60);
  if (hoursUntil < 0) return 'expired';
  if (hoursUntil < 24) return 'urgent';
  if (hoursUntil < 72) return 'soon';
  return 'fresh';
}
