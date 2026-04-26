import { Model } from '@nozbe/watermelondb';
import { field, relation } from '@nozbe/watermelondb/decorators';

export class Household extends Model {
  static table = 'households';

  @field('cloud_id') cloudId!: string;
  @field('name') name!: string;
  @field('owner_id') ownerId!: string;
  @field('member_count') memberCount!: number;
  @field('_version') version!: number;
  @field('_last_changed_at') lastChangedAt!: number;
}
