/**
 * W2 Phase C — Item lifecycle integration tests.
 *
 * Tests the complete item lifecycle (create → partial → eat/toss) against
 * local DynamoDB. Validates DynamoDB write patterns and GSI access patterns.
 *
 * Skip automatically if DynamoDB Local is not running.
 * Set CI_INTEGRATION=1 to force-enable in CI with Docker DynamoDB.
 */

import {
  createTestUser,
  createTestHousehold,
  cleanupTestData,
  ddb,
  getCurrentTimestamp,
} from './integration.setup';
import { GetCommand, QueryCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuid } from 'uuid';

const TABLE = 'WFL-Main-dev';

// ─── Skip guard ───────────────────────────────────────────────────────────────

const canConnect = async (): Promise<boolean> => {
  try {
    await ddb.send(new GetCommand({ TableName: TABLE, Key: { PK: '__ping', SK: '__ping' } }));
    return true;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('ECONNREFUSED') || msg.includes('Network')) return false;
    return true;
  }
};

const describeIfDdb = process.env.CI_INTEGRATION === '1' ? describe : describe.skip;

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function createItem(
  householdId: string,
  userId: string,
  overrides: Record<string, unknown> = {},
) {
  const id = uuid();
  const now = getCurrentTimestamp();
  const expiryAt = new Date(Date.now() + 3 * 86400_000).toISOString();

  const item = {
    PK: `HOUSEHOLD#${householdId}`,
    SK: `ITEM#${id}`,
    entityType: 'Item',
    id,
    householdId,
    addedByUserId: userId,
    containerId: null,
    foodType: 'cooked_chicken',
    foodName: 'Leftover Chicken',
    category: 'protein',
    storageLocation: 'fridge',
    quantityText: '2 portions',
    quantityValue: 2,
    quantityUnit: 'portions',
    storedAt: now,
    storedTz: 'America/New_York',
    expiryAt,
    expirySource: 'rule',
    expiryConfidence: 0.95,
    notes: null,
    photoPath: null,
    barcode: null,
    status: 'active',
    eatenAt: null,
    tossedAt: null,
    frozenAt: null,
    transferredToContainerId: null,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
    _version: 1,
    _lastChangedAt: Date.now(),
    GSI2PK: `EXPIRING#${householdId}`,
    GSI2SK: expiryAt,
    GSI3PK: `USER_ITEMS#${userId}`,
    GSI3SK: now,
    ...overrides,
  };

  await ddb.send(new PutCommand({ TableName: TABLE, Item: item }));
  return item;
}

// ─── Item creation ────────────────────────────────────────────────────────────

