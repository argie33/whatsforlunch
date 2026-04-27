// Query.deltaSync resolver
// Core sync operation: return changes since last sync timestamp
// Used by WatermelonDB sync engine (W8)

const { getUserId, checkHouseholdMembership, ddb, TABLE_NAME } = require('./utils');

exports.handler = async (event) => {
  const userId = getUserId(event);
  const input = event.arguments.input;
  const householdId = input.householdId;
  const lastSyncTimestamp = input.lastSyncTimestamp || new Date(0).toISOString();

  try {
    await checkHouseholdMembership(userId, householdId);

    const serverTimestamp = new Date().toISOString();

    // Fetch all entities in household that changed since last sync
    const [containers, items, shoppingList] = await Promise.all([
      fetchChangedContainers(householdId, lastSyncTimestamp),
      fetchChangedItems(householdId, lastSyncTimestamp),
      fetchChangedShoppingItems(householdId, lastSyncTimestamp),
    ]);

    return {
      containers: containers.map(mapContainerToGraphQL),
      items: items.map(mapItemToGraphQL),
      shoppingList: shoppingList.map(mapShoppingListItemToGraphQL),
      serverTimestamp,
    };
  } catch (error) {
    console.error('Error in deltaSync:', error);
    return {
      errorType: 'QUERY_ERROR',
      message: error.message,
    };
  }
};

async function fetchChangedContainers(householdId, lastSyncTimestamp) {
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

  return (result.Items || []).filter(item => {
    const changed = Math.max(
      new Date(item.updatedAt).getTime(),
      item._lastChangedAt || 0
    );
    return new Date(lastSyncTimestamp).getTime() < changed;
  });
}

async function fetchChangedItems(householdId, lastSyncTimestamp) {
  const result = await ddb
    .query({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `HOUSEHOLD#${householdId}`,
        ':sk': 'ITEM#',
      },
    })
    .promise();

  return (result.Items || []).filter(item => {
    const changed = Math.max(
      new Date(item.updatedAt).getTime(),
      item._lastChangedAt || 0
    );
    return new Date(lastSyncTimestamp).getTime() < changed;
  });
}

async function fetchChangedShoppingItems(householdId, lastSyncTimestamp) {
  const result = await ddb
    .query({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `HOUSEHOLD#${householdId}`,
        ':sk': 'SHOP#',
      },
    })
    .promise();

  return (result.Items || []).filter(item => {
    const changed = Math.max(
      new Date(item.updatedAt).getTime(),
      item._lastChangedAt || 0
    );
    return new Date(lastSyncTimestamp).getTime() < changed;
  });
}

function mapContainerToGraphQL(item) {
  return {
    id: item.id,
    qrToken: item.qrToken,
    householdId: item.householdId,
    nickname: item.nickname,
    imageUrl: item.imageUrl,
    claimedAt: item.claimedAt,
    claimedBy: item.claimedBy,
    archivedAt: item.archivedAt,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    _version: item._version,
    _lastChangedAt: item._lastChangedAt,
  };
}

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
    statusColor: computeStatusColor(item.expiryAt, item.status),
  };
}

function mapShoppingListItemToGraphQL(item) {
  return {
    id: item.id,
    householdId: item.householdId,
    name: item.name,
    quantity: item.quantity,
    category: item.category,
    notes: item.notes,
    addedByUserId: item.addedByUserId,
    purchasedAt: item.purchasedAt,
    purchasedByUserId: item.purchasedByUserId,
    autoSuggested: item.autoSuggested || false,
    linkedFoodType: item.linkedFoodType,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

function computeStatusColor(expiryAt, status) {
  if (status !== 'active') return 'neutral';
  const hoursUntil = (new Date(expiryAt) - new Date()) / (1000 * 60 * 60);
  if (hoursUntil < 0) return 'expired';
  if (hoursUntil < 24) return 'urgent';
  if (hoursUntil < 72) return 'soon';
  return 'fresh';
}
