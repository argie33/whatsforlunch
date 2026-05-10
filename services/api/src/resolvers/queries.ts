import { queryAll, getItem } from '../db';

// ─── Household queries ────────────────────────────────────────────────────────

export async function listHouseholds(_: unknown, __: unknown, ctx: { userId: string }) {
  // Query for households where user is a member
  const members = await queryAll({
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :pk',
    ExpressionAttributeValues: {
      ':pk': `USER#${ctx.userId}`,
    },
  });

  const householdIds = members
    .filter((m: Record<string, unknown>) => m.entityType === 'HouseholdMember')
    .map((m: Record<string, unknown>) => (m.GSI1SK as string).replace('HOUSEHOLD#', ''));

  const households = await Promise.all(
    householdIds.map((id: string) => getItem(`HOUSEHOLD#${id}`, 'META')),
  );

  return households.filter((h) => h && !h.deletedAt);
}

export async function listHouseholdMembers(_: unknown, { householdId }: { householdId: string }) {
  const members = await queryAll({
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
    ExpressionAttributeValues: {
      ':pk': `HOUSEHOLD#${householdId}`,
      ':sk': 'MEMBER#',
    },
  });
  return members.filter((m: Record<string, unknown>) => !m.deletedAt);
}

export async function deltaSync(
  _: unknown,
  { input }: { input: { householdId: string; lastSyncTimestamp?: string | null } },
): Promise<{
  containers: unknown[];
  items: unknown[];
  shoppingList: unknown[];
  serverTimestamp: string;
}> {
  const { householdId, lastSyncTimestamp } = input;
  const since = lastSyncTimestamp ? new Date(lastSyncTimestamp).getTime() : 0;
  const serverTimestamp = new Date().toISOString();

  const [containers, items, shoppingList] = await Promise.all([
    queryAll({
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: { ':pk': `HOUSEHOLD#${householdId}`, ':sk': 'CONTAINER#' },
    }).then((rows) => rows.filter((r) => Number(r._lastChangedAt) > since).map(mapContainer)),

    queryAll({
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: { ':pk': `HOUSEHOLD#${householdId}`, ':sk': 'ITEM#' },
    }).then((rows) => rows.filter((r) => Number(r._lastChangedAt) > since).map(mapItem)),

    queryAll({
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: { ':pk': `HOUSEHOLD#${householdId}`, ':sk': 'SHOP#' },
    }).then((rows) => rows.filter((r) => Number(r._lastChangedAt) > since).map(mapShoppingItem)),
  ]);

  return { containers, items, shoppingList, serverTimestamp };
}

export async function listItems(
  _: unknown,
  { householdId, status }: { householdId: string; status?: string },
) {
  const rows = await queryAll({
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
    ExpressionAttributeValues: { ':pk': `HOUSEHOLD#${householdId}`, ':sk': 'ITEM#' },
  });
  const filtered = status ? rows.filter((r) => r.status === status) : rows;
  return filtered.map(mapItem);
}

export async function listContainers(_: unknown, { householdId }: { householdId: string }) {
  const rows = await queryAll({
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
    ExpressionAttributeValues: { ':pk': `HOUSEHOLD#${householdId}`, ':sk': 'CONTAINER#' },
  });
  return rows.filter((r) => !r.deletedAt).map(mapContainer);
}

// ─── Mappers ─────────────────────────────────────────────────────────────────

function mapItem(r: Record<string, unknown>) {
  return {
    id: r.id,
    householdId: r.householdId,
    containerId: r.containerId ?? null,
    addedByUserId: r.addedByUserId,
    foodType: r.foodType,
    foodName: r.foodName,
    category: r.category,
    storageLocation: r.storageLocation,
    quantityText: r.quantityText ?? null,
    quantityValue: r.quantityValue ?? null,
    quantityUnit: r.quantityUnit ?? null,
    storedAt: r.storedAt,
    storedTz: r.storedTz,
    expiryAt: r.expiryAt,
    expirySource: r.expirySource,
    expiryConfidence: r.expiryConfidence ?? null,
    notes: r.notes ?? null,
    photoUrl: r.photoPath ?? null,
    barcode: r.barcode ?? null,
    priceUsd: r.priceUsd ?? null,
    status: r.status,
    eatenAt: r.eatenAt ?? null,
    tossedAt: r.tossedAt ?? null,
    frozenAt: r.frozenAt ?? null,
    transferredToContainerId: r.transferredToContainerId ?? null,
    deletedAt: r.deletedAt ?? null,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    _version: r._version,
    _lastChangedAt: r._lastChangedAt,
    hoursUntilExpiry: Math.ceil(
      (new Date(r.expiryAt as string).getTime() - Date.now()) / 3_600_000,
    ),
    statusColor: computeStatusColor(r.expiryAt as string, r.status as string),
  };
}

function mapContainer(r: Record<string, unknown>) {
  return {
    id: r.id,
    householdId: r.householdId,
    qrToken: r.qrToken,
    nickname: r.nickname ?? null,
    imageUrl: r.imageUrl ?? null,
    claimedAt: r.claimedAt,
    claimedBy: r.claimedBy,
    archivedAt: r.archivedAt ?? null,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    _version: r._version,
    _lastChangedAt: r._lastChangedAt,
  };
}

function mapShoppingItem(r: Record<string, unknown>) {
  return {
    id: r.id,
    householdId: r.householdId,
    name: r.name,
    quantity: r.quantity ?? null,
    category: r.category ?? null,
    notes: r.notes ?? null,
    addedByUserId: r.addedByUserId,
    purchasedAt: r.purchasedAt ?? null,
    purchasedByUserId: r.purchasedByUserId ?? null,
    autoSuggested: r.autoSuggested ?? false,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    _version: r._version,
    _lastChangedAt: r._lastChangedAt,
  };
}

