// Query.listItems resolver
// Lists items in a household, optionally filtered by status and location

const {
  ddb,
  TABLE_NAME,
  getUserId,
  checkHouseholdMembership,
  query,
} = require('./utils');

exports.handler = async (event) => {
  const userId = getUserId(event);
  const householdId = event.arguments.householdId;
  const status = event.arguments.status;
  const location = event.arguments.location;

  try {
    // Verify user is member of household
    await checkHouseholdMembership(userId, householdId);

    // Query all items in household
    const params = {
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `HOUSEHOLD#${householdId}`,
        ':sk': 'ITEM#',
      },
    };

    let items = await query(params);

    // Filter out soft-deleted items
    items = items.filter(item => !item.deletedAt);

    // Apply status filter if provided
    if (status) {
      items = items.filter(item => item.status === status);
    }

    // Apply location filter if provided
    if (location) {
      items = items.filter(item => item.storageLocation === location);
    }

    // Sort by stored date descending
    items.sort((a, b) => new Date(b.storedAt) - new Date(a.storedAt));

    // Map DB records to GraphQL responses
    return items.map(item => ({
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
      statusColor: computeStatusColor(item.expiryAt, item.status),
    }));
  } catch (error) {
    console.error('Error listing items:', error);
    return {
      errorType: 'QUERY_ERROR',
      message: error.message,
    };
  }
};

function computeStatusColor(expiryAt, status) {
  if (status !== 'active') {
    return 'neutral';
  }

  const now = new Date();
  const expiry = new Date(expiryAt);
  const hoursUntil = (expiry - now) / (1000 * 60 * 60);

  if (hoursUntil < 0) return 'expired';
  if (hoursUntil < 24) return 'urgent';
  if (hoursUntil < 72) return 'soon';
  return 'fresh';
}
