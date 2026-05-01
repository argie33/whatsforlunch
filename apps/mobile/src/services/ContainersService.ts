import type { Database } from '@nozbe/watermelondb';
import { Q } from '@nozbe/watermelondb';
import { Container } from '@/db/models/Container';
import { Item } from '@/db/models/Item';
import { ContainerRepository } from '@/db/repositories/ContainerRepository';
import { writeQueue } from '@/db/queue';

// ─── Input / result types (mirror docs/03_API_SPEC.md GraphQL inputs) ────────

export interface ClaimContainerInput {
  householdId: string;
  qrToken: string;
  nickname?: string;
}

export interface UpdateContainerInput {
  nickname?: string;
  imageUrl?: string;
}

export type QrTokenResolution =
  | { status: 'mine'; containerId: string }
  | { status: 'other' }
  | { status: 'unclaimed' };

// ─── Service ──────────────────────────────────────────────────────────────────

export class ContainersService {
  /** Generate a unique QR number (1000-9999) for display alongside QR code. */
  async generateQRNumber(db: Database, householdId: string): Promise<number> {
    const existing = await db
      .get<Container>('containers')
      .query(Q.where('household_id', householdId))
      .fetch();
    const usedNumbers = new Set(existing.map((c: Container) => c.qrNumber));

    let attempts = 0;
    while (attempts < 9000) {
      const num = Math.floor(Math.random() * 9000) + 1000;
      if (!usedNumbers.has(num)) {
        return num;
      }
      attempts++;
    }
    throw new Error('Unable to generate unique QR number');
  }

  /** All non-archived containers for a household, from local DB. */
  async getHouseholdContainers(db: Database, householdId: string): Promise<Container[]> {
    return db
      .get<Container>('containers')
      .query(Q.where('household_id', householdId), Q.where('archived_at', Q.eq(null)))
      .fetch();
  }

  /** Lookup by QR token from local DB. */
  async getContainerByQrToken(db: Database, qrToken: string): Promise<Container | null> {
    const results = await db
      .get<Container>('containers')
      .query(Q.where('qr_token', qrToken))
      .fetch();
    return results[0] ?? null;
  }

  /** Find a container by its WatermelonDB local id. */
  async getById(db: Database, id: string): Promise<Container | null> {
    try {
      return await db.get<Container>('containers').find(id);
    } catch {
      return null;
    }
  }

  /**
   * Resolve a scanned QR token: mine | other | unclaimed.
   * Checks local DB first; if not found, returns unclaimed.
   */
  async resolveQrToken(db: Database, qrToken: string): Promise<QrTokenResolution> {
    const local = await this.getContainerByQrToken(db, qrToken);
    if (local) return { status: 'mine', containerId: local.id };
    return { status: 'unclaimed' };
  }

  /**
   * Claim an unclaimed QR sticker — creates a container locally
   * and enqueues a claimContainer mutation.
   */
  async claimContainer(db: Database, input: ClaimContainerInput): Promise<Container> {
    const repo = new ContainerRepository(db);
    const qrNumber = await this.generateQRNumber(db, input.householdId);

    const container = await repo.create({
      householdId: input.householdId,
      qrToken: input.qrToken,
      qrNumber,
      nickname: input.nickname,
      claimedAt: Date.now(),
    });

    writeQueue.enqueue({
      type: 'claimContainer',
      localId: container.id,
      cloudId: container.cloudId,
      householdId: input.householdId,
      payload: {
        householdId: input.householdId,
        qrToken: input.qrToken,
        qrNumber,
        nickname: input.nickname ?? null,
      },
    });

    return container;
  }

  /**
   * Update container nickname or image — optimistic local write + enqueue.
   */
  async updateContainer(db: Database, id: string, input: UpdateContainerInput): Promise<void> {
    const repo = new ContainerRepository(db);
    const container = await repo.findById(id);
    if (!container) throw new Error(`Container ${id} not found`);

    await repo.update(container, {
      nickname: input.nickname,
      imageUrl: input.imageUrl,
    });

    writeQueue.enqueue({
      type: 'updateContainer',
      localId: container.id,
      cloudId: container.cloudId,
      householdId: container.householdId,
      payload: {
        ...(input.nickname != null && { nickname: input.nickname }),
        ...(input.imageUrl != null && { imageUrl: input.imageUrl }),
      },
    });
  }

  /** Archive a container — sets archivedAt locally + enqueues archiveContainer. */
  async archiveContainer(db: Database, id: string): Promise<void> {
    const repo = new ContainerRepository(db);
    const container = await repo.findById(id);
    if (!container) throw new Error(`Container ${id} not found`);

    await repo.update(container, { archivedAt: Date.now() });

    writeQueue.enqueue({
      type: 'archiveContainer',
      localId: container.id,
      cloudId: container.cloudId,
      householdId: container.householdId,
      payload: {},
    });
  }

  /** Restore an archived container — clears archivedAt locally + enqueues updateContainer. */
  async unarchiveContainer(db: Database, id: string): Promise<void> {
    const repo = new ContainerRepository(db);
    const container = await repo.findById(id);
    if (!container) throw new Error(`Container ${id} not found`);

    await repo.update(container, { archivedAt: undefined });

    writeQueue.enqueue({
      type: 'updateContainer',
      localId: container.id,
      cloudId: container.cloudId,
      householdId: container.householdId,
      payload: { archivedAt: null },
    });
  }

  /** Current active + last 50 history items for a container. Local DB. */
  async getContainerItems(db: Database, containerId: string): Promise<Item[]> {
    return db
      .get<Item>('items')
      .query(Q.where('container_id', containerId), Q.sortBy('stored_at', Q.desc), Q.take(51))
      .fetch();
  }
}

export const containersService = new ContainersService();
