import { v4 as uuid } from 'uuid';
import { put, get, query, remove } from './db.js';
import type { LocalUser } from './auth.js';
import { createPhaseCResolvers } from './resolvers/phase-c.js';
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

export const markItemPartial = (input: { householdId: string; id: string }) =>
  changeItemStatus(input.householdId, input.id, 'partial');

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

// Mock Redis and DynamoDB clients for local testing
const mockRedis = {
  get: async (key: string) => null,
  setex: async (key: string, ttl: number, value: string) => {},
  del: async (key: string) => {},
} as any;

const mockDynamodb = {
  query: async () => ({ Items: [] }),
  getItem: async () => ({ Item: undefined }),
  putItem: async () => {},
} as any;

const phaseCResolvers = createPhaseCResolvers(mockRedis, mockDynamodb);

// Phase C.1: Caching
export async function getCachedHouseholdItems(householdId: string) {
  const result = await phaseCResolvers.cache.getHouseholdItems(householdId);
  return result;
}

export async function getCachedHouseholdProfile(householdId: string) {
  const result = await phaseCResolvers.cache.getHouseholdProfile(householdId);
  return result;
}

export async function invalidateHouseholdCache(householdId: string) {
  await phaseCResolvers.cache.invalidateCache(householdId);
  return true;
}

// Phase C.2: Analytics
export async function trackEvent(event: {
  userId: string;
  householdId: string;
  eventType: string;
  metadata?: Record<string, any>;
}) {
  return phaseCResolvers.analytics.trackEvent(event);
}

export async function getHouseholdAnalytics(householdId: string, period?: string) {
  return phaseCResolvers.analytics.getHouseholdAnalytics(householdId, period || 'monthly');
}

export async function computeCostAnalysis(householdId: string) {
  return phaseCResolvers.analytics.computeCostAnalysis(householdId);
}

// Phase C.3: ML Recommendations
export async function getRecommendations(householdId: string, userId: string) {
  // Get items from household to generate recipes from
  const items = await listItems(householdId);
  const itemNames = items.map((i) => i.foodName);

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
  return phaseCResolvers.recommendations.setUserPreferences(userId, preferences);
}

export async function rateRecommendation(userId: string, recipeId: string, rating: number) {
  return phaseCResolvers.recommendations.rateRecommendation(userId, recipeId, rating);
}

// Phase C.4: Image Processing
export async function processImage(input: Record<string, unknown>) {
  const { ImageProcessor } = await import('./lambdas/phase-c-image-processor.js');
  const processor = new ImageProcessor(mockDynamodb, mockDynamodb);
  return processor.processImage({
    userId: input.userId as string,
    householdId: input.householdId as string,
    itemId: input.itemId as string,
    imageUrl: input.imageUrl as string,
    imageBase64: input.imageBase64 as string | undefined,
  });
}

// Phase C.6: Sharding Router
export async function routeShardedRequest(input: Record<string, unknown>) {
  const { ShardingRouter } = await import('./lambdas/phase-c-sharding-router.js');
  const router = new ShardingRouter(mockDynamodb, 4);
  const operation = (input.operation as string) || 'get';
  const validOperation = ['get', 'put', 'delete'].includes(operation)
    ? (operation as 'get' | 'put' | 'delete')
    : 'get';

  const result = await router.routeRequest({
    householdId: input.householdId as string,
    operation: validOperation,
    data: input.data,
  });
  return {
    success: result.success,
    householdId: result.householdId,
    shardId: result.shardId,
    operation: result.operation,
    result: JSON.stringify(result.result),
    shardStats: JSON.stringify(router.getShardStats()),
  };
}

// Phase C.5: Replication Monitoring
export async function checkReplicationHealth(householdId: string) {
  const { ReplicationMonitor } = await import('./lambdas/phase-c-replication-monitor.js');
  const monitor = new ReplicationMonitor(mockDynamodb, {} as any);
  return monitor.checkReplicationHealth(householdId);
}

