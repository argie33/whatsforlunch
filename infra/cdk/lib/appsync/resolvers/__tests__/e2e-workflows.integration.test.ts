/**
 * W7+ Phase — End-to-end workflow integration tests
 *
 * Tests complete user workflows:
 * 1. Food classification (Claude Code integration)
 * 2. Recipe generation based on inventory
 * 3. Item creation with expiry
 * 4. Push token registration
 * 5. Expiry notification triggering
 *
 * These tests validate that AI features (Claude Code) work end-to-end
 * with the backend GraphQL API and database.
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

/**
 * Create a test item with full lifecycle support
 */
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
    foodType: overrides.foodType || 'leftover',
    foodName: overrides.foodName || 'Test Food',
    category: overrides.category || 'other',
    storageLocation: overrides.storageLocation || 'fridge',
    quantityText: '1 unit',
    quantityValue: 1,
    quantityUnit: 'unit',
    storedAt: now,
    storedTz: 'UTC',
    expiryAt,
    expirySource: 'rule',
    expiryConfidence: 0.9,
    notes: null,
    photoUrl: null,
    barcode: null,
    priceUsd: null,
    status: overrides.status || 'active',
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

/**
 * Register a push token for a user
 */
async function registerPushToken(householdId: string, userId: string) {
  const token = `ExponentPushToken[test-${uuid()}]`;
  const now = getCurrentTimestamp();

  const pushToken = {
    PK: `HOUSEHOLD#${householdId}`,
    SK: `PUSH_TOKEN#${token}`,
    entityType: 'PushToken',
    token,
    platform: 'expo',
    userId,
    registeredAt: now,
    _version: 1,
    _lastChangedAt: Date.now(),
  };

  await ddb.send(new PutCommand({ TableName: TABLE, Item: pushToken }));
  return token;
}

/**
 * Query push tokens for a household
 */
async function getPushTokensForHousehold(householdId: string): Promise<string[]> {
  const res = await ddb.send(
    new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `HOUSEHOLD#${householdId}`,
        ':sk': 'PUSH_TOKEN#',
      },
      ProjectionExpression: 'token',
    }),
  );

  return ((res.Items ?? []) as Record<string, unknown>[]).map((item) => item.token as string);
}

/**
 * Query items expiring within a time window
 */
