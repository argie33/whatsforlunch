import { v4 as uuid } from 'uuid';
import { put, get, query, remove } from './db.js';
import type { LocalUser } from './auth.js';
import { getAIService } from './ai-service.js';

function now() {
  return new Date().toISOString();
}

function hoursUntilExpiry(expiryAt: string | null | undefined): number | null {
  if (!expiryAt) return null;
  return Math.round((new Date(expiryAt).getTime() - Date.now()) / 3_600_000);
}

function statusColor(expiryAt: string | null | undefined): string {
  const h = hoursUntilExpiry(expiryAt);
  if (h === null) return 'fresh';
  if (h < 0) return 'expired';
  if (h < 24) return 'red';
  if (h < 72) return 'yellow';
  return 'green';
}

// ─── Profile ────────────────────────────────────────────────────────────────

export async function getProfile(user: LocalUser) {
  const item = await get(`USER#${user.email}`, 'PROFILE');
  if (!item) throw new Error('Profile not found');
  return { ...item, hoursUntilExpiry: 0, statusColor: 'green' };
}

export async function updateProfile(user: LocalUser, input: Record<string, unknown>) {
  const existing = await get(`USER#${user.email}`, 'PROFILE');
  if (!existing) throw new Error('Profile not found');
  const updated = {
    ...existing,
    ...input,
    updatedAt: now(),
    _version: (existing._version as number) + 1,
  };
  await put(updated);
  return updated;
}

// ─── Household ──────────────────────────────────────────────────────────────

export async function listHouseholds(user: LocalUser) {
  // Find households the user is a member of via GSI scan (simplified: scan all members for userId)
  const profile = await get(`USER#${user.email}`, 'PROFILE');
  if (!profile?.defaultHouseholdId) return [];
  const household = await get(`HOUSEHOLD#${profile.defaultHouseholdId}`, 'META');
  return household ? [household] : [];
}

export async function createHousehold(user: LocalUser, input: { name: string; imageUrl?: string }) {
  const id = uuid();
  const ts = now();
  const household = {
    PK: `HOUSEHOLD#${id}`,
    SK: 'META',
    id,
    entityType: 'Household',
    name: input.name,
    ownerId: user.id,
    imageUrl: input.imageUrl ?? null,
    memberCount: 1,
    createdAt: ts,
    updatedAt: ts,
    _version: 1,
    _lastChangedAt: Date.now(),
  };
  const member = {
    PK: `HOUSEHOLD#${id}`,
    SK: `MEMBER#${user.id}`,
    entityType: 'HouseholdMember',
    userId: user.id,
    householdId: id,
    role: 'owner',
    joinedAt: ts,
  };
  await Promise.all([put(household), put(member)]);
  return { ...household, members: [member] };
}

export async function listHouseholdMembers(householdId: string) {
  const items = await query(`HOUSEHOLD#${householdId}`, 'MEMBER#');
  return items;
}

export async function inviteHouseholdMember(
  user: LocalUser,
  householdId: string,
  email: string,
  role: string,
) {
  const id = uuid();
  const ts = now();
  const invite = {
    PK: `HOUSEHOLD#${householdId}`,
    SK: `INVITE#${id}`,
    entityType: 'HouseholdInvite',
    id,
    householdId,
    inviteEmail: email,
    invitedByUserId: user.id,
    role: role || 'member',
    token: Math.random().toString(36).slice(2, 10),
    createdAt: ts,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    _version: 1,
  };
  await put(invite);
  return { id, householdId, inviteEmail: email, role, createdAt: ts };
}

export async function removeHouseholdMember(user: LocalUser, householdId: string, userId: string) {
  const key = `HOUSEHOLD#${householdId}`;
  const sk = `MEMBER#${userId}`;
  await remove(key, sk);
  return { success: true, householdId, userId };
}

export async function updateMemberRole(
  user: LocalUser,
  householdId: string,
  userId: string,
  role: string,
) {
  const key = `HOUSEHOLD#${householdId}`;
  const sk = `MEMBER#${userId}`;
  const existing = await get(key, sk);
  if (!existing) throw new Error('Member not found');
  const updated = {
    ...existing,
    role,
    updatedAt: now(),
    _version: (existing._version as number) + 1,
  };
  await put(updated);
  return updated;
}

