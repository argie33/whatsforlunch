import type { Database } from '@nozbe/watermelondb';
import { Q } from '@nozbe/watermelondb';
import type { Profile } from '@/db/models/Profile';
import { writeQueue } from '@/db/queue';
import { posthog } from '@/lib/posthog';
import { SettingsEvents } from '@/features/settings/analytics';

export interface ProfileUpdateInput {
  displayName?: string;
  timeZone?: string;
  units?: string;
}

export class ProfileService {
  async getOwnProfile(db: Database, userId: string): Promise<Profile | null> {
    const results = await db
      .get<Profile>('profiles')
      .query(Q.where('cloud_id', userId), Q.where('deleted_at', Q.eq(null)))
      .fetch();
    return results[0] ?? null;
  }

  async updateProfile(db: Database, userId: string, input: ProfileUpdateInput): Promise<void> {
    const existing = await this.getOwnProfile(db, userId);

    if (existing) {
      await db.write(async () => {
        await existing.update((r) => {
          if (input.displayName != null) r.displayName = input.displayName;
          if (input.timeZone != null) r.timeZone = input.timeZone!;
          if (input.units != null) r.units = input.units!;
          r.lastChangedAt = Date.now();
          r.version = r.version + 1;
        });
      });
    } else {
      await db.write(async () => {
        await db.get<Profile>('profiles').create((r: any) => {
          r.cloudId = userId;
          r.email = '';
          r.displayName = input.displayName ?? '';
          r.timeZone = input.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
          r.units = input.units ?? 'imperial';
          r.subscriptionTier = 'free';
          r.aiQuotaUsedToday = 0;
          r.version = 1;
          r.lastChangedAt = Date.now();
        });
      });
    }

    writeQueue.enqueue({
      type: 'updateProfile',
      localId: userId,
      cloudId: userId,
      householdId: '',
      payload: {
        ...(input.displayName != null && { displayName: input.displayName }),
        ...(input.timeZone != null && { timeZone: input.timeZone }),
        ...(input.units != null && { units: input.units }),
      },
    });
    posthog.capture(SettingsEvents.PROFILE_UPDATED, {
      hasDisplayName: input.displayName != null,
      hasTimeZone: input.timeZone != null,
      hasUnits: input.units != null,
    });
  }
}

export const profileService = new ProfileService();
