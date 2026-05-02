// Mutation.bulkUpdateItemStatus resolver
// Batch update status for multiple items (e.g., "mark all expired as tossed")

const {
  ddb,
  TABLE_NAME,
  getUserId,
  checkHouseholdMembership,
  putItem,
  getCurrentTimestamp,
} = require('./utils');

exports.handler = async (event) => {
  const userId = getUserId(event);
  const itemIds = event.arguments.itemIds || [];
  const newStatus = event.arguments.status;

  if (!itemIds || itemIds.length === 0) {
    return { errorType: 'VALIDATION_ERROR', message: 'No items to update' };
  }

  if (!['eaten', 'tossed', 'frozen', 'partial', 'transferred', 'active'].includes(newStatus)) {
    return { errorType: 'VALIDATION_ERROR', message: `Invalid status: ${newStatus}` };
  }

  try {
    const results = [];
    const households = new Set();

    // Fetch all items
    const itemsMap = new Map();
    for (const itemId of itemIds) {
      const items = await ddb
        .query({
          TableName: TABLE_NAME,
          IndexName: 'GSI3',
          KeyConditionExpression: 'GSI3PK = :pk AND begins_with(SK, :sk)',
          ExpressionAttributeValues: {
            ':pk': `USER_ITEMS#${userId}`,
            ':sk': `ITEM#${itemId}`,
          },
        })
        .promise();

      if (items.Items && items.Items.length > 0) {
        itemsMap.set(itemId, items.Items[0]);
        households.add(items.Items[0].householdId);
      }
    }

    // Verify user is member of all households
    for (const householdId of households) {
      await checkHouseholdMembership(userId, householdId);
    }

    // Update all items
    for (const [itemId, item] of itemsMap) {
      const updateObj = {
        ...item,
        status: newStatus,
        updatedAt: getCurrentTimestamp(),
        _version: item._version + 1,
        _lastChangedAt: Date.now(),
      };

      // Set status-specific timestamps
      if (newStatus === 'eaten') updateObj.eatenAt = getCurrentTimestamp();
      if (newStatus === 'tossed') updateObj.tossedAt = getCurrentTimestamp();
      if (newStatus === 'frozen') updateObj.frozenAt = getCurrentTimestamp();

      // Remove from expiring index if status changes
      if (item.GSI2PK) {
        delete updateObj.GSI2PK;
        delete updateObj.GSI2SK;
      }

      await putItem(updateObj);
      results.push(mapItemToGraphQL(updateObj));

      // Log event
      await logItemEvent(
        item.householdId,
        itemId,
        userId,
        `marked${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)}`,
        {},
      );
    }

    return results;
  } catch (error) {
    console.error('Error bulk updating items:', error);
    return {
      errorType: 'MUTATION_ERROR',
      message: error.message,
    };
  }
};

async function logItemEvent(householdId, itemId, userId, eventType, payload) {
  const timestamp = new Date().toISOString();
  await putItem({
    PK: `HOUSEHOLD#${householdId}`,
    SK: `EVENT#${itemId}#${timestamp}`,
    entityType: 'ItemEvent',
    id: require('crypto').randomUUID(),
    itemId,
    actorUserId: userId,
    eventType,
    payload,
    createdAt: timestamp,
  });
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
    photoUrl: item.photoUrl,
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
    statusColor: item.status === 'active' ? computeStatusColor(item.expiryAt) : 'neutral',
  };
}

function computeStatusColor(expiryAt) {
  const hoursUntil = (new Date(expiryAt) - new Date()) / (1000 * 60 * 60);
  if (hoursUntil < 0) return 'expired';
  if (hoursUntil < 24) return 'urgent';
  if (hoursUntil < 72) return 'soon';
  return 'fresh';
}
