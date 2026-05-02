// Mutation.bulkCreateItems resolver
// Batch create multiple items (e.g., from receipt OCR or barcode scanner)

const { buildCommonAttributes, getUserId, checkHouseholdMembership, putItem } = require('./utils');

exports.handler = async (event) => {
  const userId = getUserId(event);
  const items = event.arguments.items || [];

  if (!items || items.length === 0) {
    throw new Error('No items to create');
  }

  try {
    const results = [];

    for (const input of items) {
      // Verify user is member of household
      await checkHouseholdMembership(userId, input.householdId);

      const itemId = buildCommonAttributes().id;

      const item = buildCommonAttributes({
        entityType: 'Item',
        PK: `HOUSEHOLD#${input.householdId}`,
        SK: `ITEM#${itemId}`,
        id: itemId,
        householdId: input.householdId,
        containerId: input.containerId || null,
        addedByUserId: userId,
        foodType: input.foodType,
        foodName: input.foodName,
        category: input.category || 'prepared',
        storageLocation: input.storageLocation,
        quantityText: input.quantityText || null,
        quantityValue: input.quantityValue || null,
        quantityUnit: input.quantityUnit || null,
        storedAt: input.storedAt,
        storedTz: input.storedTz,
        expiryAt: input.expiryAt,
        expirySource: input.expirySource,
        expiryConfidence: input.expiryConfidence || null,
        notes: input.notes || null,
        photoUrl: input.photoUrl || null,
        barcode: input.barcode || null,
        priceUsd: input.priceUsd || null,
        status: 'active',
        eatenAt: null,
        tossedAt: null,
        frozenAt: null,
        transferredToContainerId: null,
        deletedAt: null,
        clientId: input.clientId,
      });

      // Set barcode GSI if present
      if (input.barcode) {
        item.GSI4PK = `BARCODE#${input.barcode}`;
        item.GSI4SK = `ITEM#${item.id}`;
      }

      // Set expiring index if within 14 days
      const expiryDate = new Date(input.expiryAt);
      const twoWeeksFromNow = new Date();
      twoWeeksFromNow.setDate(twoWeeksFromNow.getDate() + 14);
      if (expiryDate <= twoWeeksFromNow) {
        item.GSI2PK = `EXPIRING#${input.householdId}`;
        item.GSI2SK = input.expiryAt;
      }

      // Add to user items index
      item.GSI3PK = `USER_ITEMS#${userId}`;
      item.GSI3SK = item.storedAt;

      // Save
      await putItem(item);

      results.push(mapItemToGraphQL(item));
    }

    return results;
  } catch (error) {
    console.error('Error bulk creating items:', error);
    return {
      errorType: 'MUTATION_ERROR',
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
    photoUrl: item.photoUrl,
    barcode: item.barcode,
    status: item.status,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    _version: item._version,
    _lastChangedAt: item._lastChangedAt,
    hoursUntilExpiry: Math.ceil((new Date(item.expiryAt) - new Date()) / (1000 * 60 * 60)),
    statusColor: 'fresh',
  };
}
