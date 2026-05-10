/**
 * AppSync Resolver: Mutation.createItem
 * Creates a new food item in a household
 * Calls checkHouseholdMembership first (in resolver pipeline)
 */

export const request = (ctx) => {
  const input = ctx.args.input;
  const userId = ctx.identity.sub;
  const itemId = util.autoId();
  const now = util.time.nowISO8601();
  const nowMs = Date.now();

  const item = {
    operation: 'PutItem',
    key: {
      PK: { S: `HOUSEHOLD#${input.householdId}` },
      SK: { S: `ITEM#${itemId}` },
    },
    attributeValues: {
      entityType: { S: 'Item' },
      id: { S: itemId },
      householdId: { S: input.householdId },
      containerId: input.containerId ? { S: input.containerId } : { NULL: true },
      addedByUserId: { S: userId },
      foodType: { S: input.foodType },
      foodName: { S: input.foodName },
      category: { S: input.category },
      storageLocation: { S: input.storageLocation },
      quantityText: input.quantityText ? { S: input.quantityText } : { NULL: true },
      quantityValue: input.quantityValue ? { N: String(input.quantityValue) } : { NULL: true },
      quantityUnit: input.quantityUnit ? { S: input.quantityUnit } : { NULL: true },
      storedAt: { S: now },
      storedTz: { S: Intl.DateTimeFormat().resolvedOptions().timeZone },
      expiryAt: { S: input.expiryAt },
      expirySource: { S: input.expirySource },
      expiryConfidence: input.expiryConfidence ? { N: String(input.expiryConfidence) } : { NULL: true },
      notes: input.notes ? { S: input.notes } : { NULL: true },
      photoUrl: input.photoUrl ? { S: input.photoUrl } : { NULL: true },
      barcode: input.barcode ? { S: input.barcode } : { NULL: true },
      priceUsd: input.priceUsd ? { N: String(input.priceUsd) } : { NULL: true },
      nutritionalData: input.nutritionalData ? { M: formatNutritionalData(input.nutritionalData) } : { NULL: true },
      status: { S: 'active' },
      createdAt: { S: now },
      updatedAt: { S: now },
      _version: { N: '1' },
      _lastChangedAt: { N: String(nowMs) },
      clientId: { S: util.autoId() },
      // GSI2: Expiring items (sparse index)
      GSI2PK: { S: `EXPIRING#${input.householdId}` },
      GSI2SK: { S: input.expiryAt },
      // GSI3: Per-user items
      GSI3PK: { S: `USER_ITEMS#${userId}` },
      GSI3SK: { S: now },
      // GSI4: Barcode lookup
      ...(input.barcode && {
        GSI4PK: { S: `BARCODE#${input.barcode}` },
        GSI4SK: { S: `ITEM#${itemId}` },
      }),
    },
  };

  return item;
};

const formatNutritionalData = (data) => {
  const m = {};
  if (data.calories) m.calories = { N: String(data.calories) };
  if (data.protein) m.protein = { N: String(data.protein) };
  if (data.carbs) m.carbs = { N: String(data.carbs) };
  if (data.fat) m.fat = { N: String(data.fat) };
  if (data.fiber) m.fiber = { N: String(data.fiber) };
  if (data.sugar) m.sugar = { N: String(data.sugar) };
  if (data.sodium) m.sodium = { N: String(data.sodium) };
  return m;
};

export const response = (ctx) => {
  if (ctx.error) {
    return util.error('Failed to create item', 'INTERNAL_ERROR');
  }
  // Parse the stored item back to return to client
  const result = ctx.result;
  return {
    id: result.id?.S,
    householdId: result.householdId?.S,
    foodName: result.foodName?.S,
    foodType: result.foodType?.S,
    category: result.category?.S,
    storageLocation: result.storageLocation?.S,
    expiryAt: result.expiryAt?.S,
    expirySource: result.expirySource?.S,
    status: result.status?.S,
    createdAt: result.createdAt?.S,
    updatedAt: result.updatedAt?.S,
    _version: parseInt(result._version?.N || '1'),
    _lastChangedAt: parseInt(result._lastChangedAt?.N || '0'),
  };
};
