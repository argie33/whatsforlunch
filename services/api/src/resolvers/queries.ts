import { queryAll } from '../db';

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

export async function listContainers(
  _: unknown,
  { householdId }: { householdId: string },
) {
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
    hoursUntilExpiry: Math.ceil((new Date(r.expiryAt as string).getTime() - Date.now()) / 3_600_000),
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
