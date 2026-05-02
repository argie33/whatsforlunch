import { describe, it, expect, beforeEach } from '@jest/globals';
import type { Database } from '@nozbe/watermelondb';
import { StatsService } from '../StatsService';
import { Item } from '@/db/models/Item';

describe('StatsService', () => {
  let statsService: StatsService;
  let mockDb: Partial<Database>;

  beforeEach(() => {
    statsService = new StatsService();
    mockDb = {
      get: jest.fn(),
    };
  });

  describe('getStatsOverview', () => {
    it('should return stats overview with zero items when household is empty', async () => {
      const mockItemsQuery = {
        query: jest.fn().mockReturnValue({
          fetch: jest.fn().mockResolvedValue([]),
        }),
      };

      (mockDb.get as jest.Mock).mockReturnValue(mockItemsQuery);

      const stats = await statsService.getStatsOverview(mockDb as Database, 'household-123');

      expect(stats.totalItemsAdded).toBe(0);
      expect(stats.totalItemsEaten).toBe(0);
      expect(stats.totalItemsTossed).toBe(0);
      expect(stats.totalValueTossed).toBe(0);
      expect(stats.totalValueSaved).toBe(0);
      expect(stats.allTimeWasteRate).toBe(0);
      expect(stats.wasteStreaks).toBe(52); // 52 weeks with zero waste when no items exist
    });

    it('should calculate waste rate correctly', async () => {
      const mockItems: Partial<Item>[] = [
        { status: 'eaten', priceUsd: 10, tossedAt: undefined, eatenAt: Date.now() },
        { status: 'eaten', priceUsd: 5, tossedAt: undefined, eatenAt: Date.now() },
        { status: 'tossed', priceUsd: 3, tossedAt: Date.now(), eatenAt: undefined },
      ];

      const mockItemsQuery = {
        query: jest.fn().mockReturnValue({
          fetch: jest.fn().mockResolvedValue(mockItems as Item[]),
        }),
      };

      (mockDb.get as jest.Mock).mockReturnValue(mockItemsQuery);

      const stats = await statsService.getStatsOverview(mockDb as Database, 'household-123');

      expect(stats.totalItemsAdded).toBe(3);
      expect(stats.totalItemsEaten).toBe(2);
      expect(stats.totalItemsTossed).toBe(1);
      expect(stats.totalValueSaved).toBe(15);
      expect(stats.totalValueTossed).toBe(3);
      expect(stats.allTimeWasteRate).toBe(33.33);
    });

    it('should include weekly history in stats overview', async () => {
      const mockItemsQuery = {
        query: jest.fn().mockReturnValue({
          fetch: jest.fn().mockResolvedValue([]),
        }),
      };

      (mockDb.get as jest.Mock).mockReturnValue(mockItemsQuery);

      const stats = await statsService.getStatsOverview(mockDb as Database, 'household-123');

      expect(stats.weeklyHistory).toHaveLength(12);
      expect(stats.currentWeekWaste).toBeDefined();
      expect(stats.lastWeekWaste).toBeDefined();
    });
  });

  describe('getWasteTrend', () => {
    it('should return 12 weeks of waste trend by default', async () => {
      const mockItemsQuery = {
        query: jest.fn().mockReturnValue({
          fetch: jest.fn().mockResolvedValue([]),
        }),
      };

      (mockDb.get as jest.Mock).mockReturnValue(mockItemsQuery);

      const trend = await statsService.getWasteTrend(mockDb as Database, 'household-123');

      expect(trend).toHaveLength(12);
      trend.forEach((week) => {
        expect(week.week).toBeDefined();
        expect(week.startDate).toBeDefined();
        expect(week.endDate).toBeDefined();
        expect(week.itemsTossed).toBe(0);
        expect(week.valueTossed).toBe(0);
      });
    });

    it('should return correct number of weeks when specified', async () => {
      const mockItemsQuery = {
        query: jest.fn().mockReturnValue({
          fetch: jest.fn().mockResolvedValue([]),
        }),
      };

      (mockDb.get as jest.Mock).mockReturnValue(mockItemsQuery);

      const trend = await statsService.getWasteTrend(mockDb as Database, 'household-123', 4);

      expect(trend).toHaveLength(4);
    });
  });
});
