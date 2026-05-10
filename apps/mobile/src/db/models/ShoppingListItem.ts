import { Model } from '@nozbe/watermelondb';
import { field } from '@nozbe/watermelondb/decorators';

export class ShoppingListItem extends Model {
  static table = 'shopping_list_items';

  @field('cloud_id') cloudId!: string;
  @field('household_id') householdId!: string;
  @field('name') name!: string;
  @field('quantity') quantity?: string;
  @field('category') category?: string;
  @field('notes') notes?: string;
  @field('added_by_user_id') addedByUserId!: string;
  @field('purchased_at') purchasedAt?: number;
  @field('purchased_by_user_id') purchasedByUserId?: string;
  @field('auto_suggested') autoSuggested!: boolean;
  @field('_version') version!: number;
  @field('_last_changed_at') lastChangedAt!: number;
  @field('deleted_at') deletedAt?: number;
}
