import type { Database } from '@nozbe/watermelondb';
import { ItemRepository } from '@/db/repositories/ItemRepository';
import { ContainerRepository } from '@/db/repositories/ContainerRepository';

const HOUSEHOLD_ID = 'household_placeholder';
const USER_ID = 'user_placeholder';

const SEED_KEY = 'wfl_dev_seeded_v1';

const NOW = Date.now();
const H = 60 * 60 * 1000;
const D = 24 * H;

const SEED_ITEMS = [
  {
    foodName: 'Leftover pasta',
    foodType: 'pasta',
    category: 'leftover',
    storageLocation: 'fridge',
    expiryAt: NOW + 18 * H,
  },
  {
    foodName: 'Chicken breast',
    foodType: 'chicken',
    category: 'protein',
    storageLocation: 'fridge',
    expiryAt: NOW + 1 * D,
  },
  {
    foodName: 'Greek yogurt',
    foodType: 'yogurt',
    category: 'dairy',
    storageLocation: 'fridge',
    expiryAt: NOW + 5 * D,
  },
  {
    foodName: 'Strawberries',
    foodType: 'strawberry',
    category: 'produce',
    storageLocation: 'fridge',
    expiryAt: NOW - 1 * D,
  },
  {
    foodName: 'Cheddar cheese',
    foodType: 'cheese',
    category: 'dairy',
    storageLocation: 'fridge',
    expiryAt: NOW + 12 * D,
  },
  {
    foodName: 'Spinach',
    foodType: 'spinach',
    category: 'produce',
    storageLocation: 'fridge',
    expiryAt: NOW + 2 * D,
  },
  {
    foodName: 'Brown rice',
    foodType: 'rice',
    category: 'grain',
    storageLocation: 'pantry',
    expiryAt: NOW + 90 * D,
  },
  {
    foodName: 'Frozen peas',
    foodType: 'peas',
    category: 'produce',
    storageLocation: 'freezer',
    expiryAt: NOW + 120 * D,
  },
  {
    foodName: 'Salsa jar',
    foodType: 'salsa',
    category: 'sauce',
    storageLocation: 'pantry',
    expiryAt: NOW + 30 * D,
  },
  {
    foodName: 'Cooked salmon',
    foodType: 'salmon',
    category: 'protein',
    storageLocation: 'fridge',
    expiryAt: NOW + 6 * H,
  },
];

const SEED_CONTAINERS = [
  { nickname: 'Big Blue Tupperware', qrToken: 'BBLU001' },
  { nickname: 'Mason jar #1', qrToken: 'MJAR001' },
  { nickname: 'Lunchbox', qrToken: 'LBXS001' },
];

export async function seedDevDataIfNeeded(db: Database): Promise<void> {
  // Disabled in production. Onboarding handles initial data entry.
  // Users should add their own items through the app.
  return;
}

/**
 * Optional: Generate example data for demo/testing purposes only.
 * This is explicitly called by the UI, not automatically.
 */
export async function generateExampleDataForDemo(db: Database): Promise<void> {
  if (__DEV__ !== true) return;

  const itemRepo = new ItemRepository(db);
  const containerRepo = new ContainerRepository(db);
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Check if already has data
  const existing = await itemRepo['collection'].query().fetch();
  if (existing.length > 0) return;

  // Generate example data for demonstration only
  for (const c of SEED_CONTAINERS) {
    await containerRepo.create({
      householdId: HOUSEHOLD_ID,
      qrToken: c.qrToken,
      qrNumber: Math.floor(Math.random() * 9000) + 1000,
      nickname: c.nickname,
      claimedAt: NOW - 7 * D,
    });
  }

  for (const seed of SEED_ITEMS) {
    await itemRepo.create({
      householdId: HOUSEHOLD_ID,
      addedByUserId: USER_ID,
      foodType: seed.foodType,
      foodName: seed.foodName,
      category: seed.category,
      storageLocation: seed.storageLocation as any,
      storedAt: NOW - 3 * D,
      storedTz: tz,
      expiryAt: seed.expiryAt,
      expirySource: 'rule',
    });
  }

  console.log('[devSeed] Generated 3 containers + 10 example items');
}
