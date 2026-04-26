import { Model } from '@nozbe/watermelondb';
import { field } from '@nozbe/watermelondb/decorators';

export class FoodRule extends Model {
  static table = 'food_rules';

  @field('cloud_id') cloudId!: string;
  @field('food_type') foodType!: string;
  @field('display_name') displayName!: string;
  @field('category') category!: string;
  @field('aliases_json') aliasesJson!: string;
  @field('fridge_days_safe') fridgeDaysSafe?: number;
  @field('freezer_days_safe') freezerDaysSafe?: number;
  @field('pantry_days_safe') pantryDaysSafe?: number;
  @field('counter_hours_safe') counterHoursSafe?: number;
  @field('icon_key') iconKey?: string;
  @field('_version') version!: number;
  @field('_last_changed_at') lastChangedAt!: number;
}
