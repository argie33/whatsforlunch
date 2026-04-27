import { v4 as uuidv4 } from 'uuid';
import {
  buildAttrs,
  putItem,
  updateItem as dbUpdate,
  nowIso,
  nowMs,
} from '../db';

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
    hoursUntilExpiry: Math.ceil((new Date(item.expiryAt as string).getTime() - Date.now()) / 3_600_000),
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
  const allowed = ['foodType', 'foodName', 'storageLocation', 'expiryAt', 'quantityText', 'quantityValue', 'quantityUnit', 'notes', 'photoPath'];
  allowed.forEach((f) => { if (input[f] !== undefined) fields[f] = input[f]; });

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
  { id, householdId, input }: {
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
  { input }: { input: { containerId: string; householdId: string; nickname?: string; imageUrl?: string } },
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