describeIfDdb('Item creation — DynamoDB write patterns', () => {
  let user: Awaited<ReturnType<typeof createTestUser>>;
  let household: Awaited<ReturnType<typeof createTestHousehold>>;

  beforeAll(async () => {
    if (!(await canConnect())) return;
    user = await createTestUser();
    household = await createTestHousehold(user.id);
  });

  afterAll(() => cleanupTestData());

  test('item is written with correct PK/SK pattern', async () => {
    const item = await createItem(household.id, user.id);

    const res = await ddb.send(
      new GetCommand({
        TableName: TABLE,
        Key: { PK: `HOUSEHOLD#${household.id}`, SK: `ITEM#${item.id}` },
      }),
    );

    expect(res.Item).toBeDefined();
    expect(res.Item!.id).toBe(item.id);
    expect(res.Item!.foodType).toBe('cooked_chicken');
    expect(res.Item!.status).toBe('active');
    expect(res.Item!.householdId).toBe(household.id);
  });

  test('item has GSI2 keys for expiring items query', async () => {
    const item = await createItem(household.id, user.id);

    const res = await ddb.send(
      new GetCommand({
        TableName: TABLE,
        Key: { PK: `HOUSEHOLD#${household.id}`, SK: `ITEM#${item.id}` },
      }),
    );

    expect(res.Item!.GSI2PK).toBe(`EXPIRING#${household.id}`);
    expect(res.Item!.GSI2SK).toBeDefined();
  });

  test('item has GSI3 keys for user items query', async () => {
    const item = await createItem(household.id, user.id);

    const res = await ddb.send(
      new GetCommand({
        TableName: TABLE,
        Key: { PK: `HOUSEHOLD#${household.id}`, SK: `ITEM#${item.id}` },
      }),
    );

    expect(res.Item!.GSI3PK).toBe(`USER_ITEMS#${user.id}`);
    expect(res.Item!.GSI3SK).toBeDefined();
  });

  test('listing items by household returns all active items', async () => {
    await createItem(household.id, user.id, { foodName: 'Pasta' });
    await createItem(household.id, user.id, { foodName: 'Rice' });

    const res = await ddb.send(
      new QueryCommand({
        TableName: TABLE,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        FilterExpression: '#status = :active',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: {
          ':pk': `HOUSEHOLD#${household.id}`,
          ':sk': 'ITEM#',
          ':active': 'active',
        },
      }),
    );

    expect(res.Items!.length).toBeGreaterThanOrEqual(2);
  });

  test('expiring items GSI returns items sorted by expiry date', async () => {
    const soonExpiry = new Date(Date.now() + 86400_000).toISOString(); // 1 day
    const laterExpiry = new Date(Date.now() + 5 * 86400_000).toISOString(); // 5 days
    await createItem(household.id, user.id, {
      foodName: 'Urgent Item',
      expiryAt: soonExpiry,
      GSI2SK: soonExpiry,
    });
    await createItem(household.id, user.id, {
      foodName: 'Later Item',
      expiryAt: laterExpiry,
      GSI2SK: laterExpiry,
    });

    const res = await ddb.send(
      new QueryCommand({
        TableName: TABLE,
        IndexName: 'GSI2',
        KeyConditionExpression: 'GSI2PK = :pk',
        ExpressionAttributeValues: { ':pk': `EXPIRING#${household.id}` },
        ScanIndexForward: true, // ascending = soonest first
      }),
    );

    expect(res.Items!.length).toBeGreaterThanOrEqual(2);
    // Earlier expiry should come first
    const sortedExpiryDates = res.Items!.map((i) => i.GSI2SK as string);
    const isSorted = sortedExpiryDates.every((d, i) => i === 0 || d >= sortedExpiryDates[i - 1]!);
    expect(isSorted).toBe(true);
  });
});

// ─── Item lifecycle ────────────────────────────────────────────────────────────