// ─── Items ───────────────────────────────────────────────────────────────────

export async function listItems(householdId: string, limit = 50) {
  const items = await query(`HOUSEHOLD#${householdId}`, 'ITEM#');
  return items
    .filter((i) => i.status === 'active' || i.status === 'partial')
    .slice(0, limit)
    .map((i) => ({
      ...i,
      hoursUntilExpiry: hoursUntilExpiry(i.expiryAt as string),
      statusColor: statusColor(i.expiryAt as string),
    }));
}

export async function getItem(id: string, householdId: string) {
  const item = await get(`HOUSEHOLD#${householdId}`, `ITEM#${id}`);
  if (!item) return null;
  return {
    ...item,
    hoursUntilExpiry: hoursUntilExpiry(item.expiryAt as string),
    statusColor: statusColor(item.expiryAt as string),
  };
}

export async function createItem(user: LocalUser, input: Record<string, unknown>) {
  const id = uuid();
  const ts = now();
  const item = {
    PK: `HOUSEHOLD#${input.householdId}`,
    SK: `ITEM#${id}`,
    id,
    entityType: 'Item',
    addedByUserId: user.id,
    status: 'active',
    createdAt: ts,
    updatedAt: ts,
    _version: 1,
    _lastChangedAt: Date.now(),
    ...input,
  } as Record<string, unknown>;
  await put(item);
  const expiryAt = item.expiryAt as string | undefined;
  return {
    ...item,
    hoursUntilExpiry: hoursUntilExpiry(expiryAt),
    statusColor: statusColor(expiryAt),
  };
}

export async function updateItem(input: Record<string, unknown>) {
  const existing = await get(`HOUSEHOLD#${input.householdId}`, `ITEM#${input.id}`);
  if (!existing) throw new Error('Item not found');
  const updated = {
    ...existing,
    ...input,
    updatedAt: now(),
    _version: (existing._version as number) + 1,
  };
  await put(updated);
  const expiryAt = (updated as Record<string, unknown>).expiryAt as string | undefined;
  return {
    ...updated,
    hoursUntilExpiry: hoursUntilExpiry(expiryAt),
    statusColor: statusColor(expiryAt),
  };
}

async function changeItemStatus(
  householdId: string,
  id: string,
  status: string,
  extraFields: Record<string, unknown> = {},
) {
  const existing = await get(`HOUSEHOLD#${householdId}`, `ITEM#${id}`);
  if (!existing) throw new Error('Item not found');
  const updated = {
    ...existing,
    status,
    updatedAt: now(),
    ...extraFields,
    _version: (existing._version as number) + 1,
  };
  await put(updated);
  const expiryAt = (updated as Record<string, unknown>).expiryAt as string | undefined;
  return {
    ...updated,
    hoursUntilExpiry: hoursUntilExpiry(expiryAt),
    statusColor: statusColor(expiryAt),
  };
}

export const markItemEaten = (input: { householdId: string; id: string }) =>
  changeItemStatus(input.householdId, input.id, 'eaten', { eatenAt: now() });

export const markItemTossed = (input: { householdId: string; id: string }) =>
  changeItemStatus(input.householdId, input.id, 'tossed', { tossedAt: now() });

export const markItemFrozen = (input: { householdId: string; id: string }) =>
  changeItemStatus(input.householdId, input.id, 'frozen', { frozenAt: now() });

export const markItemPartial = (input: Record<string, unknown>) =>
  changeItemStatus(input.householdId as string, input.id as string, 'partial', {
    quantityText: input.quantityText,
    quantityValue: input.quantityValue,
    quantityUnit: input.quantityUnit,
  });

export async function deleteItem(householdId: string, id: string) {
  await remove(`HOUSEHOLD#${householdId}`, `ITEM#${id}`);
  return true;
}

// ─── AI (Real AWS Bedrock/Textract with fallback to mocks) ────────────────────

export async function classifyFood(user: LocalUser, householdId: string, photoUrl: string) {
  const aiService = getAIService();
  const classification = await aiService.classifyFood(photoUrl);

  const expiryAt = new Date(Date.now() + classification.fridgeDays * 86_400_000).toISOString();

  return createItem(user, {
    householdId,
    foodType: classification.foodName.toLowerCase().replace(/\s+/g, '_'),
    foodName: classification.foodName,
    category: classification.category,
    storageLocation: 'fridge',
    expiryAt,
    expirySource: 'ai',
    expiryConfidence: classification.confidence,
    photoUrl,
  });
}

