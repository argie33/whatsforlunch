import type { Database } from '@nozbe/watermelondb';
import type { Household } from '@/db/models/Household';
import type { HouseholdMember } from '@/db/models/HouseholdMember';
import { writeQueue } from '@/db/queue';

export interface HouseholdCreateInput {
  name: string;
  ownerId: string;
}

export interface InviteMemberInput {
  householdLocalId: string;
  householdCloudId: string;
  email: string;
}

export class HouseholdsService {
  async createHousehold(db: Database, input: HouseholdCreateInput): Promise<Household> {
    const cloudId = `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const now = Date.now();

    const household = await db.write(async () => {
      const h = await db.get<Household>('households').create((r: any) => {
        r.cloudId = cloudId;
        r.name = input.name;
        r.ownerId = input.ownerId;
        r.memberCount = 1;
        r.version = 1;
        r.lastChangedAt = now;
      });
      await db.get<HouseholdMember>('household_members').create((r: any) => {
        r.cloudId = `local-member-${Date.now()}`;
        r.householdId = h.id;
        r.userId = input.ownerId;
        r.role = 'owner';
        r.joinedAt = now;
        r.version = 1;
        r.lastChangedAt = now;
      });
      return h;
    });

    writeQueue.enqueue({
      type: 'createHousehold',
      localId: household.id,
      cloudId,
      householdId: cloudId,
      payload: { name: input.name, ownerId: input.ownerId },
    });

    return household;
  }

  async renameHousehold(db: Database, household: Household, name: string): Promise<void> {
    await db.write(async () => {
      await household.update((r) => {
        r.name = name;
        r.lastChangedAt = Date.now();
        r.version = r.version + 1;
      });
    });
    writeQueue.enqueue({
      type: 'renameHousehold',
      localId: household.id,
      cloudId: household.cloudId,
      householdId: household.cloudId,
      payload: { name },
    });
  }

  async inviteMember(input: InviteMemberInput): Promise<void> {
    // Server-side only — enqueue for cloud push; invitee appears via sync on accept
    writeQueue.enqueue({
      type: 'inviteMember',
      localId: input.householdLocalId,
      cloudId: input.householdCloudId,
      householdId: input.householdCloudId,
      payload: { email: input.email },
    });
  }
}

export const householdsService = new HouseholdsService();
