// Mutation.markItemEaten resolver
// Marks an item as eaten and records timestamp

const {
  ddb,
  TABLE_NAME,
  getUserId,
  checkHouseholdMembership,
  getItem,
  putItem,
  getCurrentTimestamp,
  logActivity,
} = require('./utils');

exports.handler = async (event) => {
  const userId = getUserId(event);
  const itemId = event.arguments.id;
  const atTimestamp = event.arguments.atTimestamp || getCurrentTimestamp();

  try {
    // Get the item to find its household
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

    if (!items.Items || items.Items.length === 0) {
      throw new Error('Item not found');
    }

    const item = items.Items[0];
    const householdId = item.householdId;

    // Verify user is member of household
    await checkHouseholdMembership(userId, householdId);

    // Update item status
    const updatedItem = {
      ...item,
      status: 'eaten',
      eatenAt: atTimestamp,
      updatedAt: getCurrentTimestamp(),
      _version: item._version + 1,
      _lastChangedAt: Date.now(),
    };

    // If item was in expiring index, remove it
    if (item.GSI2PK) {
      delete updatedItem.GSI2PK;
      delete updatedItem.GSI2SK;
    }

    await putItem(updatedItem);

    // Log activity for audit trail
    await logActivity(householdId, userId, 'itemEaten', 'Item', itemId, {
      eatenAt: atTimestamp,
      foodName: item.foodName,
    });

    // Log the event
    await logItemEvent(householdId, itemId, userId, 'markedEaten', { timestamp: atTimestamp });

    // Return updated item
    return mapItemToGraphQL(updatedItem);
  } catch (error) {
    console.error('Error marking item eaten:', error);
    throw error;
  }
};

async function logItemEvent(householdId, itemId, userId, eventType, payload) {
  const timestamp = new Date().toISOString();
  const event = {
    PK: `HOUSEHOLD#${householdId}`,
    SK: `EVENT#${itemId}#${timestamp}`,
    entityType: 'ItemEvent',
    id: generateUUID(),
    itemId,
    actorUserId: userId,
    eventType,
    payload,
    createdAt: timestamp,
  };
  await putItem(event);
}

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
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
    statusColor: 'eaten',
  };
}
