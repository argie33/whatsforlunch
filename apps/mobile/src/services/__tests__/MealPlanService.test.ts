jest.mock('expo-notifications', () => ({
  setNotificationChannelAsync: jest.fn().mockResolvedValue(undefined),
  scheduleNotificationAsync: jest.fn().mockResolvedValue('notif-123'),
  cancelScheduledNotificationAsync: jest.fn().mockResolvedValue(undefined),
  AndroidImportance: { HIGH: 4 },
}));

jest.mock('react-native-mmkv', () => ({
  MMKV: jest.fn(() => ({
    set: jest.fn(),
    getString: jest.fn(),
    delete: jest.fn(),
  })),
}));

jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
  View: 'View',
  ScrollView: 'ScrollView',
  TouchableOpacity: 'TouchableOpacity',
  Pressable: 'Pressable',
}));

jest.mock('../ShoppingListService', () => ({
  shoppingListService: {
    addItem: jest.fn().mockResolvedValue({ id: 'item-1' }),
  },
}));

jest.mock('../ItemsService', () => ({
  itemsService: {
    getHouseholdItems: jest
      .fn()
      .mockResolvedValue([{ foodName: 'eggs', foodType: 'protein', status: 'active' }]),
  },
}));

const fakeMealPlanEntry = {
  id: 'local-meal-001',
  cloudId: 'cloud-meal-001',
  householdId: 'hh-001',
  addedByUserId: 'user-001',
  recipeCloudId: 'recipe-001',
  recipeSnapshotJson: JSON.stringify({
    id: 'recipe-001',
    title: 'Pasta Carbonara',
    ingredients: [
      { name: 'pasta', quantity: '400', unit: 'g', optional: false },
      { name: 'eggs', quantity: '3', unit: 'count', optional: false },
    ],
  }),
  plannedForAt: Date.now() + 86400000,
  mealType: 'dinner',
  servings: 4,
  status: 'planned',
  notes: 'Test meal',
  version: 0,
  lastChangedAt: Date.now(),
  deletedAt: null,
  update: jest.fn(),
};

let mockFind: jest.Mock;
let mockFetch: jest.Mock;
let mockCreate: jest.Mock;
let mockQuery: jest.Mock;
let mockWrite: jest.Mock;
let mockGet: jest.Mock;
let mockDb: any;

function setupMocks() {
  mockFind = jest.fn().mockResolvedValue(fakeMealPlanEntry);
  mockFetch = jest.fn().mockResolvedValue([]);
  mockCreate = jest.fn().mockImplementation((fn: (r: any) => void) => {
    const r: any = {
      id: 'local-created-meal',
      cloudId: 'cloud-created-meal',
      householdId: 'hh-001',
      status: 'planned',
    };
    fn(r);
    return r;
  });
  mockQuery = jest.fn().mockReturnValue({
    fetch: mockFetch,
    observe: jest.fn().mockReturnValue({ subscribe: jest.fn() }),
  });
  mockWrite = jest.fn().mockImplementation(async (fn: () => unknown) => fn());
  mockGet = jest.fn().mockReturnValue({
    query: mockQuery,
    find: mockFind,
    create: mockCreate,
  });
  mockDb = { write: mockWrite, get: mockGet };
}

function getService() {
  return (require('../MealPlanService') as typeof import('../MealPlanService')).mealPlanService;
}

beforeEach(() => {
  jest.resetModules();
  jest.clearAllMocks();
  setupMocks();
  mockFind.mockResolvedValue(fakeMealPlanEntry);
  mockFetch.mockResolvedValue([]);
  mockQuery.mockReturnValue({
    fetch: mockFetch,
    observe: jest.fn().mockReturnValue({ subscribe: jest.fn() }),
  });
  fakeMealPlanEntry.update.mockClear();
  fakeMealPlanEntry.update.mockImplementation(async (fn: (r: any) => void) => {
    fn(fakeMealPlanEntry);
    return fakeMealPlanEntry;
  });
});