function computeStatusColor(expiryAt: string, status: string): string {
  if (status !== 'active') return 'neutral';
  const hours = (new Date(expiryAt).getTime() - Date.now()) / 3_600_000;
  if (hours < 0) return 'expired';
  if (hours < 24) return 'urgent';
  if (hours < 72) return 'soon';
  return 'fresh';
}

// ─── Shopping list queries ───────────────────────────────────────────────────

export async function listShoppingItems(_: unknown, { householdId }: { householdId: string }) {
  const rows = await queryAll({
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
    ExpressionAttributeValues: {
      ':pk': `HOUSEHOLD#${householdId}`,
      ':sk': 'SHOP#',
    },
  });
  return rows
    .filter((r: Record<string, unknown>) => !r.deletedAt)
    .map((r: Record<string, unknown>) => mapShoppingItem(r));
}

export async function getShoppingListStats(_: unknown, { householdId }: { householdId: string }) {
  const rows = await queryAll({
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
    ExpressionAttributeValues: {
      ':pk': `HOUSEHOLD#${householdId}`,
      ':sk': 'SHOP#',
    },
  });
  const items = rows.filter((r: Record<string, unknown>) => !r.deletedAt);
  const purchased = items.filter((i: Record<string, unknown>) => i.purchasedAt).length;

  return {
    total: items.length,
    purchased,
    pending: items.length - purchased,
  };
}

// ─── Recipe Recommendations ───────────────────────────────────────────────────

export async function getRecipeRecommendations(
  _: unknown,
  { householdId }: { householdId: string },
): Promise<unknown[]> {
  // Mock recipe recommendations - returns sample recipes
  // In production, this would use Claude to generate recipe recommendations
  // based on items in the household
  return [
    {
      id: 'recipe-1',
      title: 'Quick Stir-Fry',
      summary: 'Fast and healthy meal',
      cuisine: 'Asian',
      servings: 4,
      cookTimeMinutes: 15,
      difficulty: 'Easy',
      tags: ['quick', 'healthy', 'weeknight'],
      imageUrl: null,
      usedItemIds: [],
      rating: 4.5,
      notes: 'Use your fresh vegetables for best results',
      ingredients: [
        { name: 'vegetables', quantity: 2, unit: 'cups', optional: false },
        { name: 'soy sauce', quantity: 3, unit: 'tbsp', optional: false },
        { name: 'rice', quantity: 1, unit: 'cup', optional: false },
      ],
      steps: ['Prep ingredients', 'Heat wok', 'Cook vegetables', 'Add sauce', 'Serve over rice'],
      createdAt: new Date().toISOString(),
    },
  ];
}

// ─── Restaurant Recommendations ───────────────────────────────────────────────

export async function getNearbyRestaurants(
  _: unknown,
  {
    householdId,
    latitude,
    longitude,
  }: { householdId: string; latitude: number; longitude: number },
): Promise<unknown[]> {
  // Mock nearby restaurants - returns sample restaurants
  // In production, this would use Google Places API to find nearby restaurants
  // and Claude to rank them based on household preferences
  return [
    {
      placeId: 'place-1',
      name: 'The Garden Kitchen',
      address: '123 Main St',
      cuisineTypes: ['Farm-to-Table', 'Vegetarian'],
      rating: 4.6,
      priceLevel: 3,
      distanceMeters: 450,
      isOpenNow: true,
      deliveryPlatforms: [
        { platform: 'UberEats', deepLink: 'uber://food' },
        { platform: 'DoorDash', deepLink: 'doordash://' },
      ],
      aiScore: 0.92,
      aiReason: 'Fresh ingredients match your preferences',
    },
    {
      placeId: 'place-2',
      name: 'Taste of Asia',
      address: '456 Oak Ave',
      cuisineTypes: ['Thai', 'Vietnamese'],
      rating: 4.4,
      priceLevel: 2,
      distanceMeters: 680,
      isOpenNow: true,
      deliveryPlatforms: [{ platform: 'UberEats', deepLink: 'uber://food' }],
      aiScore: 0.85,
      aiReason: 'Highly rated for authentic cuisine',
    },
    {
      placeId: 'place-3',
      name: 'Local Pizzeria',
      address: '789 Pine Road',
      cuisineTypes: ['Italian', 'Pizza'],
      rating: 4.3,
      priceLevel: 2,
      distanceMeters: 520,
      isOpenNow: false,
      deliveryPlatforms: [{ platform: 'DoorDash', deepLink: 'doordash://' }],
      aiScore: 0.78,
      aiReason: 'Popular neighborhood spot',
    },
  ];
}

// ─── Profile Queries ──────────────────────────────────────────────────────────

export async function getProfile(
  _: unknown,
  __: unknown,
  ctx: { userId: string },
): Promise<unknown> {
  // Stub implementation: returns basic user profile
  // In production, this would query from DynamoDB
  return {
    id: ctx.userId,
    email: 'user@example.com',
    displayName: 'User',
    timeZone: 'America/New_York',
    units: 'imperial',
    locale: 'en-US',
    dietaryPreferences: [],
    cuisinePreferences: [],
    allergies: [],
    subscriptionTier: 'free',
    aiQuotaUsedToday: 0,
    aiQuotaResetAt: new Date(Date.now() + 86_400_000).toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export async function getHousehold(_: unknown, { id }: { id: string }): Promise<unknown> {
  // Stub implementation: returns basic household
  const household = await getItem(`HOUSEHOLD#${id}`, 'META');
  return household || null;
}
