import { Model } from '@nozbe/watermelondb';
import { field, relation } from '@nozbe/watermelondb/decorators';

export class HouseholdMember extends Model {
  static table = 'household_members';

  @field('cloud_id') cloudId!: string;
  @field('household_id') householdId!: string;
  @field('user_id') userId!: string;
  @field('display_name') displayName?: string;
  @field('role') role!: string;
  @field('joined_at') joinedAt!: number;
  @field('_version') version!: number;
  @field('_last_changed_at') lastChangedAt!: number;
  @field('deleted_at') deletedAt?: number;
}
