// Mutation.markItemPartial resolver
// Mark item as partially consumed (user specifies remaining quantity)

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
  const remainingQuantityText = event.arguments.remainingQuantityText;

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

    const updatedItem = {
      ...item,
      status: 'partial',
      quantityText: remainingQuantityText,
      updatedAt: getCurrentTimestamp(),
      _version: item._version + 1,
      _lastChangedAt: Date.now(),
    };

    await putItem(updatedItem);
    await logItemEvent(item.householdId, itemId, userId, 'markedPartial', {
      remainingQuantity: remainingQuantityText,
    });

    return mapItemToGraphQL(updatedItem);
  } catch (error) {
    console.error('Error marking item partial:', error);
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
    statusColor: 'partial',
  };
}
