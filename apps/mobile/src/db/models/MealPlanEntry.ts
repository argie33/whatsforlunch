import { Model } from '@nozbe/watermelondb';
import { field } from '@nozbe/watermelondb/decorators';

export class MealPlanEntry extends Model {
  static table = 'meal_plan_entries';

  @field('cloud_id') cloudId!: string;
  @field('household_id') householdId!: string;
  @field('added_by_user_id') addedByUserId!: string;
  @field('recipe_cloud_id') recipeCloudId?: string;
  @field('recipe_snapshot_json') recipeSnapshotJson?: string;
  @field('planned_for_at') plannedForAt!: number;
  @field('meal_type') mealType!: string;
  @field('servings') servings?: number;
  @field('status') status!: string;
  @field('notes') notes?: string;
  @field('_version') version!: number;
  @field('_last_changed_at') lastChangedAt!: number;
  @field('deleted_at') deletedAt?: number;
}