describeIfDdb('Item lifecycle — status transitions', () => {
  let user: Awaited<ReturnType<typeof createTestUser>>;
  let household: Awaited<ReturnType<typeof createTestHousehold>>;
  let item: Awaited<ReturnType<typeof createItem>>;

  beforeAll(async () => {
    if (!(await canConnect())) return;
    user = await createTestUser();
    household = await createTestHousehold(user.id);
    item = await createItem(household.id, user.id);
  });

  afterAll(() => cleanupTestData());

  test('marking item partial updates status and quantity', async () => {
    await ddb.send(
      new UpdateCommand({
        TableName: TABLE,
        Key: { PK: `HOUSEHOLD#${household.id}`, SK: `ITEM#${item.id}` },
        UpdateExpression:
          'SET #status = :status, quantityText = :qty, updatedAt = :now, _version = _version + :inc',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: {
          ':status': 'partial',
          ':qty': '1 portion',
          ':now': getCurrentTimestamp(),
          ':inc': 1,
        },
      }),
    );

    const res = await ddb.send(
      new GetCommand({
        TableName: TABLE,
        Key: { PK: `HOUSEHOLD#${household.id}`, SK: `ITEM#${item.id}` },
      }),
    );

    expect(res.Item!.status).toBe('partial');
    expect(res.Item!.quantityText).toBe('1 portion');
    expect(res.Item!._version).toBe(2);
  });

  test('marking item eaten sets terminal status and timestamp', async () => {
    const eatenAt = getCurrentTimestamp();
    await ddb.send(
      new UpdateCommand({
        TableName: TABLE,
        Key: { PK: `HOUSEHOLD#${household.id}`, SK: `ITEM#${item.id}` },
        UpdateExpression: 'SET #status = :status, eatenAt = :ts, updatedAt = :now',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: {
          ':status': 'eaten',
          ':ts': eatenAt,
          ':now': getCurrentTimestamp(),
        },
      }),
    );

    const res = await ddb.send(
      new GetCommand({
        TableName: TABLE,
        Key: { PK: `HOUSEHOLD#${household.id}`, SK: `ITEM#${item.id}` },
      }),
    );

    expect(res.Item!.status).toBe('eaten');
    expect(res.Item!.eatenAt).toBeDefined();
  });

  test('soft-deleted item has deletedAt set and status deleted', async () => {
    const toDelete = await createItem(household.id, user.id, { foodName: 'Delete Me' });
    const deletedAt = getCurrentTimestamp();

    await ddb.send(
      new UpdateCommand({
        TableName: TABLE,
        Key: { PK: `HOUSEHOLD#${household.id}`, SK: `ITEM#${toDelete.id}` },
        UpdateExpression: 'SET #status = :status, deletedAt = :ts, updatedAt = :now',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: {
          ':status': 'deleted',
          ':ts': deletedAt,
          ':now': getCurrentTimestamp(),
        },
      }),
    );

    const res = await ddb.send(
      new GetCommand({
        TableName: TABLE,
        Key: { PK: `HOUSEHOLD#${household.id}`, SK: `ITEM#${toDelete.id}` },
      }),
    );

    // Record still exists (soft delete)
    expect(res.Item).toBeDefined();
    expect(res.Item!.status).toBe('deleted');
    expect(res.Item!.deletedAt).toBeDefined();

    // Active items query should exclude it
    const listRes = await ddb.send(
      new QueryCommand({
        TableName: TABLE,
        KeyConditionExpression: 'PK = :pk AND SK = :sk',
        FilterExpression: '#status = :active',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: {
          ':pk': `HOUSEHOLD#${household.id}`,
          ':sk': `ITEM#${toDelete.id}`,
          ':active': 'active',
        },
      }),
    );
    expect(listRes.Items!.length).toBe(0);
  });
});

// ─── DeltaSync access pattern ─────────────────────────────────────────────────

describeIfDdb('DeltaSync — incremental sync access pattern', () => {
  let user: Awaited<ReturnType<typeof createTestUser>>;
  let household: Awaited<ReturnType<typeof createTestHousehold>>;

  beforeAll(async () => {
    if (!(await canConnect())) return;
    user = await createTestUser();
    household = await createTestHousehold(user.id);
  });

  afterAll(() => cleanupTestData());

  test('items changed after timestamp are returned by delta query', async () => {
    const syncTs = Date.now();

    // Create item AFTER the sync timestamp
    await new Promise((r) => setTimeout(r, 5)); // ensure _lastChangedAt > syncTs
    const newItem = await createItem(household.id, user.id, { foodName: 'New After Sync' });

    // Simulate deltaSync: query all items, filter by _lastChangedAt > syncTs
    const allItems = await ddb.send(
      new QueryCommand({
        TableName: TABLE,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: {
          ':pk': `HOUSEHOLD#${household.id}`,
          ':sk': 'ITEM#',
        },
      }),
    );

    const changedSince = allItems.Items!.filter((i) => (i._lastChangedAt as number) > syncTs);

    expect(changedSince.length).toBeGreaterThanOrEqual(1);
    expect(changedSince.some((i) => i.id === newItem.id)).toBe(true);
  });

  test('full sync (no timestamp) returns all items', async () => {
    await createItem(household.id, user.id, { foodName: 'Sync Item A' });
    await createItem(household.id, user.id, { foodName: 'Sync Item B' });

    const res = await ddb.send(
      new QueryCommand({
        TableName: TABLE,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: {
          ':pk': `HOUSEHOLD#${household.id}`,
          ':sk': 'ITEM#',
        },
      }),
    );

    expect(res.Items!.length).toBeGreaterThanOrEqual(2);
  });
});