export async function checkDataConsistency(householdId: string) {
  const { ReplicationMonitor } = await import('./lambdas/phase-c-replication-monitor.js');
  const monitor = new ReplicationMonitor(mockDynamodb, {} as any);
  return monitor.checkDataConsistency(householdId);
}

export async function triggerRebalancing(householdId: string) {
  const { ReplicationMonitor } = await import('./lambdas/phase-c-replication-monitor.js');
  const monitor = new ReplicationMonitor(mockDynamodb, {} as any);
  const result = await monitor.triggerRebalancing(householdId);
  return result.success;
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

// Mock recommendations for local testing
const MOCK_RECIPES = [
  {
    id: 'recipe-1',
    title: 'Vegetable Stir Fry',
    summary: 'Quick and easy stir fry with seasonal vegetables',
    servings: 4,
    cookTimeMinutes: 15,
    difficulty: '⭐ Easy',
    ingredients: [
      { name: 'vegetables', quantity: 2, unit: 'cups' },
      { name: 'oil', quantity: 2, unit: 'tbsp' },
      { name: 'soy sauce', quantity: 3, unit: 'tbsp' },
    ],
    steps: ['Prep vegetables', 'Heat oil', 'Cook vegetables', 'Add sauce', 'Serve hot'],
    tags: ['quick', 'vegetarian', 'healthy'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'recipe-2',
    title: 'Pasta Primavera',
    summary: 'Fresh pasta with spring vegetables',
    servings: 4,
    cookTimeMinutes: 20,
    difficulty: '⭐ Easy',
    ingredients: [
      { name: 'pasta', quantity: 1, unit: 'lb' },
      { name: 'vegetables', quantity: 3, unit: 'cups' },
      { name: 'olive oil', quantity: 3, unit: 'tbsp' },
    ],
    steps: ['Boil pasta', 'Prepare vegetables', 'Toss together', 'Season to taste'],
    tags: ['pasta', 'vegetarian', 'light'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'recipe-3',
    title: 'Vegetable Soup',
    summary: 'Hearty soup with fresh ingredients',
    servings: 6,
    cookTimeMinutes: 30,
    difficulty: '⭐ Easy',
    ingredients: [
      { name: 'vegetables', quantity: 4, unit: 'cups' },
      { name: 'broth', quantity: 6, unit: 'cups' },
      { name: 'herbs', quantity: 2, unit: 'tbsp' },
    ],
    steps: ['Chop vegetables', 'Heat broth', 'Add vegetables', 'Simmer 20 min', 'Add herbs'],
    tags: ['soup', 'vegetarian', 'warming'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'recipe-4',
    title: 'Roasted Vegetables',
    summary: 'Seasonal roasted vegetables',
    servings: 4,
    cookTimeMinutes: 45,
    difficulty: '⭐ Easy',
    ingredients: [
      { name: 'vegetables', quantity: 4, unit: 'cups' },
      { name: 'oil', quantity: 3, unit: 'tbsp' },
      { name: 'herbs', quantity: 2, unit: 'tbsp' },
    ],
    steps: ['Preheat oven', 'Toss vegetables', 'Roast 30 min', 'Season to taste'],
    tags: ['roasted', 'vegetarian', 'side-dish'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'recipe-5',
    title: 'Fresh Salad',
    summary: 'Light and refreshing salad',
    servings: 2,
    cookTimeMinutes: 10,
    difficulty: '⭐ Easy',
    ingredients: [
      { name: 'vegetables', quantity: 3, unit: 'cups' },
      { name: 'oil', quantity: 2, unit: 'tbsp' },
      { name: 'vinegar', quantity: 1, unit: 'tbsp' },
    ],
    steps: ['Wash vegetables', 'Chop vegetables', 'Mix dressing', 'Toss together', 'Serve cold'],
    tags: ['salad', 'vegetarian', 'fresh'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export async function getRecipeRecommendations(householdId: string) {
  // Return mock recipes - in production this would call Claude/Bedrock
  return {
    recommendations: MOCK_RECIPES,
    source: 'mock',
    householdId,
  };
}
