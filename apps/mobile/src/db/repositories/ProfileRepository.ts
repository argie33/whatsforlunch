import { Database, Collection, Q } from '@nozbe/watermelondb';
import { BaseRepository } from './BaseRepository';
import { Profile } from '../models/Profile';

export class ProfileRepository extends BaseRepository<Profile> {
  protected get collection(): Collection<Profile> {
    return this.db.get<Profile>('profiles');
  }

  async getOwn(userId: string): Promise<Profile | null> {
    const results = await this.collection
      .query(
        Q.where('cloud_id', userId),
        Q.where('deleted_at', Q.eq(null)),
      )
      .fetch();
    return results[0] ?? null;
  }

  async upsertFromCloud(data: {
    id: string;
    email: string;
    displayName?: string | null;
    photoUrl?: string | null;
    timeZone: string;
    units: string;
    subscriptionTier: string;
    aiQuotaUsedToday: number;
    version: number;
    lastChangedAt: number;
    deletedAt?: number | null;
  }): Promise<Profile> {
    return this.db.write(async () => {
      const existing = await this.findByCloudId(data.id);
      if (existing) {
        if (data.lastChangedAt <= existing.lastChangedAt && existing.version > 0) {
          return existing;
        }
        return existing.update((record) => {
          record.email = data.email;
          if (data.displayName != null) record.displayName = data.displayName;
          if (data.photoUrl != null) record.photoUrl = data.photoUrl;
          record.timeZone = data.timeZone;
          record.units = data.units;
          record.subscriptionTier = data.subscriptionTier;
          record.aiQuotaUsedToday = data.aiQuotaUsedToday;
          record.version = data.version;
          record.lastChangedAt = data.lastChangedAt;
          if (data.deletedAt != null) record.deletedAt = data.deletedAt;
        });
      }
      return this.collection.create((record) => {
        record.cloudId = data.id;
        record.email = data.email;
        if (data.displayName != null) record.displayName = data.displayName;
        if (data.photoUrl != null) record.photoUrl = data.photoUrl;
        record.timeZone = data.timeZone;
        record.units = data.units;
        record.subscriptionTier = data.subscriptionTier;
        record.aiQuotaUsedToday = data.aiQuotaUsedToday;
        record.version = data.version;
        record.lastChangedAt = data.lastChangedAt;
        if (data.deletedAt != null) record.deletedAt = data.deletedAt;
      });
    });
  }
}
