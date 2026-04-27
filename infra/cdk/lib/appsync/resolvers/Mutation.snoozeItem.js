// Mutation.snoozeItem resolver
// Temporarily hide item (move expiry forward by N hours)

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
  const hours = event.arguments.hours || 24;

  try {
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
    await checkHouseholdMembership(userId, item.householdId);

    // Extend expiry by snooze duration
    const newExpiry = new Date(item.expiryAt);
    newExpiry.setHours(newExpiry.getHours() + hours);

    const updatedItem = {
      ...item,
      expiryAt: newExpiry.toISOString(),
      updatedAt: getCurrentTimestamp(),
      _version: item._version + 1,
      _lastChangedAt: Date.now(),
    };

    // Update GSI2 index keys
    updatedItem.GSI2PK = `EXPIRING#${item.householdId}`;
    updatedItem.GSI2SK = newExpiry.toISOString();

    await putItem(updatedItem);
    await logItemEvent(item.householdId, itemId, userId, 'snoozed', { hours });

    return mapItemToGraphQL(updatedItem);
  } catch (error) {
    console.error('Error snoozing item:', error);
    return { errorType: 'MUTATION_ERROR', message: error.message };
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
