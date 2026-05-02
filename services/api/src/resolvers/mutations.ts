import { v4 as uuidv4 } from 'uuid';
import { buildAttrs, putItem, updateItem as dbUpdate, nowIso, nowMs } from '../db';

// ─── Item mutations ───────────────────────────────────────────────────────────

export async function createItem(
  _: unknown,
  { input }: { input: Record<string, unknown> },
  ctx: { userId: string },
) {
  const id = (input.clientId as string) || uuidv4();
  const householdId = input.householdId as string;

  const item = buildAttrs({
    PK: `HOUSEHOLD#${householdId}`,
    SK: `ITEM#${id}`,
    entityType: 'Item',
    id,
    householdId,
    addedByUserId: ctx.userId,
    containerId: input.containerId ?? null,
    foodType: input.foodType,
    foodName: input.foodName,
    category: input.category ?? 'prepared',
    storageLocation: input.storageLocation,
    quantityText: input.quantityText ?? null,
    quantityValue: input.quantityValue ?? null,
    quantityUnit: input.quantityUnit ?? null,
    storedAt: input.storedAt,
    storedTz: input.storedTz,
    expiryAt: input.expiryAt,
    expirySource: input.expirySource,
    expiryConfidence: input.expiryConfidence ?? null,
    notes: input.notes ?? null,
    photoPath: input.photoPath ?? null,
    barcode: input.barcode ?? null,
    priceUsd: input.priceUsd ?? null,
    status: 'active',
    eatenAt: null,
    tossedAt: null,
    frozenAt: null,
    transferredToContainerId: null,
    deletedAt: null,
    clientId: id,
  });

  await putItem(item);

  return {
    ...item,
    photoUrl: item.photoPath,
    hoursUntilExpiry: Math.ceil(
      (new Date(item.expiryAt as string).getTime() - Date.now()) / 3_600_000,
    ),
    statusColor: 'fresh',
  };
}

export async function updateItem(
  _: unknown,
  { input }: { input: Record<string, unknown> & { id: string; householdId: string } },
) {
  const pk = `HOUSEHOLD#${input.householdId}`;
  const sk = `ITEM#${input.id}`;

  const fields: Record<string, unknown> = {};
  const allowed = [
    'foodType',
    'foodName',
    'storageLocation',
    'expiryAt',
    'quantityText',
    'quantityValue',
    'quantityUnit',
    'notes',
    'photoPath',
  ];
  allowed.forEach((f) => {
    if (input[f] !== undefined) fields[f] = input[f];
  });

  const updated = await dbUpdate(pk, sk, fields);
  if (!updated) throw new Error('Item not found');
  return { ...updated, photoUrl: updated.photoPath };
}

export async function deleteItem(
  _: unknown,
  { id, householdId }: { id: string; householdId: string },
) {
  await dbUpdate(`HOUSEHOLD#${householdId}`, `ITEM#${id}`, { deletedAt: nowIso() });
  return true;
}

export async function markItemEaten(
  _: unknown,
  { id, householdId }: { id: string; householdId: string },
) {
  return dbUpdate(`HOUSEHOLD#${householdId}`, `ITEM#${id}`, {
    status: 'eaten',
    eatenAt: nowIso(),
  });
}

export async function markItemTossed(
  _: unknown,
  { id, householdId }: { id: string; householdId: string },
) {
  return dbUpdate(`HOUSEHOLD#${householdId}`, `ITEM#${id}`, {
    status: 'tossed',
    tossedAt: nowIso(),
  });
}

export async function markItemFrozen(
  _: unknown,
  { id, householdId }: { id: string; householdId: string },
) {
  return dbUpdate(`HOUSEHOLD#${householdId}`, `ITEM#${id}`, {
    status: 'frozen',
    frozenAt: nowIso(),
  });
}

export async function markItemPartial(
  _: unknown,
  {
    id,
    householdId,
    input,
  }: {
    id: string;
    householdId: string;
    input: { quantityText: string; quantityValue?: number; quantityUnit?: string };
  },
) {
  return dbUpdate(`HOUSEHOLD#${householdId}`, `ITEM#${id}`, {
    status: 'partial',
    quantityText: input.quantityText,
    ...(input.quantityValue != null ? { quantityValue: input.quantityValue } : {}),
    ...(input.quantityUnit ? { quantityUnit: input.quantityUnit } : {}),
  });
}

