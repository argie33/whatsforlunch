import { Database, Collection, Q } from '@nozbe/watermelondb';
import { Observable } from 'rxjs';
import { BaseRepository } from './BaseRepository';
import { Household } from '../models/Household';
import { HouseholdMember } from '../models/HouseholdMember';

export class HouseholdRepository extends BaseRepository<Household> {
  protected get collection(): Collection<Household> {
    return this.db.get<Household>('households');
  }

  private get memberCollection(): Collection<HouseholdMember> {
    return this.db.get<HouseholdMember>('household_members');
  }

  observeAll(): Observable<Household[]> {
    return this.collection
      .query(Q.where('deleted_at', Q.eq(null)))
      .observe() as unknown as Observable<Household[]>;
  }

  observeMembersOf(householdId: string): Observable<HouseholdMember[]> {
    return this.memberCollection
      .query(
        Q.where('household_id', householdId),
        Q.where('deleted_at', Q.eq(null)),
      )
      .observe() as unknown as Observable<HouseholdMember[]>;
  }

  async upsertFromCloud(data: {
    id: string;
    name: string;
    ownerId: string;
    memberCount: number;
    version: number;
    lastChangedAt: number;
    deletedAt?: number | null;
  }): Promise<Household> {
    return this.db.write(async () => {
      const existing = await this.findByCloudId(data.id);
      if (existing) {
        if (data.lastChangedAt <= existing.lastChangedAt && existing.version > 0) {
          return existing;
        }
        return existing.update((record) => {
          record.name = data.name;
          record.ownerId = data.ownerId;
          record.memberCount = data.memberCount;
          record.version = data.version;
          record.lastChangedAt = data.lastChangedAt;
          if (data.deletedAt != null) record.deletedAt = data.deletedAt;
        });
      }
      return this.collection.create((record) => {
        record.cloudId = data.id;
        record.name = data.name;
        record.ownerId = data.ownerId;
        record.memberCount = data.memberCount;
        record.version = data.version;
        record.lastChangedAt = data.lastChangedAt;
        if (data.deletedAt != null) record.deletedAt = data.deletedAt;
      });
    });
  }

  async upsertMemberFromCloud(data: {
    id: string;
    householdId: string;
    userId: string;
    displayName?: string | null;
    role: string;
    joinedAt: number;
    version: number;
    lastChangedAt: number;
    deletedAt?: number | null;
  }): Promise<HouseholdMember> {
    return this.db.write(async () => {
      const existing = await this.memberCollection
        .query(Q.where('cloud_id', data.id))
        .fetch()
        .then((r) => r[0] ?? null);

      if (existing) {
        if (data.lastChangedAt <= existing.lastChangedAt && existing.version > 0) {
          return existing;
        }
        return existing.update((record) => {
          if (data.displayName != null) record.displayName = data.displayName;
          record.role = data.role;
          record.version = data.version;
          record.lastChangedAt = data.lastChangedAt;
          if (data.deletedAt != null) record.deletedAt = data.deletedAt;
        });
      }
      return this.memberCollection.create((record) => {
        record.cloudId = data.id;
        record.householdId = data.householdId;
        record.userId = data.userId;
        if (data.displayName != null) record.displayName = data.displayName;
        record.role = data.role;
        record.joinedAt = data.joinedAt;
        record.version = data.version;
        record.lastChangedAt = data.lastChangedAt;
        if (data.deletedAt != null) record.deletedAt = data.deletedAt;
      });
    });
  }
}
