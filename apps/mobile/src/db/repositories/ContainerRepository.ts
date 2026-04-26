import { Database, Collection, Q } from '@nozbe/watermelondb';
import { Observable } from 'rxjs';
import { BaseRepository } from './BaseRepository';
import { Container } from '../models/Container';

export interface CreateContainerInput {
  householdId: string;
  qrToken: string;
  nickname?: string;
  imageUrl?: string;
  claimedAt: number;
}

export interface UpdateContainerInput {
  nickname?: string;
  imageUrl?: string;
  archivedAt?: number;
}

export class ContainerRepository extends BaseRepository<Container> {
  protected get collection(): Collection<Container> {
    return this.db.get<Container>('containers');
  }

  async create(input: CreateContainerInput): Promise<Container> {
    return this.db.write(async () => {
      const cloudId = this.generateId();
      return this.collection.create((record) => {
        record.cloudId = cloudId;
        record.householdId = input.householdId;
        record.qrToken = input.qrToken;
        if (input.nickname) record.nickname = input.nickname;
        if (input.imageUrl) record.imageUrl = input.imageUrl;
        record.claimedAt = input.claimedAt;
        record.version = 0;
        record.lastChangedAt = this.now();
      });
    });
  }

  async update(container: Container, input: UpdateContainerInput): Promise<Container> {
    return this.db.write(async () => {
      return container.update((record) => {
        if (input.nickname != null) record.nickname = input.nickname;
        if (input.imageUrl != null) record.imageUrl = input.imageUrl;
        if (input.archivedAt != null) record.archivedAt = input.archivedAt;
        record.lastChangedAt = this.now();
      });
    });
  }

  async softDelete(container: Container): Promise<void> {
    await this.db.write(async () => {
      await container.update((record) => {
        record.deletedAt = this.now();
        record.lastChangedAt = this.now();
      });
    });
  }

  observeByHousehold(householdId: string, includeArchived = false): Observable<Container[]> {
    const conditions = [
      Q.where('household_id', householdId),
      Q.where('deleted_at', Q.eq(null)),
    ];
    if (!includeArchived) {
      conditions.push(Q.where('archived_at', Q.eq(null)));
    }
    return this.collection.query(...conditions).observe() as unknown as Observable<Container[]>;
  }

  async findByQrToken(qrToken: string): Promise<Container | null> {
    const results = await this.collection
      .query(Q.where('qr_token', qrToken))
      .fetch();
    return results[0] ?? null;
  }

  async upsertFromCloud(data: {
    id: string;
    householdId: string;
    qrToken: string;
    nickname?: string | null;
    imageUrl?: string | null;
    claimedAt: number;
    archivedAt?: number | null;
    version: number;
    lastChangedAt: number;
    deletedAt?: number | null;
  }): Promise<Container> {
    return this.db.write(async () => {
      const existing = await this.findByCloudId(data.id);
      if (existing) {
        if (data.lastChangedAt <= existing.lastChangedAt && existing.version > 0) {
          return existing;
        }
        return existing.update((record) => {
          record.householdId = data.householdId;
          record.qrToken = data.qrToken;
          if (data.nickname != null) record.nickname = data.nickname;
          if (data.imageUrl != null) record.imageUrl = data.imageUrl;
          record.claimedAt = data.claimedAt;
          if (data.archivedAt != null) record.archivedAt = data.archivedAt;
          record.version = data.version;
          record.lastChangedAt = data.lastChangedAt;
          if (data.deletedAt != null) record.deletedAt = data.deletedAt;
        });
      }
      return this.collection.create((record) => {
        record.cloudId = data.id;
        record.householdId = data.householdId;
        record.qrToken = data.qrToken;
        if (data.nickname != null) record.nickname = data.nickname;
        if (data.imageUrl != null) record.imageUrl = data.imageUrl;
        record.claimedAt = data.claimedAt;
        if (data.archivedAt != null) record.archivedAt = data.archivedAt;
        record.version = data.version;
        record.lastChangedAt = data.lastChangedAt;
        if (data.deletedAt != null) record.deletedAt = data.deletedAt;
      });
    });
  }
}
