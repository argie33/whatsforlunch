import { Database, Collection, Q } from '@nozbe/watermelondb';
import { Observable } from 'rxjs';
import { BaseRepository } from './BaseRepository';
import { FoodRule } from '../models/FoodRule';

export class FoodRuleRepository extends BaseRepository<FoodRule> {
  protected get collection(): Collection<FoodRule> {
    return this.db.get<FoodRule>('food_rules');
  }

  observeAll(): Observable<FoodRule[]> {
    return this.collection
      .query(Q.sortBy('display_name', Q.asc))
      .observe() as unknown as Observable<FoodRule[]>;
  }

  async findByFoodType(foodType: string): Promise<FoodRule | null> {
    const results = await this.collection
      .query(Q.where('food_type', foodType))
      .fetch();
    return results[0] ?? null;
  }

  async getLatestVersion(): Promise<number> {
    const all = await this.collection.query().fetch();
    if (all.length === 0) return 0;
    return Math.max(...all.map((r) => r.version));
  }

  async upsertAllFromCloud(
    rules: Array<{
      id: string;
      foodType: string;
      displayName: string;
      category: string;
      aliases: string[];
      fridgeDaysSafe?: number | null;
      freezerDaysSafe?: number | null;
      pantryDaysSafe?: number | null;
      counterHoursSafe?: number | null;
      iconKey?: string | null;
      version: number;
      lastChangedAt: number;
    }>,
  ): Promise<void> {
    await this.db.write(async () => {
      const preparedOps = await Promise.all(
        rules.map(async (data) => {
          const existing = await this.collection
            .query(Q.where('food_type', data.foodType))
            .fetch()
            .then((r) => r[0] ?? null);

          if (existing) {
            return existing.prepareUpdate((record) => {
              record.cloudId = data.id;
              record.displayName = data.displayName;
              record.category = data.category;
              record.aliasesJson = JSON.stringify(data.aliases);
              if (data.fridgeDaysSafe != null) record.fridgeDaysSafe = data.fridgeDaysSafe;
              if (data.freezerDaysSafe != null) record.freezerDaysSafe = data.freezerDaysSafe;
              if (data.pantryDaysSafe != null) record.pantryDaysSafe = data.pantryDaysSafe;
              if (data.counterHoursSafe != null) record.counterHoursSafe = data.counterHoursSafe;
              if (data.iconKey != null) record.iconKey = data.iconKey;
              record.version = data.version;
              record.lastChangedAt = data.lastChangedAt;
            });
          }
          return this.collection.prepareCreate((record) => {
            record.cloudId = data.id;
            record.foodType = data.foodType;
            record.displayName = data.displayName;
            record.category = data.category;
            record.aliasesJson = JSON.stringify(data.aliases);
            if (data.fridgeDaysSafe != null) record.fridgeDaysSafe = data.fridgeDaysSafe;
            if (data.freezerDaysSafe != null) record.freezerDaysSafe = data.freezerDaysSafe;
            if (data.pantryDaysSafe != null) record.pantryDaysSafe = data.pantryDaysSafe;
            if (data.counterHoursSafe != null) record.counterHoursSafe = data.counterHoursSafe;
            if (data.iconKey != null) record.iconKey = data.iconKey;
            record.version = data.version;
            record.lastChangedAt = data.lastChangedAt;
          });
        }),
      );
      await this.db.batch(...preparedOps);
    });
  }
}
