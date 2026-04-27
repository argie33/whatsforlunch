import { getItem, putItem, updateAttrs, queryAll, buildAttrs, nowIso, uuid } from './db.js';
import { signToken } from './auth.js';
import type { JwtPayload } from './auth.js';

// ─── Auth ─────────────────────────────────────────────────────────────────────

export async function signIn(email: string): Promise<{ token: string; userId: string }> {
  const userId = `local-${email.replace(/[^a-z0-9]/gi, '-').toLowerCase()}`;
  const householdId = `hh-${userId}`;

  // Upsert profile
  const existing = await getItem(`USER#${userId}`, 'PROFILE');
  if (!existing) {
    await putItem(buildAttrs({
      PK: `USER#${userId}`,
      SK: 'PROFILE',
      entityType: 'Profile',
      id: userId,
      email,
      displayName: email.split('@')[0],
      timeZone: 'America/New_York',
      units: 'imperial',
      locale: 'en-US',
      dietaryPreferences: [],
      cuisinePreferences: [],
      allergies: [],
      defaultHouseholdId: householdId,
      subscriptionTier: 'free',
      aiQuotaUsedToday: 0,
      aiQuotaResetAt: new Date(Date.now() + 86400_000).toISOString(),
    }));

    // Upsert household
    await putItem(buildAttrs({
      PK: `HOUSEHOLD#${householdId}`,
      SK: 'META',
      entityType: 'Household',
      id: householdId,
      name: `${email.split('@')[0]}'s Kitchen`,
      ownerId: userId,
      memberCount: 1,
    }));

    // Membership
    await putItem(buildAttrs({
      PK: `HOUSEHOLD#${householdId}`,
      SK: `MEMBER#${userId}`,
      entityType: 'HouseholdMember',
      userId,
      displayName: email.split('@')[0],
      role: 'owner',
      joinedAt: nowIso(),
      GSI1PK: `USER#${userId}`,
      GSI1SK: `HOUSEHOLD#${householdId}`,
    }));
  }

  const token = signToken({ sub: userId, email, householdId });
  console.log(`[local-auth] signed in ${email} → ${userId}`);
  return { token, userId };
}

// ─── Profile ──────────────────────────────────────────────────────────────────

export async function getProfile(user: JwtPayload): Promise<Record<string, unknown>> {
  const profile = await getItem(`USER#${user.sub}`, 'PROFILE');
  if (!profile) throw new Error('Profile not found');
  return profile;
}

export async function updateProfile(user: JwtPayload, input: Record<string, unknown>): Promise<Record<string, unknown>> {
  const updated = await updateAttrs(`USER#${user.sub}`, 'PROFILE', input);
  if (!updated) throw new Error('Profile not found');
  return updated;
}

// ─── Households ───────────────────────────────────────────────────────────────

export async function listHouseholds(user: JwtPayload): Promise<Record<string, unknown>[]> {
  const memberships = await queryAll(
    'GSI1PK = :pk AND begins_with(GSI1SK, :sk)',
    { ':pk': `USER#${user.sub}`, ':sk': 'HOUSEHOLD#' },
    undefined,
    'GSI1',
  );
  const households = await Promise.all(
    memberships.map(async (m) => {
      // GSI1SK = "HOUSEHOLD#<id>"
      const householdId = (m['GSI1SK'] as string).replace('HOUSEHOLD#', '');
      const hh = await getItem(`HOUSEHOLD#${householdId}`, 'META');
      return hh ? { ...hh, members: [] } : null;
    }),
  );
  return households.filter(Boolean) as Record<string, unknown>[];
}

// ─── Items ────────────────────────────────────────────────────────────────────

function mapItem(r: Record<string, unknown>) {
  const expiryAt = r['expiryAt'] as string | undefined;
  const hoursUntilExpiry = expiryAt
    ? Math.ceil((new Date(expiryAt).getTime() - Date.now()) / 3_600_000)
    : null;
  let statusColor = 'fresh';
  if (r['status'] !== 'active') statusColor = 'neutral';
  else if (hoursUntilExpiry === null) statusColor = 'fresh';
  else if (hoursUntilExpiry < 0) statusColor = 'expired';
  else if (hoursUntilExpiry < 24) statusColor = 'urgent';
  else if (hoursUntilExpiry < 72) statusColor = 'soon';

  return {
    ...r,
    photoUrl: r['photoPath'] ?? null,
    hoursUntilExpiry,
    statusColor,
  };
}

export async function listItems(
  householdId: string,
  status?: string,
): Promise<Record<string, unknown>[]> {
  const rows = await queryAll(
    'PK = :pk AND begins_with(SK, :sk)',
    { ':pk': `HOUSEHOLD#${householdId}`, ':sk': 'ITEM#' },
  );
  const filtered = status ? rows.filter((r) => r['status'] === status) : rows;
  return filtered.filter((r) => !r['deletedAt']).map(mapItem);
}