// ─── Container mutations ──────────────────────────────────────────────────────

export async function claimContainer(
  _: unknown,
  { input }: { input: { householdId: string; qrToken: string; nickname?: string } },
  ctx: { userId: string },
) {
  const id = uuidv4();
  const { householdId, qrToken, nickname } = input;

  const container = buildAttrs({
    PK: `HOUSEHOLD#${householdId}`,
    SK: `CONTAINER#${id}`,
    entityType: 'Container',
    id,
    householdId,
    qrToken,
    nickname: nickname ?? null,
    imageUrl: null,
    claimedAt: nowIso(),
    claimedBy: ctx.userId,
    archivedAt: null,
    deletedAt: null,
  });

  await putItem(container);
  return container;
}

export async function createContainer(
  _: unknown,
  { input }: { input: { householdId: string; nickname?: string; imageUrl?: string } },
  ctx: { userId: string },
) {
  const id = uuidv4();
  const { householdId } = input;

  const container = buildAttrs({
    PK: `HOUSEHOLD#${householdId}`,
    SK: `CONTAINER#${id}`,
    entityType: 'Container',
    id,
    householdId,
    qrToken: uuidv4(),
    nickname: input.nickname ?? null,
    imageUrl: input.imageUrl ?? null,
    claimedAt: nowIso(),
    claimedBy: ctx.userId,
    archivedAt: null,
    deletedAt: null,
  });

  await putItem(container);
  return container;
}

export async function updateContainer(
  _: unknown,
  {
    input,
  }: { input: { containerId: string; householdId: string; nickname?: string; imageUrl?: string } },
) {
  const { containerId, householdId, ...fields } = input;
  const allowed: Record<string, unknown> = {};
  if (fields.nickname !== undefined) allowed.nickname = fields.nickname;
  if (fields.imageUrl !== undefined) allowed.imageUrl = fields.imageUrl;

  const updated = await dbUpdate(`HOUSEHOLD#${householdId}`, `CONTAINER#${containerId}`, allowed);
  if (!updated) throw new Error('Container not found');
  return updated;
}

export async function archiveContainer(
  _: unknown,
  { input }: { input: { containerId: string; householdId: string } },
) {
  const updated = await dbUpdate(
    `HOUSEHOLD#${input.householdId}`,
    `CONTAINER#${input.containerId}`,
    { archivedAt: nowIso() },
  );
  if (!updated) throw new Error('Container not found');
  return updated;
}

// ─── Household mutations ──────────────────────────────────────────────────────

export async function createHousehold(
  _: unknown,
  { input }: { input: { name: string; imageUrl?: string } },
  ctx: { userId: string },
) {
  const id = uuidv4();
  const now = nowIso();

  const household = buildAttrs({
    PK: `HOUSEHOLD#${id}`,
    SK: 'META',
    entityType: 'Household',
    id,
    name: input.name,
    imageUrl: input.imageUrl ?? null,
    ownerId: ctx.userId,
    memberCount: 1,
    createdAt: now,
    updatedAt: now,
  });

  const member = buildAttrs({
    PK: `HOUSEHOLD#${id}`,
    SK: `MEMBER#${ctx.userId}`,
    entityType: 'HouseholdMember',
    userId: ctx.userId,
    householdId: id,
    role: 'owner',
    joinedAt: now,
  });

  await Promise.all([putItem(household), putItem(member)]);

  return { ...household, members: [member] };
}

export async function renameHousehold(
  _: unknown,
  { input }: { input: { householdId: string; name: string } },
) {
  const updated = await dbUpdate(`HOUSEHOLD#${input.householdId}`, 'META', {
    name: input.name,
    updatedAt: nowIso(),
  });
  if (!updated) throw new Error('Household not found');
  return updated;
}

