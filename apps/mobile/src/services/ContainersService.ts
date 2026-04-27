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
   * Sends to backend, then updates local DB.
   */
  async createContainer(input: CreateContainerInput): Promise<{ id: string; qrToken: string }> {
    const CREATE_CONTAINER = /* GraphQL */ `
      mutation CreateContainer($input: CreateContainerInput!) {
        createContainer(input: $input) {
          id
          qrToken
          nickname
          householdId
          _version
          _lastChangedAt
        }
      }
    `;

    try {
      const result = await (client.graphql as Function)({
        query: CREATE_CONTAINER,
        variables: { input },
      });

      const created = result.data?.createContainer;
      if (!created?.id) {
        throw new Error('No ID returned from createContainer');
      }

      return { id: created.id, qrToken: created.qrToken };
    } catch (err) {
      console.error('[ContainersService] createContainer failed:', err);
      throw new Error(`Failed to create container: ${err}`);
    }
  }

  /**
   * Update container nickname or image.
   */
  async updateContainer(db: Database, householdId: string, id: string, input: UpdateContainerInput): Promise<void> {
    const UPDATE_CONTAINER = /* GraphQL */ `
      mutation UpdateContainer($input: UpdateContainerInput!) {
        updateContainer(input: $input) {
          id
          nickname
          imageUrl
          _version
          _lastChangedAt
        }
      }
    `;

    try {
      await (client.graphql as Function)({
        query: UPDATE_CONTAINER,
        variables: {
          input: {
            householdId,
            containerId: id,
            ...input,
          },
        },
      });

      const container = await db.get<Container>('containers').find(id);
      await db.write(async () => {
        await container.update((record) => {
          if (input.nickname) record.nickname = input.nickname;
          if (input.imageUrl) record.imageUrl = input.imageUrl;
        });
      });
    } catch (err) {
      console.error('[ContainersService] updateContainer failed:', err);
      throw new Error(`Failed to update container: ${err}`);
    }
  }

  /** Soft-delete: sets archivedAt. */
  async archiveContainer(db: Database, householdId: string, id: string): Promise<void> {
    const ARCHIVE_CONTAINER = /* GraphQL */ `
      mutation ArchiveContainer($input: ArchiveContainerInput!) {
        archiveContainer(input: $input) {
          id
          archivedAt
          _version
          _lastChangedAt
        }
      }
    `;

    try {
      await (client.graphql as Function)({
        query: ARCHIVE_CONTAINER,
        variables: {
          input: { householdId, containerId: id },
        },
      });

      const container = await db.get<Container>('containers').find(id);
      await db.write(async () => {
        await container.update((record) => {
          record.archivedAt = new Date().toISOString();
        });
      });
    } catch (err) {
      console.error('[ContainersService] archiveContainer failed:', err);
      throw new Error(`Failed to archive container: ${err}`);
    }
  }

  /** Restore an archived container. */
  async unarchiveContainer(db: Database, householdId: string, id: string): Promise<void> {
    const UNARCHIVE_CONTAINER = /* GraphQL */ `
      mutation UnarchiveContainer($input: UnarchiveContainerInput!) {
        unarchiveContainer(input: $input) {
          id
          archivedAt
          _version
          _lastChangedAt
        }
      }
    `;

    try {
      await (client.graphql as Function)({
        query: UNARCHIVE_CONTAINER,
        variables: {
          input: { householdId, containerId: id },
        },
      });

      const container = await db.get<Container>('containers').find(id);
      await db.write(async () => {
        await container.update((record) => {
          record.archivedAt = null;
        });
      });
    } catch (err) {
      console.error('[ContainersService] unarchiveContainer failed:', err);
      throw new Error(`Failed to unarchive container: ${err}`);
    }
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