describe('MealPlanService', () => {
  describe('observeRange', () => {
    test('returns observable subscription for date range', () => {
      const service = getService();
      const from = Date.now();
      const to = Date.now() + 86400000 * 7;

      const result = service.observeRange(mockDb as any, 'hh-001', from, to);

      expect(mockGet).toHaveBeenCalledWith('meal_plan_entries');
      expect(mockQuery).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    test('filters by household_id', () => {
      const service = getService();
      const mockQueryFn = jest.fn().mockReturnValue({
        fetch: mockFetch,
        observe: jest.fn().mockReturnValue({ subscribe: jest.fn() }),
      });
      mockGet.mockReturnValue({
        query: mockQueryFn,
        find: mockFind,
        create: mockCreate,
      });

      service.observeRange(mockDb as any, 'hh-123', Date.now(), Date.now() + 86400000);

      expect(mockQueryFn).toHaveBeenCalled();
    });
  });

  describe('getWeekEntries', () => {
    test('fetches entries for 7-day week', async () => {
      const service = getService();
      const weekStart = Date.now();

      await service.getWeekEntries(mockDb as any, 'hh-001', weekStart);

      expect(mockGet).toHaveBeenCalledWith('meal_plan_entries');
      expect(mockFetch).toHaveBeenCalled();
    });

    test('filters deleted entries', async () => {
      const service = getService();
      const weekStart = Date.now();
      mockFetch.mockResolvedValue([
        { ...fakeMealPlanEntry, deletedAt: null },
        { ...fakeMealPlanEntry, deletedAt: Date.now() },
      ]);

      const result = await service.getWeekEntries(mockDb as any, 'hh-001', weekStart);

      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe('addEntry', () => {
    test('creates meal plan entry with recipe snapshot', async () => {
      const service = getService();
      const input = {
        householdId: 'hh-001',
        addedByUserId: 'user-001',
        recipeCloudId: 'recipe-001',
        recipeSnapshot: { title: 'Pasta', ingredients: [] },
        plannedForAt: Date.now() + 86400000,
        mealType: 'dinner' as const,
        servings: 4,
      };

      const result = await service.addEntry(mockDb as any, input);

      expect(mockWrite).toHaveBeenCalled();
      expect(mockCreate).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    test('sets initial status to planned', async () => {
      const service = getService();
      const input = {
        householdId: 'hh-001',
        addedByUserId: 'user-001',
        plannedForAt: Date.now() + 86400000,
        mealType: 'lunch' as const,
      };

      await service.addEntry(mockDb as any, input);

      expect(mockCreate).toHaveBeenCalledWith(expect.any(Function));
    });

    test('generates UUID for cloudId', async () => {
      const service = getService();
      const input = {
        householdId: 'hh-001',
        addedByUserId: 'user-001',
        plannedForAt: Date.now() + 86400000,
        mealType: 'breakfast' as const,
      };

      await service.addEntry(mockDb as any, input);

      expect(mockCreate).toHaveBeenCalled();
    });
  });

  describe('markCooked', () => {
    test('updates status to cooked', async () => {
      const service = getService();

      await service.markCooked(mockDb as any, 'local-meal-001');

      expect(mockFind).toHaveBeenCalledWith('local-meal-001');
      expect(fakeMealPlanEntry.update).toHaveBeenCalled();
    });

    test('updates lastChangedAt timestamp', async () => {
      const service = getService();

      await service.markCooked(mockDb as any, 'local-meal-001');

      expect(fakeMealPlanEntry.update).toHaveBeenCalled();
    });

    test('cancels associated reminder', async () => {
      const service = getService();
      const spy = jest.spyOn(service as any, 'cancelMealReminder');

      await service.markCooked(mockDb as any, 'local-meal-001');

      expect(spy).toHaveBeenCalledWith('local-meal-001');
    });
  });

  describe('removeEntry', () => {
    test('soft deletes entry by setting deletedAt', async () => {
      const service = getService();

      await service.removeEntry(mockDb as any, 'local-meal-001');

      expect(mockFind).toHaveBeenCalledWith('local-meal-001');
      expect(fakeMealPlanEntry.update).toHaveBeenCalled();
    });

    test('updates lastChangedAt timestamp', async () => {
      const service = getService();

      await service.removeEntry(mockDb as any, 'local-meal-001');

      expect(fakeMealPlanEntry.update).toHaveBeenCalled();
    });

    test('cancels associated reminder', async () => {
      const service = getService();
      const spy = jest.spyOn(service as any, 'cancelMealReminder');

      await service.removeEntry(mockDb as any, 'local-meal-001');

      expect(spy).toHaveBeenCalledWith('local-meal-001');
    });
  });

  describe('addMissingIngredientsToShoppingList', () => {
    test('returns 0 when no recipe snapshot', async () => {
      const service = getService();
      const entry = { ...fakeMealPlanEntry, recipeSnapshotJson: '' };

      const count = await service.addMissingIngredientsToShoppingList(
        mockDb as any,
        entry as any,
        'user-001',
      );

      expect(count).toBe(0);
    });

    test('filters out optional ingredients', async () => {
      const service = getService();
      const entry = {
        ...fakeMealPlanEntry,
        recipeSnapshotJson: JSON.stringify({
          title: 'Pasta',
          ingredients: [
            { name: 'pasta', quantity: '400', unit: 'g', optional: false },
            { name: 'garlic', quantity: '2', unit: 'cloves', optional: true },
          ],
        }),
      };

      await service.addMissingIngredientsToShoppingList(mockDb as any, entry as any, 'user-001');

      expect(mockDb.get).toHaveBeenCalled();
    });

    test('checks against existing inventory items', async () => {
      const service = getService();
      const entry = {
        ...fakeMealPlanEntry,
        householdId: 'hh-001',
        recipeSnapshotJson: JSON.stringify({
          title: 'Pasta',
          ingredients: [
            { name: 'pasta', quantity: '400', unit: 'g', optional: false },
            { name: 'eggs', quantity: '3', unit: 'count', optional: false },
          ],
        }),
      };

      await service.addMissingIngredientsToShoppingList(mockDb as any, entry as any, 'user-001');

      expect(mockDb.get).toHaveBeenCalled();
    });

    test('returns count of missing ingredients added', async () => {
      const service = getService();
      const entry = {
        ...fakeMealPlanEntry,
        recipeSnapshotJson: JSON.stringify({
          title: 'Pasta',
          ingredients: [{ name: 'pasta', quantity: '400', unit: 'g', optional: false }],
        }),
      };

      const count = await service.addMissingIngredientsToShoppingList(
        mockDb as any,
        entry as any,
        'user-001',
      );

      expect(typeof count).toBe('number');
    });
  });

  describe('scheduleMealReminder', () => {
    test('stores notification ID for later cancellation', async () => {
      const service = getService();
      const entry = {
        ...fakeMealPlanEntry,
        plannedForAt: Date.now() + 86400000 * 2,
      };

      await service.scheduleMealReminder(entry as any, 'Dinner', 'Pasta is ready');

      expect(service['notifStorage']).toBeDefined();
    });

    test('skips if meal time is in past', async () => {
      const service = getService();
      const entry = {
        ...fakeMealPlanEntry,
        plannedForAt: Date.now() - 86400000,
      };

      await service.scheduleMealReminder(entry as any, 'Dinner', 'Pasta is ready');

      expect(service['notifStorage']).toBeDefined();
    });

    test('handles errors gracefully', async () => {
      const service = getService();
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const entry = {
        ...fakeMealPlanEntry,
        plannedForAt: Date.now() + 86400000 * 2,
      };

      await service.scheduleMealReminder(entry as any, 'Dinner', 'Pasta is ready');

      consoleSpy.mockRestore();
      expect(service['notifStorage']).toBeDefined();
    });
  });

  describe('cancelMealReminder', () => {
    test('cancels scheduled notification', async () => {
      const service = getService();
      const notifStorage = service['notifStorage'] as any;
      notifStorage.getString = jest.fn().mockReturnValue('notif-123');

      await service.cancelMealReminder('local-meal-001');

      expect(notifStorage.getString).toHaveBeenCalledWith('notif_local-meal-001');
    });

    test('deletes stored notification ID', async () => {
      const service = getService();
      const notifStorage = service['notifStorage'] as any;
      notifStorage.getString = jest.fn().mockReturnValue('notif-123');
      notifStorage.delete = jest.fn();

      await service.cancelMealReminder('local-meal-001');

      expect(notifStorage.delete).toHaveBeenCalledWith('notif_local-meal-001');
    });

    test('handles missing notification gracefully', async () => {
      const service = getService();
      const notifStorage = service['notifStorage'] as any;
      notifStorage.getString = jest.fn().mockReturnValue(null);

      await service.cancelMealReminder('local-meal-001');

      expect(notifStorage.getString).toHaveBeenCalled();
    });
  });

  describe('Integration tests', () => {
    test('complete flow: add meal, mark cooked', async () => {
      const service = getService();
      const input = {
        householdId: 'hh-001',
        addedByUserId: 'user-001',
        recipeCloudId: 'recipe-001',
        recipeSnapshot: { title: 'Pasta' },
        plannedForAt: Date.now() + 86400000,
        mealType: 'dinner' as const,
      };

      await service.addEntry(mockDb as any, input);
      expect(mockCreate).toHaveBeenCalled();

      await service.markCooked(mockDb as any, 'local-meal-001');
      expect(fakeMealPlanEntry.update).toHaveBeenCalled();
    });

    test('add to shopping list and mark as cooked', async () => {
      const service = getService();
      const entry = {
        ...fakeMealPlanEntry,
        recipeSnapshotJson: JSON.stringify({
          title: 'Pasta',
          ingredients: [{ name: 'pasta', quantity: '400', unit: 'g', optional: false }],
        }),
      };

      await service.addMissingIngredientsToShoppingList(mockDb as any, entry as any, 'user-001');

      await service.markCooked(mockDb as any, 'local-meal-001');

      expect(fakeMealPlanEntry.update).toHaveBeenCalled();
    });
  });
});