export async function inviteHouseholdMember(
  _: unknown,
  { input }: { input: { householdId: string; email: string; role: string } },
  ctx: { userId: string },
) {
  const id = uuidv4();
  const now = nowIso();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const invite = buildAttrs({
    PK: `HOUSEHOLD#${input.householdId}`,
    SK: `INVITE#${id}`,
    entityType: 'HouseholdInvite',
    id,
    householdId: input.householdId,
    inviteEmail: input.email,
    invitedByUserId: ctx.userId,
    role: input.role || 'member',
    token: Math.random().toString(36).slice(2, 10),
    createdAt: now,
    expiresAt,
  });

  await putItem(invite);

  return {
    id,
    householdId: input.householdId,
    inviteEmail: input.email,
    role: input.role || 'member',
    createdAt: now,
  };
}

export async function removeHouseholdMember(
  _: unknown,
  { input }: { input: { householdId: string; userId: string } },
) {
  // Soft delete or just remove the member record
  const updated = await dbUpdate(`HOUSEHOLD#${input.householdId}`, `MEMBER#${input.userId}`, {
    deletedAt: nowIso(),
  });
  if (!updated) throw new Error('Member not found');
  return true;
}

// ─── Shopping list mutations ──────────────────────────────────────────────────

export async function addShoppingListItem(
  _: unknown,
  { input }: { input: Record<string, unknown> },
  ctx: { userId: string },
) {
  const id = uuidv4();
  const now = nowIso();

  const item = buildAttrs({
    PK: `HOUSEHOLD#${input.householdId}`,
    SK: `SHOP#${id}`,
    entityType: 'ShoppingListItem',
    id,
    householdId: input.householdId,
    name: input.name,
    quantity: (input.quantity as string) ?? null,
    category: (input.category as string) ?? null,
    notes: (input.notes as string) ?? null,
    addedByUserId: ctx.userId,
    purchasedAt: null,
    purchasedByUserId: null,
    autoSuggested: (input.autoSuggested as boolean) ?? false,
    createdAt: now,
    updatedAt: now,
  });

  await putItem(item);
  return item;
}

export async function updateShoppingListItem(
  _: unknown,
  { input }: { input: Record<string, unknown> & { id: string; householdId: string } },
) {
  const allowed: Record<string, unknown> = {};
  const fields = ['name', 'quantity', 'category', 'notes'];
  fields.forEach((f) => {
    if (input[f] !== undefined) allowed[f] = input[f];
  });

  const updated = await dbUpdate(`HOUSEHOLD#${input.householdId}`, `SHOP#${input.id}`, {
    ...allowed,
    updatedAt: nowIso(),
  });
  if (!updated) throw new Error('Shopping list item not found');
  return updated;
}

export async function deleteShoppingListItem(
  _: unknown,
  { input }: { input: { householdId: string; id: string } },
) {
  await dbUpdate(`HOUSEHOLD#${input.householdId}`, `SHOP#${input.id}`, {
    deletedAt: nowIso(),
  });
  return true;
}

export async function markShoppingItemPurchased(
  _: unknown,
  { input }: { input: { householdId: string; id: string } },
  ctx: { userId: string },
) {
  const updated = await dbUpdate(`HOUSEHOLD#${input.householdId}`, `SHOP#${input.id}`, {
    purchasedAt: nowIso(),
    purchasedByUserId: ctx.userId,
  });
  if (!updated) throw new Error('Shopping list item not found');
  return updated;
}

export async function markShoppingItemUnpurchased(
  _: unknown,
  { input }: { input: { householdId: string; id: string } },
) {
  const updated = await dbUpdate(`HOUSEHOLD#${input.householdId}`, `SHOP#${input.id}`, {
    purchasedAt: null,
    purchasedByUserId: null,
  });
  if (!updated) throw new Error('Shopping list item not found');
  return updated;
}

// ─── Recipe mutations ─────────────────────────────────────────────────────────

