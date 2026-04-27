import { v4 as uuid } from 'uuid';
import { put, get, query, remove } from './db.js';
import type { LocalUser } from './auth.js';

function now() {
  return new Date().toISOString();
}

function hoursUntilExpiry(expiryAt: string): number {
  return Math.round((new Date(expiryAt).getTime() - Date.now()) / 3_600_000);
}

function statusColor(expiryAt: string): string {
  const h = hoursUntilExpiry(expiryAt);
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
  const updated = { ...existing, ...input, updatedAt: now(), _version: (existing._version as number) + 1 };
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
  return { ...item, hoursUntilExpiry: hoursUntilExpiry(item.expiryAt as string), statusColor: statusColor(item.expiryAt as string) };
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
  const updated = { ...existing, ...input, updatedAt: now(), _version: (existing._version as number) + 1 };
  await put(updated);
  return { ...updated, hoursUntilExpiry: hoursUntilExpiry(updated.expiryAt as string), statusColor: statusColor(updated.expiryAt as string) };
}

async function changeItemStatus(
  householdId: string,
  id: string,
  status: string,
  extraFields: Record<string, unknown> = {},
) {
  const existing = await get(`HOUSEHOLD#${householdId}`, `ITEM#${id}`);
  if (!existing) throw new Error('Item not found');
  const updated = { ...existing, status, updatedAt: now(), ...extraFields, _version: (existing._version as number) + 1 };
  await put(updated);
  return { ...updated, hoursUntilExpiry: hoursUntilExpiry(updated.expiryAt as string), statusColor: statusColor(updated.expiryAt as string) };
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
  { foodType: 'leftover_pasta', foodName: 'Pasta with marinara', category: 'leftover', fridgeDays: 3 },
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
