import { Model } from '@nozbe/watermelondb';
import { field, children, relation } from '@nozbe/watermelondb/decorators';
import { Query } from '@nozbe/watermelondb';
import { Item } from './Item';

export class Container extends Model {
  static table = 'containers';

  @field('cloud_id') cloudId!: string;
  @field('qr_token') qrToken!: string;
  @field('household_id') householdId!: string;
  @field('nickname') nickname?: string;
  @field('image_url') imageUrl?: string;
  @field('claimed_at') claimedAt!: number;
  @field('archived_at') archivedAt?: number;
  @field('_version') version!: number;
  @field('_last_changed_at') lastChangedAt!: number;
  @field('deleted_at') deletedAt?: number;

  @children('items') items!: Query<Item>;
}