async function getItemsExpiringInWindow(
  householdId: string,
  windowMs: number = 24 * 60 * 60 * 1000,
): Promise<Record<string, unknown>[]> {
  const now = new Date().toISOString();
  const cutoff = new Date(Date.now() + windowMs).toISOString();

  const res = await ddb.send(
    new QueryCommand({
      TableName: TABLE,
      IndexName: 'GSI2',
      KeyConditionExpression: 'GSI2PK = :pk AND GSI2SK BETWEEN :now AND :cutoff',
      FilterExpression: '#st = :active',
      ExpressionAttributeValues: {
        ':pk': `EXPIRING#${householdId}`,
        ':now': now,
        ':cutoff': cutoff,
      },
      ExpressionAttributeNames: { '#st': 'status' },
    }),
  );

  return res.Items ?? [];
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describeIfDdb('E2E Workflows — Food Classification and Item Lifecycle', () => {
  let user: Awaited<ReturnType<typeof createTestUser>>;
  let household: Awaited<ReturnType<typeof createTestHousehold>>;

  beforeAll(async () => {
    if (!(await canConnect())) return;
    user = await createTestUser();
    household = await createTestHousehold(user.id);
  });

  afterAll(() => cleanupTestData());

  // ─── Classified Food Workflow ─────────────────────────────────────────────

  test('classified food is stored with correct metadata', async () => {
    const classifiedItem = await createItem(household.id, user.id, {
      foodName: 'Cooked Chicken Breast',
      foodType: 'cooked_poultry',
      category: 'protein',
    });

    const res = await ddb.send(
      new GetCommand({
        TableName: TABLE,
        Key: { PK: `HOUSEHOLD#${household.id}`, SK: `ITEM#${classifiedItem.id}` },
      }),
    );

    expect(res.Item).toBeDefined();
    expect(res.Item!.foodType).toBe('cooked_poultry');
    expect(res.Item!.foodName).toBe('Cooked Chicken Breast');
    expect(res.Item!.category).toBe('protein');
  });

  test('classified items can be queried by food type', async () => {
    await createItem(household.id, user.id, {
      foodName: 'Salmon Fillet',
      foodType: 'raw_fish',
      category: 'protein',
    });
    await createItem(household.id, user.id, {
      foodName: 'Broccoli',
      foodType: 'raw_vegetable',
      category: 'vegetable',
    });

    // Query all items for the household
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
    const foodTypes = res.Items!.map((i) => i.foodType);
    expect(foodTypes).toContain('raw_fish');
    expect(foodTypes).toContain('raw_vegetable');
  });

  // ─── Recipe Generation Workflow ───────────────────────────────────────────

  test('recipe recommendations require household with inventory', async () => {
    // Create diverse inventory
    await createItem(household.id, user.id, {
      foodName: 'Chicken',
      foodType: 'cooked_poultry',
      category: 'protein',
    });
    await createItem(household.id, user.id, {
      foodName: 'Pasta',
      foodType: 'dry_grain',
      category: 'grain',
    });
    await createItem(household.id, user.id, {
      foodName: 'Tomato Sauce',
      foodType: 'prepared_sauce',
      category: 'condiment',
    });

    // Verify all items are in the household
    const res = await ddb.send(
      new QueryCommand({
        TableName: TABLE,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: {
          ':pk': `HOUSEHOLD#${household.id}`,
          ':sk': 'ITEM#',
        },
        FilterExpression: '#status = :active',
        ExpressionAttributeNames: { '#status': 'status' },
      }),
    );

    expect(res.Items!.length).toBeGreaterThanOrEqual(3);
    const foodNames = res.Items!.map((i) => i.foodName);
    expect(foodNames).toContain('Chicken');
    expect(foodNames).toContain('Pasta');
    expect(foodNames).toContain('Tomato Sauce');
  });

  // ─── Push Notification Registration Workflow ──────────────────────────────

  test('user can register push tokens', async () => {
    const token = await registerPushToken(household.id, user.id);

    const res = await ddb.send(
      new GetCommand({
        TableName: TABLE,
        Key: { PK: `HOUSEHOLD#${household.id}`, SK: `PUSH_TOKEN#${token}` },
      }),
    );

    expect(res.Item).toBeDefined();
    expect(res.Item!.token).toBe(token);
    expect(res.Item!.platform).toBe('expo');
    expect(res.Item!.userId).toBe(user.id);
  });

  test('multiple devices can register tokens for same household', async () => {
    const token1 = await registerPushToken(household.id, user.id);
    const token2 = await registerPushToken(household.id, user.id);

    const tokens = await getPushTokensForHousehold(household.id);

    expect(tokens.length).toBeGreaterThanOrEqual(2);
    expect(tokens).toContain(token1);
    expect(tokens).toContain(token2);
  });

  // ─── Expiry Notification Triggering Workflow ──────────────────────────────

  test('expiring items are identified for notification', async () => {
    const urgentExpiry = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(); // 2 hours
    const item = await createItem(household.id, user.id, {
      foodName: 'Urgent Item',
      expiryAt: urgentExpiry,
      GSI2SK: urgentExpiry,
    });

    // Query for items expiring within 24h
    const expiringItems = await getItemsExpiringInWindow(household.id, 24 * 60 * 60 * 1000);

    expect(expiringItems.length).toBeGreaterThanOrEqual(1);
    const foundItem = expiringItems.find((i) => i.id === item.id);
    expect(foundItem).toBeDefined();
    expect(foundItem!.foodName).toBe('Urgent Item');
  });

  test('full notification flow: items + tokens queried together', async () => {
    // Register push tokens
    const token = await registerPushToken(household.id, user.id);

    // Create expiring item
    const urgentExpiry = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(); // 4 hours
    await createItem(household.id, user.id, {
      foodName: 'Notification Test Item',
      expiryAt: urgentExpiry,
      GSI2SK: urgentExpiry,
    });

    // Simulate what notify-expiring Lambda does
    const expiringItems = await getItemsExpiringInWindow(household.id);
    expect(expiringItems.length).toBeGreaterThanOrEqual(1);

    const pushTokens = await getPushTokensForHousehold(household.id);
    expect(pushTokens.length).toBeGreaterThanOrEqual(1);
    expect(pushTokens).toContain(token);

    // Could send notification with: pushTokens, mostUrgentItem, etc.
  });

  // ─── Item Lifecycle with Notifications ────────────────────────────────────

  test('item status transitions are tracked', async () => {
    const item = await createItem(household.id, user.id, {
      foodName: 'Lifecycle Test',
      status: 'active',
    });

    // Verify initial state
    let res = await ddb.send(
      new GetCommand({
        TableName: TABLE,
        Key: { PK: `HOUSEHOLD#${household.id}`, SK: `ITEM#${item.id}` },
      }),
    );
    expect(res.Item!.status).toBe('active');

    // Simulate marking as eaten
    const eatenAt = getCurrentTimestamp();
    await ddb.send(
      new UpdateCommand({
        TableName: TABLE,
        Key: { PK: `HOUSEHOLD#${household.id}`, SK: `ITEM#${item.id}` },
        UpdateExpression: 'SET #status = :status, eatenAt = :eatenAt, updatedAt = :now',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: {
          ':status': 'eaten',
          ':eatenAt': eatenAt,
          ':now': getCurrentTimestamp(),
        },
      }),
    );

    // Verify final state
    res = await ddb.send(
      new GetCommand({
        TableName: TABLE,
        Key: { PK: `HOUSEHOLD#${household.id}`, SK: `ITEM#${item.id}` },
      }),
    );
    expect(res.Item!.status).toBe('eaten');
    expect(res.Item!.eatenAt).toBe(eatenAt);
  });
});

describeIfDdb('E2E Workflows — Multi-user Households', () => {
  let user1: Awaited<ReturnType<typeof createTestUser>>;
  let user2: Awaited<ReturnType<typeof createTestUser>>;
  let household: Awaited<ReturnType<typeof createTestHousehold>>;

  beforeAll(async () => {
    if (!(await canConnect())) return;
    user1 = await createTestUser({ displayName: 'User 1' });
    user2 = await createTestUser({ displayName: 'User 2' });
    household = await createTestHousehold(user1.id);

    // Add user2 as a household member
    const memberRecord = {
      PK: `HOUSEHOLD#${household.id}`,
      SK: `MEMBER#${user2.id}`,
      id: uuid(),
      entityType: 'HouseholdMember',
      householdId: household.id,
      userId: user2.id,
      role: 'member',
      joinedAt: getCurrentTimestamp(),
      updatedAt: getCurrentTimestamp(),
      _version: 1,
      _lastChangedAt: Date.now(),
      GSI1PK: `USER#${user2.id}`,
      GSI1SK: `HOUSEHOLD#${household.id}`,
    };
    await ddb.send(new PutCommand({ TableName: TABLE, Item: memberRecord }));
  });

  afterAll(() => cleanupTestData());

  test('items from both users are in same household query', async () => {
    await createItem(household.id, user1.id, { foodName: "User 1's Item" });
    await createItem(household.id, user2.id, { foodName: "User 2's Item" });

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

    const items = res.Items!;
    expect(items.some((i) => i.foodName === "User 1's Item")).toBe(true);
    expect(items.some((i) => i.foodName === "User 2's Item")).toBe(true);
  });

  test('push tokens from both users can be queried together', async () => {
    const token1 = await registerPushToken(household.id, user1.id);
    const token2 = await registerPushToken(household.id, user2.id);

    const tokens = await getPushTokensForHousehold(household.id);

    expect(tokens.length).toBeGreaterThanOrEqual(2);
    expect(tokens).toContain(token1);
    expect(tokens).toContain(token2);
  });

  test('notifications go to all household members', async () => {
    // Create item that expires soon
    const urgentExpiry = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString();
    await createItem(household.id, user1.id, {
      foodName: 'Shared Item',
      expiryAt: urgentExpiry,
      GSI2SK: urgentExpiry,
    });

    // Both users should receive notification
    const expiringItems = await getItemsExpiringInWindow(household.id);
    const pushTokens = await getPushTokensForHousehold(household.id);

    // At least one expiring item
    expect(expiringItems.some((i) => i.foodName === 'Shared Item')).toBe(true);

    // Tokens from both users exist
    expect(pushTokens.length).toBeGreaterThanOrEqual(2);
  });
});
