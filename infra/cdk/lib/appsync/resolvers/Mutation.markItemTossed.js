// Mutation.markItemTossed resolver
// Marks an item as tossed/discarded

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
  const itemId = event.arguments.id;
  const atTimestamp = event.arguments.atTimestamp || getCurrentTimestamp();

  try {
    // Query to find item
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
      return { errorType: 'NOT_FOUND', message: 'Item not found' };
    }

    const item = items.Items[0];
    const householdId = item.householdId;

    await checkHouseholdMembership(userId, householdId);

    const updatedItem = {
      ...item,
      status: 'tossed',
      tossedAt: atTimestamp,
      updatedAt: getCurrentTimestamp(),
      _version: item._version + 1,
      _lastChangedAt: Date.now(),
    };

    // Remove from expiring index
    if (item.GSI2PK) {
      delete updatedItem.GSI2PK;
      delete updatedItem.GSI2SK;
    }

    await putItem(updatedItem);
    await logItemEvent(householdId, itemId, userId, 'markedTossed', { timestamp: atTimestamp });

    return mapItemToGraphQL(updatedItem);
  } catch (error) {
    console.error('Error marking item tossed:', error);
    return { errorType: 'MUTATION_ERROR', message: error.message };
  }
};

async function logItemEvent(householdId, itemId, userId, eventType, payload) {
  const timestamp = new Date().toISOString();
  const event = {
    PK: `HOUSEHOLD#${householdId}`,
    SK: `EVENT#${itemId}#${timestamp}`,
    entityType: 'ItemEvent',
    id: require('crypto').randomUUID(),
    itemId,
    actorUserId: userId,
    eventType,
    payload,
    createdAt: timestamp,
  };
  await putItem(event);
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
    statusColor: 'tossed',
  };
}
