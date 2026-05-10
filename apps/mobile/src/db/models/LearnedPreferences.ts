import { Model } from '@nozbe/watermelondb';
import { field } from '@nozbe/watermelondb/decorators';

export class LearnedPreferences extends Model {
  static table = 'learned_preferences';

  @field('user_id') userId!: string;
  @field('top_eaten_json') topEatenJson?: string;
  @field('top_tossed_json') topTossedJson?: string;
  @field('cuisine_affinity_json') cuisineAffinityJson?: string;
  @field('last_updated_at') lastUpdatedAt!: number;
  @field('_version') _version!: number;
  @field('_last_changed_at') _lastChangedAt!: number;
}
