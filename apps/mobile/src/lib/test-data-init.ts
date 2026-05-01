/**
 * Test Data Initialization
 * Populates local database with test data for development/demo
 */

import type { Database } from '@nozbe/watermelondb';
import { ContainerRepository } from '@/db/repositories/ContainerRepository';
import { ItemRepository } from '@/db/repositories/ItemRepository';
import { QR_TEST_CODES, BARCODE_TEST_CODES } from './qr-test-simulator';

interface TestDataConfig {
  householdId: string;
  userId: string;
  createContainers: boolean;
  createItems: boolean;
}

export async function initializeTestData(
  db: Database,
  config: Partial<TestDataConfig> = {},
): Promise<void> {
  const {
    householdId = 'demo-household-123',
    userId = 'demo-user-456',
    createContainers = true,
    createItems = true,
  } = config;

  console.log('[Test Data] Initializing with config:', {
    householdId,
    userId,
    createContainers,
    createItems,
  });

  const containerRepo = new ContainerRepository(db);
  const itemRepo = new ItemRepository(db);

  // Check if data already exists
  try {
    const existing = await db.get('containers').query().fetch();
    if (existing.length > 0) {
      console.log('[Test Data] Data already initialized, skipping');
      return;
    }
  } catch (err) {
    console.error('[Test Data] Error checking existing data:', err);
  }

  // Create test containers
  if (createContainers) {
    console.log('[Test Data] Creating test containers...');
    const containerIds: Record<string, string> = {};
    const now = Date.now();

    for (const [key, code] of Object.entries(QR_TEST_CODES)) {
      try {
        const container = await containerRepo.create({
          householdId,
          qrToken: code.token,
          qrNumber: code.number,
          nickname: code.name,
          claimedAt: now,
        });
        containerIds[key] = container.id;
        console.log('[Test Data] Created container:', code.name);
      } catch (err) {
        console.error('[Test Data] Failed to create container', code.name, err);
      }
    }

    // Create test items for containers
    if (createItems) {
      console.log('[Test Data] Creating test items...');

      const testItems = [
        {
          container: 'container1',
          name: 'Greek Yogurt',
          expiryDays: 7,
          category: 'dairy',
        },
        {
          container: 'container1',
          name: 'Leftover Pasta',
          expiryDays: 2,
          category: 'leftover',
        },
        {
          container: 'container2',
          name: 'Milk',
          expiryDays: 14,
          category: 'dairy',
        },
        {
          container: 'container3',
          name: 'Baked Chicken',
          expiryDays: 4,
          category: 'protein',
        },
      ];

      for (const testItem of testItems) {
        const containerId = containerIds[testItem.container as keyof typeof containerIds];
        if (!containerId) continue;

        try {
          const storedAt = Date.now();
          const expiryAt = storedAt + testItem.expiryDays * 24 * 60 * 60 * 1000;

          await itemRepo.create({
            householdId,
            containerId,
            addedByUserId: userId,
            foodType: testItem.name.toLowerCase().replace(/\s+/g, '_'),
            foodName: testItem.name,
            category: testItem.category as any,
            storageLocation: 'fridge',
            storedAt,
            storedTz: 'UTC',
            expiryAt,
            expirySource: 'user',
          });

          console.log('[Test Data] Created item:', testItem.name);
        } catch (err) {
          console.error('[Test Data] Failed to create item', testItem.name, err);
        }
      }
    }

    console.log('[Test Data] Initialization complete!');
  }
}

/**
 * Clear all test data from database
 */
export async function clearTestData(db: Database): Promise<void> {
  console.log('[Test Data] Clearing test data...');

  try {
    // Get all items and soft-delete them
    const items = await db.get('items').query().fetch();
    await Promise.all(
      items.map((item: any) =>
        item.update((record: any) => {
          record.deletedAt = Date.now();
        }),
      ),
    );

    // Get all containers and soft-delete them
    const containers = await db.get('containers').query().fetch();
    await Promise.all(
      containers.map((container: any) =>
        container.update((record: any) => {
          record.deletedAt = Date.now();
        }),
      ),
    );

    console.log('[Test Data] Cleared successfully');
  } catch (err) {
    console.error('[Test Data] Error clearing data:', err);
  }
}
