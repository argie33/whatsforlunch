import { v4 as uuid } from 'uuid';
import { put, get } from './db.js';

function now() {
  return new Date().toISOString();
}

export async function claimContainer(input: {
  householdId: string;
  qrToken: string;
  nickname?: string;
}) {
  const id = uuid();
  const ts = now();
  const container = {
    PK: `HOUSEHOLD#${input.householdId}`,
    SK: `CONTAINER#${id}`,
    id,
    entityType: 'Container',
    householdId: input.householdId,
    qrToken: input.qrToken,
    qrNumber: Math.floor(Math.random() * 100000),
    nickname: input.nickname || null,
    imageUrl: null,
    claimedAt: ts,
    claimedBy: null,
    archivedAt: null,
    createdAt: ts,
    updatedAt: ts,
    _version: 1,
    _lastChangedAt: Date.now(),
  };
  await put(container);
  return container;
}

export async function updateContainer(input: {
  householdId: string;
  id: string;
  nickname?: string;
  imageUrl?: string;
}) {
  const existing = await get(`HOUSEHOLD#${input.householdId}`, `CONTAINER#${input.id}`);
  if (!existing) throw new Error('Container not found');
  const updated = {
    ...existing,
    ...(input.nickname !== undefined && { nickname: input.nickname }),
    ...(input.imageUrl !== undefined && { imageUrl: input.imageUrl }),
    updatedAt: now(),
    _version: (existing._version as number) + 1,
  };
  await put(updated);
  return updated;
}

export async function archiveContainer(input: { householdId: string; id: string }) {
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
