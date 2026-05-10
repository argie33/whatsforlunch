import type { Database } from '@nozbe/watermelondb';
import { Q } from '@nozbe/watermelondb';
import { Item } from '@/db/models/Item';

export interface WeeklyStats {
  week: string; // ISO week string, e.g., "2024-W15"
  startDate: number; // timestamp
  endDate: number; // timestamp
  itemsTossed: number;
  valueTossed: number; // sum of priceUsd for tossed items
}

export interface StatsOverview {
  totalItemsAdded: number;
  totalItemsEaten: number;
  totalItemsTossed: number;
  totalValueTossed: number; // sum of priceUsd for tossed items
  totalValueSaved: number; // sum of priceUsd for eaten items (avoided waste)
  currentWeekWaste: WeeklyStats;
  lastWeekWaste: WeeklyStats;
  allTimeWasteRate: number; // percentage of items tossed vs total
  wasteStreaks: number; // consecutive weeks with 0 waste
  weeklyHistory: WeeklyStats[]; // last 12 weeks
}

export class StatsService {
  /** Get all completed items (eaten, tossed, frozen) for a household */
  private async getCompletedItems(db: Database, householdId: string): Promise<Item[]> {
    return db
      .get<Item>('items')
      .query(
        Q.where('household_id', householdId),
        Q.where('status', Q.oneOf(['eaten', 'tossed', 'frozen', 'partial'])),
      )
      .fetch();
  }

  /** Get items tossed in a specific week */
  private async getItemsTossedInWeek(
    db: Database,
    householdId: string,
    weekStart: number,
    weekEnd: number,
  ): Promise<Item[]> {
    const items = await this.getCompletedItems(db, householdId);
    return items.filter((item) => {
      const tossedAt = item.tossedAt;
      return tossedAt && tossedAt >= weekStart && tossedAt < weekEnd;
    });
  }

  /** Get ISO week string from timestamp, e.g., "2024-W15" */
  private getIsoWeek(timestamp: number): string {
    const date = new Date(timestamp);
    const jan4 = new Date(date.getFullYear(), 0, 4);
    const weekOne = new Date(jan4);
    weekOne.setDate(weekOne.getDate() - weekOne.getDay() + 1);
    const diff = date.getTime() - weekOne.getTime();
    const week = Math.floor(diff / (7 * 24 * 60 * 60 * 1000)) + 1;
    const year = date.getFullYear();
    return `${year}-W${String(week).padStart(2, '0')}`;
  }

  /** Get week start and end timestamps for a given week string or offset */
  private getWeekRange(weekOffset: number = 0): { start: number; end: number } {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // adjust when day is Sunday
    const weekStart = new Date(now.setDate(diff));
    weekStart.setHours(0, 0, 0, 0);

    const adjustedStart = new Date(weekStart);
    adjustedStart.setDate(adjustedStart.getDate() + weekOffset * 7);

    const weekEnd = new Date(adjustedStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    return {
      start: adjustedStart.getTime(),
      end: weekEnd.getTime(),
    };
  }

  /** Calculate stats for a specific week */
  private async getWeeklyStats(
    db: Database,
    householdId: string,
    weekOffset: number,
  ): Promise<WeeklyStats> {
    const { start, end } = this.getWeekRange(weekOffset);
    const items = await this.getItemsTossedInWeek(db, householdId, start, end);

    const startDate = new Date(start);
    const week = this.getIsoWeek(start);

    return {
      week,
      startDate: start,
      endDate: end,
      itemsTossed: items.length,
      valueTossed: items.reduce((sum, item) => sum + (item.priceUsd || 0), 0),
    };
  }

  /** Calculate waste streaks (consecutive weeks with 0 waste) */
  private async calculateWasteStreaks(db: Database, householdId: string): Promise<number> {
    let streaks = 0;
    let weekOffset = 0;

    // Check up to 52 weeks back for streaks
    while (weekOffset < 52) {
      const stats = await this.getWeeklyStats(db, householdId, -weekOffset);
      if (stats.itemsTossed === 0) {
        streaks += 1;
      } else {
        break; // streak broken
      }
      weekOffset += 1;
    }

    return streaks;
  }

  /** Get comprehensive stats overview for a household */
  async getStatsOverview(db: Database, householdId: string): Promise<StatsOverview> {
    const allItems = await this.getCompletedItems(db, householdId);

    const eatenItems = allItems.filter((item) => item.status === 'eaten');
    const tossedItems = allItems.filter((item) => item.status === 'tossed');

    const totalValueTossed = tossedItems.reduce((sum, item) => sum + (item.priceUsd || 0), 0);
    const totalValueSaved = eatenItems.reduce((sum, item) => sum + (item.priceUsd || 0), 0);

    const wasteRate =
      allItems.length > 0 ? (tossedItems.length / allItems.length) * 100 : 0;

    const currentWeek = await this.getWeeklyStats(db, householdId, 0);
    const lastWeek = await this.getWeeklyStats(db, householdId, -1);

    // Get last 12 weeks of history
    const weeklyHistory: WeeklyStats[] = [];
    for (let i = 11; i >= 0; i--) {
      const stats = await this.getWeeklyStats(db, householdId, -i);
      weeklyHistory.push(stats);
    }

    const wasteStreaks = await this.calculateWasteStreaks(db, householdId);

    return {
      totalItemsAdded: allItems.length,
      totalItemsEaten: eatenItems.length,
      totalItemsTossed: tossedItems.length,
      totalValueTossed,
      totalValueSaved,
      currentWeekWaste: currentWeek,
      lastWeekWaste: lastWeek,
      allTimeWasteRate: Math.round(wasteRate * 100) / 100,
      wasteStreaks,
      weeklyHistory,
    };
  }

  /** Get waste trend for a specific time period */
  async getWasteTrend(
    db: Database,
    householdId: string,
    weeksBack: number = 12,
  ): Promise<WeeklyStats[]> {
    const history: WeeklyStats[] = [];
    for (let i = weeksBack - 1; i >= 0; i--) {
      const stats = await this.getWeeklyStats(db, householdId, -i);
      history.push(stats);
    }
    return history;
  }
}

export const statsService = new StatsService();
