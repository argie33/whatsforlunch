import { v4 as uuid } from 'uuid';
import { put, get, query, remove } from './db.js';
import type { LocalUser } from './auth.js';
import { createPhaseCResolvers } from './resolvers/phase-c.js';

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
  };
  await put(item);
  return {
    ...item,
    hoursUntilExpiry: hoursUntilExpiry(item.expiryAt as string),
    statusColor: statusColor(item.expiryAt as string),
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

// ─── AI (mocked) ─────────────────────────────────────────────────────────────

const MOCK_FOODS = [
  {
    foodType: 'leftover_pasta',
    foodName: 'Pasta with marinara',
    category: 'leftover',
    fridgeDays: 3,
  },
  { foodType: 'roasted_chicken', foodName: 'Roasted chicken', category: 'protein', fridgeDays: 4 },
  { foodType: 'greek_yogurt', foodName: 'Greek yogurt', category: 'dairy', fridgeDays: 14 },
  { foodType: 'mixed_salad', foodName: 'Mixed green salad', category: 'produce', fridgeDays: 1 },
  { foodType: 'cooked_rice', foodName: 'White rice', category: 'grain', fridgeDays: 4 },
];

export async function classifyFood(user: LocalUser, householdId: string, photoUrl: string) {
  const food = MOCK_FOODS[Math.floor(Math.random() * MOCK_FOODS.length)];
  const expiryAt = new Date(Date.now() + food.fridgeDays * 86_400_000).toISOString();

  return createItem(user, {
    householdId,
    foodType: food.foodType,
    foodName: food.foodName,
    category: food.category,
    storageLocation: 'fridge',
    expiryAt,
    expirySource: 'ai',
    expiryConfidence: 0.85 + Math.random() * 0.14,
    photoUrl,
  });
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
  return phaseCResolvers.recommendations.getRecommendations(householdId, userId);
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
