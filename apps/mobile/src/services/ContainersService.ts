import { generateClient } from 'aws-amplify/api';
import type { Database } from '@nozbe/watermelondb';
import { Q } from '@nozbe/watermelondb';
import { Container } from '@/db/models/Container';
import { Item } from '@/db/models/Item';

const client = generateClient();

// ─── Input / result types (mirror docs/03_API_SPEC.md GraphQL inputs) ────────

export interface CreateContainerInput {
  qrToken: string;
  householdId?: string;
  nickname?: string;
  clientId: string;
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
  /** All non-archived containers for a household, from local DB. */
  async getHouseholdContainers(db: Database, householdId: string): Promise<Container[]> {
    return db.get<Container>('containers').query(
      Q.where('household_id', householdId),
      Q.where('archived_at', Q.eq(null)),
    ).fetch();
  }

  /** Lookup by QR token from local DB. Phase B falls back to network. */
  async getContainerByQrToken(db: Database, qrToken: string): Promise<Container | null> {
    const results = await db.get<Container>('containers').query(
      Q.where('qr_token', qrToken),
    ).fetch();
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
   * Phase B: getContainerByQrToken GraphQL query.
   */
  async resolveQrToken(db: Database, qrToken: string): Promise<QrTokenResolution> {
    const local = await this.getContainerByQrToken(db, qrToken);
    if (local) return { status: 'mine', containerId: local.id };
    // Phase B: network call to check ownership
    // const res = await client.graphql({ query: GET_CONTAINER_BY_QR_TOKEN, variables: { qrToken } });
    return { status: 'unclaimed' };
  }

  /**
   * Claim an unclaimed QR token → createContainer mutation.
   * Phase B: write to local DB after network success.
   */
  async createContainer(_input: CreateContainerInput): Promise<{ id: string; qrToken: string }> {
    // Phase B: const res = await client.graphql({ query: CREATE_CONTAINER, variables: { input } });
    throw new Error('ContainersService.createContainer — Phase B');
  }

  /**
   * Update container nickname or image.
   * Phase B: optimistic local write + updateContainer mutation.
   */
  async updateContainer(_db: Database, _id: string, _input: UpdateContainerInput): Promise<void> {
    throw new Error('ContainersService.updateContainer — Phase B');
  }

  /** Soft-delete: sets archivedAt. Phase B: archiveContainer mutation. */
  async archiveContainer(_db: Database, _id: string): Promise<void> {
    throw new Error('ContainersService.archiveContainer — Phase B');
  }

  /** Restore an archived container. Phase B: unarchiveContainer mutation. */
  async unarchiveContainer(_db: Database, _id: string): Promise<void> {
    throw new Error('ContainersService.unarchiveContainer — Phase B');
  }

  /** Current active item + last 50 history items for a container. Local DB. */
  async getContainerItems(db: Database, containerId: string): Promise<Item[]> {
    return db.get<Item>('items').query(
      Q.where('container_id', containerId),
      Q.sortBy('stored_at', Q.desc),
      Q.take(51),
    ).fetch();
  }
}

export const containersService = new ContainersService();
