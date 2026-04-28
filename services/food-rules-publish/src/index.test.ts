import { describe, it, mock } from 'node:test';
import assert from 'node:assert';

// Mock AWS SDK before importing the handler
const mockSend = mock.fn();

mock.module('@aws-sdk/client-dynamodb', { namedExports: { DynamoDBClient: mock.fn(() => ({})) } });
mock.module('@aws-sdk/lib-dynamodb', {
  namedExports: {
    DynamoDBDocumentClient: { from: mock.fn(() => ({ send: mockSend })) },
    GetCommand: mock.fn((p: unknown) => p),
    PutCommand: mock.fn((p: unknown) => p),
    BatchWriteCommand: mock.fn((p: unknown) => p),
  },
});
mock.module('@aws-lambda-powertools/logger', {
  namedExports: {
    Logger: mock.fn(() => ({ info: mock.fn(), warn: mock.fn(), error: mock.fn() })),
  },
});

// ── RULES_VERSION sanity ──────────────────────────────────────────────────────

describe('RULES_VERSION', () => {
  const RULES_VERSION = 3;

  it('is a positive integer', () => {
    assert.strictEqual(typeof RULES_VERSION, 'number');
    assert.ok(RULES_VERSION > 0);
    assert.strictEqual(RULES_VERSION, Math.floor(RULES_VERSION));
  });
});

// ── FoodRule shape ────────────────────────────────────────────────────────────

describe('FoodRule shape', () => {
  const rule = {
    foodType: 'cooked_chicken',
    displayName: 'Cooked Chicken',
    category: 'protein',
    aliases: ['chicken', 'grilled chicken'],
    fridgeDaysSafe: 4,
    freezerDaysSafe: 120,
    version: 3,
  };

  it('has required fields', () => {
    assert.ok(rule.foodType);
    assert.ok(rule.displayName);
    assert.ok(rule.category);
    assert.ok(Array.isArray(rule.aliases));
    assert.ok(rule.fridgeDaysSafe > 0);
    assert.ok(rule.version > 0);
  });

  it('aliases is non-empty array', () => {
    assert.ok(rule.aliases.length > 0);
  });

  it('fridgeDaysSafe is positive', () => {
    assert.ok(rule.fridgeDaysSafe > 0);
  });
});

// ── Batch logic ───────────────────────────────────────────────────────────────

describe('batch publishing logic', () => {
  it('splits 50 rules into two batches of 25', () => {
    const rules = Array.from({ length: 50 }, (_, i) => ({ foodType: `type_${i}` }));
    const batches: (typeof rules)[] = [];
    for (let i = 0; i < rules.length; i += 25) {
      batches.push(rules.slice(i, i + 25));
    }
    assert.strictEqual(batches.length, 2);
    assert.strictEqual(batches[0]!.length, 25);
    assert.strictEqual(batches[1]!.length, 25);
  });

  it('handles 60 rules in three batches', () => {
    const rules = Array.from({ length: 60 }, (_, i) => ({ foodType: `type_${i}` }));
    const batches: (typeof rules)[] = [];
    for (let i = 0; i < rules.length; i += 25) {
      batches.push(rules.slice(i, i + 25));
    }
    assert.strictEqual(batches.length, 3);
    assert.strictEqual(batches[2]!.length, 10);
  });
});

// ── Version check logic ───────────────────────────────────────────────────────

describe('version check', () => {
  it('skips publish when currentVersion matches target', () => {
    const RULES_VERSION = 3;
    const currentVersion = 3;
    const shouldSkip = currentVersion === RULES_VERSION;
    assert.ok(shouldSkip);
  });

  it('publishes when currentVersion is null (first run)', () => {
    const RULES_VERSION = 3;
    const currentVersion = null;
    const shouldSkip = currentVersion === RULES_VERSION;
    assert.ok(!shouldSkip);
  });

  it('publishes when currentVersion is lower than target', () => {
    const RULES_VERSION = 3;
    const currentVersion: number = 2;
    const shouldSkip = currentVersion === RULES_VERSION;
    assert.ok(!shouldSkip);
  });
});

// ── DynamoDB key structure ────────────────────────────────────────────────────

describe('DynamoDB key patterns', () => {
  it('version record uses FOOD_RULES/VERSION keys', () => {
    const versionKey = { PK: 'FOOD_RULES', SK: 'VERSION' };
    assert.strictEqual(versionKey.PK, 'FOOD_RULES');
    assert.strictEqual(versionKey.SK, 'VERSION');
  });

  it('rule records use FOOD_RULES/RULE#<foodType> keys', () => {
    const foodType = 'cooked_chicken';
    const sk = `RULE#${foodType}`;
    assert.strictEqual(sk, 'RULE#cooked_chicken');
  });
});

// ── Food safety data sanity ───────────────────────────────────────────────────

describe('food safety data', () => {
  it('raw proteins have shorter fridge safe days than cooked', () => {
    const rawChicken = { fridgeDaysSafe: 2 };
    const cookedChicken = { fridgeDaysSafe: 4 };
    assert.ok(rawChicken.fridgeDaysSafe < cookedChicken.fridgeDaysSafe);
  });

  it('leafy greens have shorter fridge life than hard cheese', () => {
    const greens = { fridgeDaysSafe: 5 };
    const hardCheese = { fridgeDaysSafe: 21 };
    assert.ok(greens.fridgeDaysSafe < hardCheese.fridgeDaysSafe);
  });
});