export async function ocrExpiryDate(photoUrl: string): Promise<string> {
  const aiService = getAIService();
  const result = await aiService.ocrExpiryDate(photoUrl);
  return result.expiryDate;
}

// ─── Delta sync ──────────────────────────────────────────────────────────────

export async function deltaSync(householdId: string, lastSyncAt: string, limit = 100) {
  const since = new Date(lastSyncAt).getTime();
  const allItems = await query(`HOUSEHOLD#${householdId}`, 'ITEM#');
  const changed = allItems
    .filter((i) => new Date(i.updatedAt as string).getTime() > since)
    .slice(0, limit)
    .map((i) => ({
      ...i,
      hoursUntilExpiry: hoursUntilExpiry(i.expiryAt as string),
      statusColor: statusColor(i.expiryAt as string),
    }));

  return {
    items: changed,
    containers: [],
    members: [],
    deleted: [],
    timestamp: new Date().toISOString(),
    hasMore: false,
  };
}

// ─── Phase C Resolvers ───────────────────────────────────────────────────────

// Phase C.1: Caching
export async function getCachedHouseholdItems(householdId: string) {
  return listItems(householdId);
}

export async function getCachedHouseholdProfile(householdId: string) {
  const household = await get(`HOUSEHOLD#${householdId}`, 'META');
  const members = await listHouseholdMembers(householdId);
  return { ...household, members, cachedAt: now() };
}

export async function invalidateHouseholdCache(householdId: string) {
  return true;
}

// Phase C.2: Analytics
export async function trackEvent(event: {
  userId: string;
  householdId: string;
  eventType: string;
  metadata?: Record<string, any>;
}) {
  return { success: true, eventId: uuid(), trackedAt: now() };
}

export async function getHouseholdAnalytics(householdId: string, period?: string) {
  const allItems = await query(`HOUSEHOLD#${householdId}`, 'ITEM#');
  const eatenItems = allItems.filter((i: any) => i.status === 'eaten');
  const tossedItems = allItems.filter((i: any) => i.status === 'tossed');
  const activeItems = allItems.filter((i: any) => i.status === 'active' || i.status === 'partial');

  return {
    period: period || 'monthly',
    householdId,
    totalItems: allItems.length,
    eatenItems: eatenItems.length,
    tossedItems: tossedItems.length,
    wastePercentage:
      allItems.length > 0 ? Math.round((tossedItems.length / allItems.length) * 100) : 0,
    averageShelfLifeDays:
      activeItems.length > 0
        ? Math.round(
            activeItems.reduce(
              (sum: number, i: any) => sum + (hoursUntilExpiry(i.expiryAt) || 0),
              0,
            ) /
              activeItems.length /
              24,
          )
        : 0,
    analyticsAt: now(),
  };
}

export async function computeCostAnalysis(householdId: string) {
  const allItems = await query(`HOUSEHOLD#${householdId}`, 'ITEM#');
  const tossedItems = allItems.filter((i: any) => i.status === 'tossed');

  return {
    householdId,
    estimatedWasteCost: tossedItems.length * 5.5,
    itemsWasted: tossedItems.length,
    potentialSavings: tossedItems.length * 3.2,
    analysisAt: now(),
  };
}

// Phase C.3: ML Recommendations
export async function getRecommendations(householdId: string, userId: string) {
  // Get items from household to generate recipes from
  const items = (await listItems(householdId)) as any[];
  const itemNames = items.map((i: any) => i.foodName);

  if (itemNames.length === 0) {
    return {
      recommendations: [],
      source: 'claude',
      generatedAt: now(),
    };
  }

  try {
    const aiService = getAIService();
    const recipes = await aiService.generateRecipes(itemNames);
    return {
      recommendations: recipes.map((recipe: any) => ({
        id: uuid(),
        title: recipe.title,
        summary: recipe.summary || recipe.description,
        cuisine: recipe.cuisine || 'mixed',
        servings: recipe.servings || 4,
        cookTimeMinutes: recipe.durationMinutes || 30,
        difficulty: recipe.difficulty || 'medium',
        ingredients: recipe.missingIngredients || [],
        steps: recipe.steps || [],
        tags: [],
        usedItemIds: items.slice(0, 3).map((i) => i.id),
        rating: 4,
        notes: `Generated from available items: ${itemNames.join(', ')}`,
        createdAt: now(),
        updatedAt: now(),
      })),
      source: 'claude',
      generatedAt: now(),
    };
  } catch (err) {
    console.error('[getRecommendations] Claude generation failed:', err);
    return {
      recommendations: [],
      source: 'error',
      error: String(err),
    };
  }
}