export async function rateRecipe(
  _: unknown,
  { input }: { input: { recipeId: string; householdId: string; rating: number } },
  ctx: { userId: string },
) {
  const { recipeId, householdId, rating } = input;

  // Validate rating is 1-5
  if (rating < 1 || rating > 5 || !Number.isInteger(rating)) {
    throw new Error('Rating must be an integer between 1 and 5');
  }

  // Store user rating in a separate record
  const ratingId = uuidv4();
  const now = nowIso();

  const userRating = buildAttrs({
    PK: `RECIPE#${householdId}#${recipeId}`,
    SK: `RATING#${ctx.userId}`,
    entityType: 'RecipeRating',
    id: ratingId,
    recipeId,
    householdId,
    userId: ctx.userId,
    rating,
    ratedAt: now,
  });

  await putItem(userRating);

  // Aggregate all ratings for this recipe
  // (In production, this would be done via GSI query or Lambda aggregation)
  // For now, return the recipe with user's rating

  const recipe = await dbUpdate(`HOUSEHOLD#${householdId}`, `RECIPE#${recipeId}`, {
    userRating: rating,
    updatedAt: now,
  });

  if (!recipe) throw new Error('Recipe not found');
  return recipe;
}

// ─── Receipt mutations ────────────────────────────────────────────────────────

export async function analyzeReceipt(
  _: unknown,
  {
    input,
  }: {
    input: {
      householdId: string;
      imageBase64: string;
    };
  },
) {
  const { imageBase64 } = input;

  try {
    // Convert base64 to bytes
    const bytes = Buffer.from(imageBase64, 'base64');

    // Dynamic import to avoid adding Textract as a hard dependency
    const { TextractClient } = await import('@wfl/shared');

    const textract = new TextractClient();
    const result = await textract.analyzeExpense({
      bytes: new Uint8Array(bytes),
    });

    return {
      success: true,
      totalAmount: result.totalAmount,
      invoiceReceiptDate: result.invoiceReceiptDate,
      lineItems: (result.lineItems || []).map((item) => ({
        description: item.description,
        quantity: item.quantity ?? 1,
        unitPrice: item.unitPrice ?? item.price ?? 0,
        totalPrice: item.price ?? (item.unitPrice ?? 0) * (item.quantity ?? 1),
      })),
    };
  } catch (error) {
    console.error('Receipt analysis failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to analyze receipt',
      lineItems: [],
    };
  }
}

// ─── AI Operations ────────────────────────────────────────────────────────────

export async function classifyFood(
  _: unknown,
  { householdId, photoUrl }: { householdId: string; photoUrl: string },
  ctx: { userId: string },
) {
  // Stub implementation: returns a basic item based on photo URL
  // In production, this would call Claude via AWS Bedrock to analyze the photo
  const id = uuidv4();
  const now = nowIso();

  // Infer basic food info from URL or use defaults
  const defaultFoodName = 'Food Item';
  const defaultCategory = 'prepared';
  const defaultExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const item = buildAttrs({
    PK: `HOUSEHOLD#${householdId}`,
    SK: `ITEM#${id}`,
    entityType: 'Item',
    id,
    householdId,
    addedByUserId: ctx.userId,
    containerId: null,
    foodType: defaultCategory,
    foodName: defaultFoodName,
    category: defaultCategory,
    storageLocation: 'fridge',
    quantityText: null,
    quantityValue: null,
    quantityUnit: null,
    storedAt: now,
    storedTz: Intl.DateTimeFormat().resolvedOptions().timeZone,
    expiryAt: defaultExpiry,
    expirySource: 'ai',
    expiryConfidence: 0.5,
    notes: null,
    photoPath: photoUrl,
    barcode: null,
    priceUsd: null,
    status: 'active',
    eatenAt: null,
    tossedAt: null,
    frozenAt: null,
    transferredToContainerId: null,
    deletedAt: null,
  });

  await putItem(item);

  return {
    ...item,
    photoUrl: item.photoPath,
    hoursUntilExpiry: Math.ceil(
      (new Date(item.expiryAt as string).getTime() - Date.now()) / 3_600_000,
    ),
    statusColor: 'fresh',
  };
}

export async function ocrExpiryDate(
  _: unknown,
  { householdId, photoUrl }: { householdId: string; photoUrl: string },
): Promise<string> {
  // Stub implementation: returns a date 14 days from now
  // In production, this would use Claude's vision capabilities to read expiry dates from photos
  const expiryDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  return expiryDate.toISOString();
}
