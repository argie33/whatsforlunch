import { Database, Q } from '@nozbe/watermelondb';
import { Item } from '@/db/models/Item';

export interface MacroBreakdown {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface DailyIntake {
  date: string;
  macros: MacroBreakdown;
  itemCount: number;
}

class NutritionService {
  async getDailyIntake(db: Database, householdId: string, date: Date): Promise<DailyIntake> {
    try {
      const itemsTable = db.collections.get<Item>('items');
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);

      const eatenItems = await itemsTable
        .query(
          Q.and(
            Q.where('household_id', householdId),
            Q.where('status', 'eaten'),
            Q.where('eaten_at', Q.gte(dayStart.getTime())),
            Q.where('eaten_at', Q.lte(dayEnd.getTime())),
          ),
        )
        .fetch();

      const macros = {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
      };

      eatenItems.forEach((item: Item) => {
        const servingSize = item.quantityValue ?? 100;
        const servingMultiplier = servingSize / 100;
        if (item.caloriesPer100g) macros.calories += item.caloriesPer100g * servingMultiplier;
        if (item.proteinPer100g) macros.protein += item.proteinPer100g * servingMultiplier;
        if (item.carbsPer100g) macros.carbs += item.carbsPer100g * servingMultiplier;
        if (item.fatPer100g) macros.fat += item.fatPer100g * servingMultiplier;
      });

      return {
        date: date.toISOString().split('T')[0],
        macros,
        itemCount: eatenItems.length,
      };
    } catch (error) {
      console.error('[NutritionService] getDailyIntake error:', error);
      return {
        date: date.toISOString().split('T')[0],
        macros: { calories: 0, protein: 0, carbs: 0, fat: 0 },
        itemCount: 0,
      };
    }
  }

  async getWeeklyMacros(db: Database, householdId: string): Promise<DailyIntake[]> {
    const results: DailyIntake[] = [];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dailyIntake = await this.getDailyIntake(db, householdId, date);
      results.push(dailyIntake);
    }

    return results;
  }
}

export const nutritionService = new NutritionService();
export { NutritionService };