export async function setUserPreferences(
  userId: string,
  preferences: {
    dietaryRestrictions?: string[];
    cuisinePreferences?: string[];
    allergies?: string[];
  },
) {
  return {
    success: true,
    userId,
    preferences,
    savedAt: now(),
  };
}

export async function rateRecommendation(userId: string, recipeId: string, rating: number) {
  return {
    success: true,
    userId,
    recipeId,
    rating: Math.min(Math.max(rating, 1), 5),
    ratedAt: now(),
  };
}

// Phase C.4: Image Processing
export async function processImage(input: Record<string, unknown>) {
  return {
    success: true,
    userId: input.userId,
    householdId: input.householdId,
    itemId: input.itemId,
    processedAt: now(),
  };
}

// Phase C.6: Sharding Router
export async function routeShardedRequest(input: Record<string, unknown>) {
  const operation = (input.operation as string) || 'get';
  return {
    success: true,
    householdId: input.householdId,
    shardId: Math.floor(Math.random() * 4),
    operation,
    result: JSON.stringify({ status: 'ok' }),
    shardStats: JSON.stringify({ shards: 4, load: 'balanced' }),
  };
}

// Phase C.5: Replication Monitoring
export async function checkReplicationHealth(householdId: string) {
  return {
    healthy: true,
    householdId,
    replicas: 2,
    status: 'in-sync',
    checkedAt: now(),
  };
}

export async function checkDataConsistency(householdId: string) {
  return {
    consistent: true,
    householdId,
    inconsistencies: 0,
    checkedAt: now(),
  };
}

export async function triggerRebalancing(householdId: string) {
  return {
    success: true,
    householdId,
    rebalancedAt: now(),
  };
}

// ─── Shopping List ──────────────────────────────────────────────────────────────

export async function listShoppingItems(householdId: string) {
  const items = await query(`HOUSEHOLD#${householdId}`, 'SHOPPINGITEM#');
  return items.map((i) => ({
    ...i,
    createdAt:
      typeof i.createdAt === 'string' ? i.createdAt : new Date(i.createdAt as number).toISOString(),
    updatedAt:
      typeof i.updatedAt === 'string' ? i.updatedAt : new Date(i.updatedAt as number).toISOString(),
    purchasedAt: !i.purchasedAt
      ? null
      : typeof i.purchasedAt === 'string'
        ? i.purchasedAt
        : new Date(i.purchasedAt as number).toISOString(),
  }));
}

export async function getShoppingItem(id: string, householdId: string) {
  const item = await get(`HOUSEHOLD#${householdId}`, `SHOPPINGITEM#${id}`);
  if (!item) return null;
  return {
    ...item,
    createdAt:
      typeof item.createdAt === 'string'
        ? item.createdAt
        : new Date(item.createdAt as number).toISOString(),
    updatedAt:
      typeof item.updatedAt === 'string'
        ? item.updatedAt
        : new Date(item.updatedAt as number).toISOString(),
    purchasedAt: !item.purchasedAt
      ? null
      : typeof item.purchasedAt === 'string'
        ? item.purchasedAt
        : new Date(item.purchasedAt as number).toISOString(),
  };
}

export async function addShoppingListItem(user: LocalUser, input: Record<string, unknown>) {
  const id = uuid();
  const ts = now();
  const item = {
    PK: `HOUSEHOLD#${input.householdId}`,
    SK: `SHOPPINGITEM#${id}`,
    id,
    entityType: 'ShoppingListItem',
    householdId: input.householdId,
    name: input.name,
    quantity: input.quantity ?? null,
    category: input.category ?? null,
    notes: input.notes ?? null,
    addedByUserId: user.id,
    purchasedAt: null,
    purchasedByUserId: null,
    autoSuggested: input.autoSuggested ?? false,
    createdAt: ts,
    updatedAt: ts,
    _version: 1,
    _lastChangedAt: Date.now(),
  };
  await put(item);
  return {
    ...item,
    createdAt: ts,
    updatedAt: ts,
  };
}

