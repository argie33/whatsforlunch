// Mutation.updateItem resolver
// Updates an existing item with optimistic concurrency

const {
  ddb,
  TABLE_NAME,
  getUserId,
  checkHouseholdMembership,
  getCurrentTimestamp,
} = require('./utils');

exports.handler = async (event) => {
  const userId = getUserId(event);
  const input = event.arguments.input;

  try {
    // Find item
    const items = await ddb
      .query({
        TableName: TABLE_NAME,
        IndexName: 'GSI3',
        KeyConditionExpression: 'GSI3PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: {
          ':pk': `USER_ITEMS#${userId}`,
          ':sk': `ITEM#${input.id}`,
        },
      })
      .promise();

    if (!items.Items || items.Items.length === 0) {
      return { errorType: 'NOT_FOUND', message: 'Item not found' };
    }

    const item = items.Items[0];
    await checkHouseholdMembership(userId, item.householdId);

    // Build update expression
    const updates = {};
    if (input.foodType) updates.foodType = input.foodType;
    if (input.foodName) updates.foodName = input.foodName;
    if (input.storageLocation) updates.storageLocation = input.storageLocation;
    if (input.expiryAt) updates.expiryAt = input.expiryAt;
    if (input.quantityText !== undefined) updates.quantityText = input.quantityText;
    if (input.quantityValue !== undefined) updates.quantityValue = input.quantityValue;
    if (input.quantityUnit !== undefined) updates.quantityUnit = input.quantityUnit;
    if (input.notes !== undefined) updates.notes = input.notes;
    if (input.photoUrl !== undefined) updates.photoUrl = input.photoUrl;

    const updateExpr = Object.keys(updates)
      .map((k, i) => `#${k} = :${k}`)
      .join(', ');

    if (!updateExpr) {
      return { errorType: 'VALIDATION_ERROR', message: 'No fields to update' };
    }

    const params = {
      TableName: TABLE_NAME,
      Key: { PK: item.PK, SK: item.SK },
      UpdateExpression: `SET ${updateExpr}, #updatedAt = :now, #version = #version + :inc`,
      ExpressionAttributeNames: {
        ...Object.fromEntries(Object.keys(updates).map((k) => [`#${k}`, k])),
        '#updatedAt': 'updatedAt',
        '#version': '_version',
      },
      ExpressionAttributeValues: {
        ...Object.fromEntries(Object.entries(updates).map(([k, v]) => [`:${k}`, v])),
        ':now': getCurrentTimestamp(),
        ':inc': 1,
        ':expectedVersion': input.expectedVersion,
      },
      ConditionExpression: '#version = :expectedVersion',
      ReturnValues: 'ALL_NEW',
    };

    try {
      const result = await ddb.update(params).promise();
      return mapItemToGraphQL(result.Attributes);
    } catch (error) {
      if (error.code === 'ConditionalCheckFailedException') {
        return { errorType: 'CONFLICT', message: 'Item was modified (version mismatch)' };
      }
      throw error;
    }
  } catch (error) {
    console.error('Error updating item:', error);
    return { errorType: 'MUTATION_ERROR', message: error.message };
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
    statusColor: computeStatusColor(item.expiryAt, item.status),
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
