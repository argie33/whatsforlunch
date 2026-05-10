// Mutation.createItem resolver
// Creates a new food item in a household

const {
  ddb,
  TABLE_NAME,
  buildCommonAttributes,
  getUserId,
  checkHouseholdMembership,
  putItem,
  logActivity,
} = require('./utils');

exports.handler = async (event) => {
  const context = event.requestContext;
  const input = event.arguments.input;
  const userId = getUserId(event);

  try {
    // Verify user is member of household
    await checkHouseholdMembership(userId, input.householdId);

    // Build item record
    const item = buildCommonAttributes({
      entityType: 'Item',
      PK: `HOUSEHOLD#${input.householdId}`,
      SK: `ITEM#${buildCommonAttributes().id}`,
      id: buildCommonAttributes().id,
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

    // Set GSI keys for various access patterns
    if (input.barcode) {
      item.GSI4PK = `BARCODE#${input.barcode}`;
      item.GSI4SK = `ITEM#${item.id}`;
    }

    // Set expiring items index if within 14 days
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

    // Save to DynamoDB
    await putItem(item);

    // Log activity for audit trail
    await logActivity(
      input.householdId,
      userId,
      'itemCreated',
      'Item',
      item.id,
      {
        foodName: item.foodName,
        storageLocation: item.storageLocation,
        expiryAt: item.expiryAt,
      },
    );

    // Return the created item
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
      photoUrl: item.photoUrl, // Mobile uses photoUrl
      barcode: item.barcode,
      status: item.status,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      _version: item._version,
      _lastChangedAt: item._lastChangedAt,
      hoursUntilExpiry: Math.ceil((new Date(item.expiryAt) - new Date()) / (1000 * 60 * 60)),
      statusColor: 'fresh', // Computed via separate resolver or business logic
    };
  } catch (error) {
    console.error('Error creating item:', error);
    return {
      errorType: 'MUTATION_ERROR',
      message: error.message,
    };
  }
};
