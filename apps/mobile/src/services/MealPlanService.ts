import { Database } from '@nozbe/watermelondb';
import { Q } from '@nozbe/watermelondb';
import { MealPlanEntry } from '@/db/models/MealPlanEntry';
import { shoppingListService } from './ShoppingListService';
import { itemsService } from './ItemsService';
import * as Notifications from 'expo-notifications';
import { MMKV } from 'react-native-mmkv';
import { Platform } from 'react-native';

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type MealStatus = 'planned' | 'cooked' | 'skipped';

export interface MealPlanEntryCreateInput {
  householdId: string;
  addedByUserId: string;
  recipeCloudId?: string;
  recipeSnapshot?: Record<string, unknown>;
  plannedForAt: number;
  mealType: MealType;
  servings?: number;
  notes?: string;
}

export interface Ingredient {
  name: string;
  quantity: string;
  unit: string;
  optional: boolean;
}

class MealPlanService {
  private notifStorage = new MMKV({ id: 'wfl.meal-plan' });

  // Observe entries for a date range (reactive, returns RxJS Observable)
  observeRange(db: Database, householdId: string, fromAt: number, toAt: number) {
    return db
      .get<MealPlanEntry>('meal_plan_entries')
      .query(
        Q.where('household_id', householdId),
        Q.where('planned_for_at', Q.gte(fromAt)),
        Q.where('planned_for_at', Q.lte(toAt)),
        Q.where('deleted_at', Q.eq(null)),
      )
      .observe();
  }

  async getWeekEntries(
    db: Database,
    householdId: string,
    weekStartAt: number,
  ): Promise<MealPlanEntry[]> {
    const weekEndAt = weekStartAt + 7 * 24 * 60 * 60 * 1000;
    return db
      .get<MealPlanEntry>('meal_plan_entries')
      .query(
        Q.where('household_id', householdId),
        Q.where('planned_for_at', Q.gte(weekStartAt)),
        Q.where('planned_for_at', Q.lt(weekEndAt)),
        Q.where('deleted_at', Q.eq(null)),
      )
      .fetch();
  }

  async addEntry(db: Database, input: MealPlanEntryCreateInput): Promise<MealPlanEntry> {
    const now = Date.now();
    return db.write(async () => {
      return db.get<MealPlanEntry>('meal_plan_entries').create((entry) => {
        entry.cloudId = crypto.randomUUID();
        entry.householdId = input.householdId;
        entry.addedByUserId = input.addedByUserId;
        entry.recipeCloudId = input.recipeCloudId ?? '';
        entry.recipeSnapshotJson = input.recipeSnapshot ? JSON.stringify(input.recipeSnapshot) : '';
        entry.plannedForAt = input.plannedForAt;
        entry.mealType = input.mealType;
        entry.servings = input.servings;
        entry.status = 'planned';
        entry.notes = input.notes ?? '';
        entry.version = 0;
        entry.lastChangedAt = now;
      });
    });
  }

  async markCooked(db: Database, entryId: string): Promise<void> {
    const entry = await db.get<MealPlanEntry>('meal_plan_entries').find(entryId);
    await db.write(async () => {
      await entry.update((e) => {
        e.status = 'cooked';
        e.lastChangedAt = Date.now();
      });
    });
    await this.cancelMealReminder(entryId);
  }

  async removeEntry(db: Database, entryId: string): Promise<void> {
    const entry = await db.get<MealPlanEntry>('meal_plan_entries').find(entryId);
    await db.write(async () => {
      await entry.update((e) => {
        e.deletedAt = Date.now();
        e.lastChangedAt = Date.now();
      });
    });
    await this.cancelMealReminder(entryId);
  }

  async addMissingIngredientsToShoppingList(
    db: Database,
    entry: MealPlanEntry,
    userId: string,
  ): Promise<number> {
    if (!entry.recipeSnapshotJson) return 0;
    const recipe = JSON.parse(entry.recipeSnapshotJson) as Record<string, unknown>;
    const items = await itemsService.getHouseholdItems(db, entry.householdId);
    const inventoryNames = new Set(
      items
        .filter((i) => i.status === 'active' || i.status === 'partial')
        .flatMap((i) => [i.foodName.toLowerCase(), i.foodType.toLowerCase()]),
    );

    const ingredients = (recipe.ingredients as Ingredient[]) ?? [];
    const missing: Ingredient[] = ingredients.filter(
      (ing: Ingredient) => !ing.optional && !inventoryNames.has(ing.name.toLowerCase()),
    );

    await Promise.all(
      missing.map((ing) =>
        shoppingListService.addItem(db, {
          householdId: entry.householdId,
          name: ing.name,
          quantity: [ing.quantity, ing.unit].filter(Boolean).join(' '),
          category: 'meal-plan',
          notes: `For: ${recipe.title ?? 'recipe'}`,
          addedByUserId: userId,
          autoSuggested: true,
        }),
      ),
    );
    return missing.length;
  }

  async scheduleMealReminder(entry: MealPlanEntry, title: string, body: string): Promise<void> {
    try {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('meal-reminders', {
          name: 'Meal Reminders',
          importance: Notifications.AndroidImportance.HIGH,
        });
      }
      const triggerAt = new Date(entry.plannedForAt - 60 * 60 * 1000);
      if (triggerAt <= new Date()) return;
      const notifId = await Notifications.scheduleNotificationAsync({
        content: { title, body, data: { mealPlanEntryId: entry.id } },
        trigger: { date: triggerAt },
      });
      this.notifStorage.set(`notif_${entry.id}`, notifId);
    } catch (err) {
      console.warn('[MealPlanService] Failed to schedule reminder:', err);
    }
  }

  async cancelMealReminder(entryId: string): Promise<void> {
    try {
      const notifId = this.notifStorage.getString(`notif_${entryId}`);
      if (notifId) {
        await Notifications.cancelScheduledNotificationAsync(notifId);
        this.notifStorage.delete(`notif_${entryId}`);
      }
    } catch (err) {
      console.warn('[MealPlanService] Failed to cancel reminder:', err);
    }
  }
}

export const mealPlanService = new MealPlanService();
export { MealPlanService };