export async function updateShoppingListItem(input: Record<string, unknown>) {
  const existing = await get(`HOUSEHOLD#${input.householdId}`, `SHOPPINGITEM#${input.id}`);
  if (!existing) throw new Error('Shopping list item not found');
  const updated = {
    ...existing,
    name: input.name ?? existing.name,
    quantity: input.quantity ?? existing.quantity,
    category: input.category ?? existing.category,
    notes: input.notes ?? existing.notes,
    updatedAt: now(),
    _version: (existing._version as number) + 1,
  };
  await put(updated);
  return {
    ...updated,
    createdAt:
      typeof existing.createdAt === 'string'
        ? existing.createdAt
        : new Date(existing.createdAt as number).toISOString(),
    updatedAt: updated.updatedAt,
  };
}

export async function deleteShoppingListItem(id: string, householdId: string) {
  await remove(`HOUSEHOLD#${householdId}`, `SHOPPINGITEM#${id}`);
  return true;
}

export async function markShoppingItemPurchased(id: string, householdId: string, userId: string) {
  const existing = await get(`HOUSEHOLD#${householdId}`, `SHOPPINGITEM#${id}`);
  if (!existing) throw new Error('Shopping list item not found');
  const updated = {
    ...existing,
    purchasedAt: now(),
    purchasedByUserId: userId,
    updatedAt: now(),
    _version: (existing._version as number) + 1,
  };
  await put(updated);
  return {
    ...updated,
    createdAt:
      typeof existing.createdAt === 'string'
        ? existing.createdAt
        : new Date(existing.createdAt as number).toISOString(),
    purchasedAt: updated.purchasedAt,
  };
}

export async function markShoppingItemUnpurchased(id: string, householdId: string) {
  const existing = await get(`HOUSEHOLD#${householdId}`, `SHOPPINGITEM#${id}`);
  if (!existing) throw new Error('Shopping list item not found');
  const ts = now();
  const updated = {
    ...existing,
    purchasedAt: null,
    purchasedByUserId: null,
    updatedAt: ts,
    _version: (existing._version as number) + 1,
  };
  await put(updated);
  return {
    ...updated,
    createdAt:
      typeof existing.createdAt === 'string'
        ? existing.createdAt
        : new Date(existing.createdAt as number).toISOString(),
    updatedAt: ts,
  };
}

export async function getShoppingListStats(householdId: string) {
  const items = await query(`HOUSEHOLD#${householdId}`, 'SHOPPINGITEM#');
  const purchased = items.filter((i) => i.purchasedAt).length;
  return {
    total: items.length,
    purchased,
    pending: items.length - purchased,
  };
}

export async function getShoppingListByCategory(householdId: string, category: string) {
  const items = await query(`HOUSEHOLD#${householdId}`, 'SHOPPINGITEM#');
  return items
    .filter((i) => i.category === category)
    .map((i) => ({
      ...i,
      createdAt:
        typeof i.createdAt === 'string'
          ? i.createdAt
          : new Date(i.createdAt as number).toISOString(),
      updatedAt:
        typeof i.updatedAt === 'string'
          ? i.updatedAt
          : new Date(i.updatedAt as number).toISOString(),
      purchasedAt: !i.purchasedAt
        ? null
        : typeof i.purchasedAt === 'string'
          ? i.purchasedAt
          : new Date(i.purchasedAt as number).toISOString(),
    }));
}

// ─── Containers ──────────────────────────────────────────────────────────────

export async function claimContainer(user: LocalUser, input: Record<string, unknown>) {
  const id = uuid();
  const ts = now();
  const container = {
    PK: `HOUSEHOLD#${input.householdId}`,
    SK: `CONTAINER#${id}`,
    id,
    entityType: 'Container',
    householdId: input.householdId,
    qrToken: input.qrToken,
    qrNumber: Math.floor(Math.random() * 10000),
    nickname: input.nickname ?? null,
    claimedAt: ts,
    claimedBy: user.id,
    createdAt: ts,
    updatedAt: ts,
    _version: 1,
    _lastChangedAt: Date.now(),
  };
  await put(container);
  return container;
}

