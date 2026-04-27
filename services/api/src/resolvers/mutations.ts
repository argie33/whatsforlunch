import { v4 as uuidv4 } from 'uuid';
import { buildAttrs, getItem, putItem, updateItem, nowIso, nowMs } from '../db';

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
  allowed.forEach((f) => {
    if (input[f] !== undefined) fields[f] = input[f];
  });

  const updated = await updateItem(pk, sk, fields);
  if (!updated) throw new Error('Item not found');
  return { ...updated, photoUrl: updated.photoPath };
}

export async function deleteItem(
  _: unknown,
  { id, householdId }: { id: string; householdId: string },
) {
  await updateItem(`HOUSEHOLD#${householdId}`, `ITEM#${id}`, {
    deletedAt: nowIso(),
  });
  return true;
}

export async function markItemEaten(
  _: unknown,
  { id, householdId }: { id: string; householdId: string },
) {
  const updated = await updateItem(`HOUSEHOLD#${householdId}`, `ITEM#${id}`, {
    status: 'eaten',
    eatenAt: nowIso(),
  });
  return updated;
}

export async function markItemTossed(
  _: unknown,
  { id, householdId }: { id: string; householdId: string },
) {
  const updated = await updateItem(`HOUSEHOLD#${householdId}`, `ITEM#${id}`, {
    status: 'tossed',
    tossedAt: nowIso(),
  });
  return updated;
}

export async function markItemFrozen(
  _: unknown,
  { id, householdId }: { id: string; householdId: string },
) {
  const updated = await updateItem(`HOUSEHOLD#${householdId}`, `ITEM#${id}`, {
    status: 'frozen',
    frozenAt: nowIso(),
  });
  return updated;
}

export async function markItemPartial(
  _: unknown,
  { id, householdId, input }: {
    id: string;
    householdId: string;
    input: { quantityText: string; quantityValue?: number; quantityUnit?: string };
  },
) {
  const updated = await updateItem(`HOUSEHOLD#${householdId}`, `ITEM#${id}`, {
    status: 'partial',
    quantityText: input.quantityText,
    ...(input.quantityValue != null ? { quantityValue: input.quantityValue } : {}),
    ...(input.quantityUnit ? { quantityUnit: input.quantityUnit } : {}),
  });
  return updated;
}