export async function createItem(
  user: JwtPayload,
  input: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const id = (input['clientId'] as string | undefined) ?? uuid();
  const householdId = input['householdId'] as string;

  const item = buildAttrs({
    PK: `HOUSEHOLD#${householdId}`,
    SK: `ITEM#${id}`,
    entityType: 'Item',
    id,
    householdId,
    addedByUserId: user.sub,
    containerId: input['containerId'] ?? null,
    foodType: input['foodType'],
    foodName: input['foodName'],
    category: input['category'] ?? 'prepared',
    storageLocation: input['storageLocation'],
    quantityText: input['quantityText'] ?? null,
    quantityValue: input['quantityValue'] ?? null,
    quantityUnit: input['quantityUnit'] ?? null,
    storedAt: input['storedAt'],
    storedTz: input['storedTz'],
    expiryAt: input['expiryAt'],
    expirySource: input['expirySource'],
    expiryConfidence: input['expiryConfidence'] ?? null,
    notes: input['notes'] ?? null,
    photoPath: input['photoPath'] ?? null,
    barcode: input['barcode'] ?? null,
    priceUsd: input['priceUsd'] ?? null,
    status: 'active',
    eatenAt: null,
    tossedAt: null,
    frozenAt: null,
    transferredToContainerId: null,
    deletedAt: null,
    GSI2PK: `EXPIRING#${householdId}`,
    GSI2SK: input['expiryAt'],
  });

  await putItem(item);
  return mapItem(item);
}

export async function updateItem(input: Record<string, unknown>): Promise<Record<string, unknown>> {
  const householdId = input['householdId'] as string;
  const id = input['id'] as string;
  const allowed = ['foodType', 'foodName', 'storageLocation', 'expiryAt', 'quantityText', 'quantityValue', 'quantityUnit', 'notes', 'photoPath'];
  const fields: Record<string, unknown> = {};
  allowed.forEach((f) => { if (input[f] !== undefined) fields[f] = input[f]; });
  const updated = await updateAttrs(`HOUSEHOLD#${householdId}`, `ITEM#${id}`, fields);
  if (!updated) throw new Error('Item not found');
  return mapItem(updated);
}

export async function deleteItem(householdId: string, id: string): Promise<boolean> {
  await updateAttrs(`HOUSEHOLD#${householdId}`, `ITEM#${id}`, { deletedAt: nowIso(), status: 'deleted' });
  return true;
}

export async function markItemStatus(
  householdId: string,
  id: string,
  status: string,
  tsField: string,
): Promise<Record<string, unknown>> {
  const updated = await updateAttrs(`HOUSEHOLD#${householdId}`, `ITEM#${id}`, {
    status,
    [tsField]: nowIso(),
  });
  if (!updated) throw new Error('Item not found');
  return mapItem(updated);
}

// ─── Delta sync ───────────────────────────────────────────────────────────────

export async function deltaSync(
  householdId: string,
  lastSyncTimestamp?: string | null,
): Promise<Record<string, unknown>> {
  const since = lastSyncTimestamp ? new Date(lastSyncTimestamp).getTime() : 0;
  const serverTimestamp = nowIso();

  const [items, containers] = await Promise.all([
    queryAll('PK = :pk AND begins_with(SK, :sk)', { ':pk': `HOUSEHOLD#${householdId}`, ':sk': 'ITEM#' })
      .then((rows) => rows.filter((r) => Number(r['_lastChangedAt']) > since).map(mapItem)),
    queryAll('PK = :pk AND begins_with(SK, :sk)', { ':pk': `HOUSEHOLD#${householdId}`, ':sk': 'CONTAINER#' })
      .then((rows) => rows.filter((r) => Number(r['_lastChangedAt']) > since)),
  ]);

  return { items, containers, shoppingList: [], serverTimestamp };
}

// ─── AI mock ─────────────────────────────────────────────────────────────────

const MOCK_FOODS = [
  { foodName: 'Leftover Pasta', foodType: 'prepared', category: 'prepared', storageLocation: 'fridge', expiryDays: 4 },
  { foodName: 'Cooked Chicken', foodType: 'protein', category: 'protein', storageLocation: 'fridge', expiryDays: 3 },
  { foodName: 'Greek Yogurt', foodType: 'dairy', category: 'dairy', storageLocation: 'fridge', expiryDays: 14 },
  { foodName: 'Spinach', foodType: 'produce', category: 'produce', storageLocation: 'fridge', expiryDays: 5 },
];

export async function classifyFood(
  user: JwtPayload,
  householdId: string,
): Promise<Record<string, unknown>> {
  const mock = MOCK_FOODS[Math.floor(Math.random() * MOCK_FOODS.length)]!;
  const expiryAt = new Date(Date.now() + mock.expiryDays * 86400_000).toISOString();
  const id = uuid();

  const item = buildAttrs({
    PK: `HOUSEHOLD#${householdId}`,
    SK: `ITEM#${id}`,
    entityType: 'Item',
    id,
    householdId,
    addedByUserId: user.sub,
    containerId: null,
    foodType: mock.foodType,
    foodName: mock.foodName,
    category: mock.category,
    storageLocation: mock.storageLocation,
    storedAt: nowIso(),
    storedTz: 'America/New_York',
    expiryAt,
    expirySource: 'ai',
    expiryConfidence: 0.85,
    status: 'active',
    eatenAt: null,
    tossedAt: null,
    frozenAt: null,
    deletedAt: null,
  });

  await putItem(item);
  return mapItem(item);
}
