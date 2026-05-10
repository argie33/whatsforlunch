import { Model } from '@nozbe/watermelondb';
import { field } from '@nozbe/watermelondb/decorators';

export class Activity extends Model {
  static table = 'activities';

  @field('cloud_id') cloudId!: string;
  @field('household_id') householdId!: string;
  @field('actor_id') actorId!: string;
  @field('action') action!: string;
  @field('resource_type') resourceType!: string;
  @field('resource_id') resourceId!: string;
  @field('resource_data_json') resourceDataJson?: string;
  @field('timestamp') timestamp!: number;
  @field('created_at') createdAt!: number;
  @field('updated_at') updatedAt!: number;
  @field('_version') _version!: number;
  @field('_last_changed_at') _lastChangedAt!: number;
}