export async function updateContainer(input: Record<string, unknown>) {
  const existing = await get(`HOUSEHOLD#${input.householdId}`, `CONTAINER#${input.id}`);
  if (!existing) throw new Error('Container not found');
  const updated = {
    ...existing,
    nickname: input.nickname ?? existing.nickname,
    imageUrl: input.imageUrl ?? existing.imageUrl,
    updatedAt: now(),
    _version: (existing._version as number) + 1,
  };
  await put(updated);
  return updated;
}

export async function archiveContainer(input: Record<string, unknown>) {
  const existing = await get(`HOUSEHOLD#${input.householdId}`, `CONTAINER#${input.id}`);
  if (!existing) throw new Error('Container not found');
  const updated = {
    ...existing,
    archivedAt: now(),
    updatedAt: now(),
    _version: (existing._version as number) + 1,
  };
  await put(updated);
  return updated;
}

export async function getRecipeRecommendations(householdId: string) {
  try {
    // Get items for this household
    const items = await query(`PK = :pk AND begins_with(SK, :sk)`, {
      ':pk': `HOUSEHOLD#${householdId}`,
      ':sk': 'ITEM#',
    });

    const activeItems = items.filter((i) => i.status === 'active' && !i.deletedAt);
    const itemNames = activeItems.map((i) => i.foodName as string).filter(Boolean);

    // Generate real recipes using Claude if items exist
    if (itemNames.length > 0) {
      const aiService = getAIService();
      const recipes = await aiService.generateRecipes(itemNames);

      // Format recipes for GraphQL response
      return {
        recommendations: recipes.map((r, idx) => ({
          id: `recipe-${idx}`,
          title: r.title || 'Untitled Recipe',
          summary: r.summary || r.description || '',
          servings: r.servings || 2,
          cookTimeMinutes: r.cookTimeMinutes || 30,
          difficulty: r.difficulty || 'medium',
          ingredients: r.ingredients || [],
          steps: r.steps || [],
          tags: r.tags || [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })),
        source: 'claude-api',
        householdId,
      };
    }

    // No items in household, return empty recommendations
    return {
      recommendations: [],
      source: 'empty',
      householdId,
    };
  } catch (error) {
    console.error('Failed to generate recipes:', error);
    // Return empty on error
    return {
      recommendations: [],
      source: 'error',
      householdId,
    };
  }
}

// ─── Nearby Restaurants ─────────────────────────────────────────────────────

const MOCK_RESTAURANTS = [
  {
    placeId: 'rest-001',
    name: 'Bella Italia',
    address: '123 Main St, Downtown',
    cuisineTypes: ['Italian'],
    rating: 4.7,
    priceLevel: 2,
    distanceMeters: 480,
    isOpenNow: true,
    deliveryPlatforms: [
      { platform: 'DoorDash', deepLink: 'https://doordash.com/restaurants/bella-italia' },
      { platform: 'Uber Eats', deepLink: 'https://ubereats.com/restaurants/bella-italia' },
    ],
  },
  {
    placeId: 'rest-002',
    name: 'Sakura Sushi',
    address: '456 Oak Ave, Midtown',
    cuisineTypes: ['Japanese', 'Sushi'],
    rating: 4.6,
    priceLevel: 3,
    distanceMeters: 720,
    isOpenNow: true,
    deliveryPlatforms: [
      { platform: 'DoorDash', deepLink: 'https://doordash.com/restaurants/sakura-sushi' },
      { platform: 'Uber Eats', deepLink: 'https://ubereats.com/restaurants/sakura-sushi' },
    ],
  },
  {
    placeId: 'rest-003',
    name: 'Spice Route',
    address: '789 Elm St, Arts District',
    cuisineTypes: ['Indian', 'South Asian'],
    rating: 4.5,
    priceLevel: 2,
    distanceMeters: 1200,
    isOpenNow: true,
    deliveryPlatforms: [
      { platform: 'DoorDash', deepLink: 'https://doordash.com/restaurants/spice-route' },
      { platform: 'Uber Eats', deepLink: 'https://ubereats.com/restaurants/spice-route' },
    ],
  },
  {
    placeId: 'rest-004',
    name: 'Taco Fiesta',
    address: '321 Pine Rd, South Side',
    cuisineTypes: ['Mexican'],
    rating: 4.3,
    priceLevel: 1,
    distanceMeters: 1500,
    isOpenNow: false,
    deliveryPlatforms: [
      { platform: 'DoorDash', deepLink: 'https://doordash.com/restaurants/taco-fiesta' },
      { platform: 'Uber Eats', deepLink: 'https://ubereats.com/restaurants/taco-fiesta' },
    ],
  },
  {
    placeId: 'rest-005',
    name: 'The Burger House',
    address: '654 Maple Dr, Westside',
    cuisineTypes: ['American', 'Burgers'],
    rating: 4.4,
    priceLevel: 1,
    distanceMeters: 900,
    isOpenNow: true,
    deliveryPlatforms: [
      { platform: 'DoorDash', deepLink: 'https://doordash.com/restaurants/burger-house' },
      { platform: 'Uber Eats', deepLink: 'https://ubereats.com/restaurants/burger-house' },
    ],
  },
  {
    placeId: 'rest-006',
    name: 'Green Bowl Vegan',
    address: '987 Cedar Ln, Northside',
    cuisineTypes: ['Vegan', 'Vegetarian', 'Health Food'],
    rating: 4.6,
    priceLevel: 2,
    distanceMeters: 650,
    isOpenNow: true,
    deliveryPlatforms: [
      { platform: 'DoorDash', deepLink: 'https://doordash.com/restaurants/green-bowl' },
      { platform: 'Uber Eats', deepLink: 'https://ubereats.com/restaurants/green-bowl' },
    ],
  },
  {
    placeId: 'rest-007',
    name: 'Pho Palace',
    address: '147 Birch St, Chinatown',
    cuisineTypes: ['Vietnamese'],
    rating: 4.5,
    priceLevel: 1,
    distanceMeters: 1100,
    isOpenNow: true,
    deliveryPlatforms: [
      { platform: 'DoorDash', deepLink: 'https://doordash.com/restaurants/pho-palace' },
      { platform: 'Uber Eats', deepLink: 'https://ubereats.com/restaurants/pho-palace' },
    ],
  },
  {
    placeId: 'rest-008',
    name: 'Mediterranean Grill',
    address: '258 Spruce Ave, Greek Town',
    cuisineTypes: ['Greek', 'Mediterranean'],
    rating: 4.7,
    priceLevel: 2,
    distanceMeters: 1350,
    isOpenNow: true,
    deliveryPlatforms: [
      { platform: 'DoorDash', deepLink: 'https://doordash.com/restaurants/med-grill' },
      { platform: 'Uber Eats', deepLink: 'https://ubereats.com/restaurants/med-grill' },
    ],
  },
];

export async function getNearbyRestaurants(
  latitude: number,
  longitude: number,
  householdId: string,
): Promise<any[]> {
  try {
    // Get user preferences from household
    const profile = await get(`HOUSEHOLD#${householdId}`, 'PROFILE');
    const cuisinePrefs = profile?.cuisinePrefs || [];
    const dietaryPrefs = profile?.dietaryPrefs || [];

    // In a production system, this would call Google Places API
    // For now, return mock restaurants and rank them
    const aiService = getAIService();
    const rankings = await aiService.rankRestaurants(
      MOCK_RESTAURANTS.map((r) => ({
        placeId: r.placeId,
        name: r.name,
        cuisineTypes: r.cuisineTypes,
      })),
      cuisinePrefs,
      dietaryPrefs,
    );

    // Merge rankings with restaurant data
    const rankedRestaurants = MOCK_RESTAURANTS.map((r) => {
      const ranking = rankings.find((x) => x.placeId === r.placeId);
      return {
        ...r,
        aiScore: ranking?.aiScore || 0.5,
        aiReason: ranking?.aiReason || 'Recommended',
      };
    })
      .sort((a, b) => b.aiScore - a.aiScore)
      .slice(0, 5);

    console.log('[getNearbyRestaurants] Returning', rankedRestaurants.length, 'restaurants');
    return rankedRestaurants;
  } catch (error) {
    console.error('[getNearbyRestaurants] Error:', error);
    // Return top restaurants without ranking on error
    return MOCK_RESTAURANTS.slice(0, 5).map((r) => ({
      ...r,
      aiScore: 0.5,
      aiReason: 'Recommendation',
    }));
  }
}
