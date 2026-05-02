import { Model } from '@nozbe/watermelondb';
import { field } from '@nozbe/watermelondb/decorators';

export class SavedRecipe extends Model {
  static table = 'saved_recipes';

  @field('cloud_id') cloudId!: string;
  @field('household_id') householdId!: string;
  @field('recipe_id') recipeId!: string;
  @field('title') title!: string;
  @field('image_url') imageUrl?: string;
  @field('rating') rating?: number;
  @field('notes') notes?: string;
  @field('saved_at') savedAt!: number;
  @field('_version') _version!: number;
  @field('_last_changed_at') _lastChangedAt!: number;
}
