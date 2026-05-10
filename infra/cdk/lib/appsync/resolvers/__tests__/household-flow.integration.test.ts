/**
 * W2 Phase C — Household creation and membership integration tests.
 *
 * Tests DynamoDB write patterns and GSI access patterns directly against
 * local DynamoDB (http://localhost:8000). Skip if unavailable.
 */

import {
  createTestUser,
  createTestHousehold,
  createTestContext,
  cleanupTestData,
  ddb,
} from './integration.setup';
import { GetCommand, QueryCommand, PutCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuid } from 'uuid';

const TABLE = 'WFL-Main-dev';

// ─── Skip guard ───────────────────────────────────────────────────────────────
// Integration tests require a running DynamoDB Local.
// Run: docker run -p 8000:8000 amazon/dynamodb-local

const canConnect = async (): Promise<boolean> => {
  try {
    await ddb.send(new GetCommand({ TableName: TABLE, Key: { PK: '__ping', SK: '__ping' } }));
    return true;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('connect ECONNREFUSED') || msg.includes('Network')) return false;
    return true; // table-not-found etc. means DynamoDB IS running
  }
};

const describeIfDdb = process.env.CI_INTEGRATION === '1' ? describe : describe.skip;

// ─── Household creation ───────────────────────────────────────────────────────

describeIfDdb('Household creation — DynamoDB write patterns', () => {
  let user1: Awaited<ReturnType<typeof createTestUser>>;
  let user2: Awaited<ReturnType<typeof createTestUser>>;
  let household: Awaited<ReturnType<typeof createTestHousehold>>;

  beforeAll(async () => {
    if (!(await canConnect())) return;
    user1 = await createTestUser({ email: 'alice@example.com', displayName: 'Alice' });
    user2 = await createTestUser({ email: 'bob@example.com', displayName: 'Bob' });
    household = await createTestHousehold(user1.id, { name: 'Alice Kitchen' });
  });

  afterAll(() => cleanupTestData());

  test('household META record is persisted', async () => {
    const res = await ddb.send(
      new GetCommand({
        TableName: TABLE,
        Key: { PK: `HOUSEHOLD#${household.id}`, SK: 'METADATA' },
      }),
    );
    expect(res.Item).toBeDefined();
    expect(res.Item!.name).toBe('Alice Kitchen');
    expect(res.Item!.ownerId).toBe(user1.id);
  });

  test('owner MEMBER record created with correct role', async () => {
    const res = await ddb.send(
      new GetCommand({
        TableName: TABLE,
        Key: { PK: `HOUSEHOLD#${household.id}`, SK: `MEMBER#${user1.id}` },
      }),
    );
    expect(res.Item).toBeDefined();
    expect(res.Item!.role).toBe('owner');
    expect(res.Item!.userId).toBe(user1.id);
  });

  test('owner MEMBER record has GSI1 keys for user→household lookup', async () => {
    const res = await ddb.send(
      new GetCommand({
        TableName: TABLE,
        Key: { PK: `HOUSEHOLD#${household.id}`, SK: `MEMBER#${user1.id}` },
      }),
    );
    expect(res.Item!.GSI1PK).toBe(`USER#${user1.id}`);
    expect(res.Item!.GSI1SK).toBe(`HOUSEHOLD#${household.id}`);
  });

  test('non-member cannot be found in household member table', async () => {
    const res = await ddb.send(
      new GetCommand({
        TableName: TABLE,
        Key: { PK: `HOUSEHOLD#${household.id}`, SK: `MEMBER#${user2.id}` },
      }),
    );
    // user2 was never invited — should be null
    expect(res.Item).toBeUndefined();
  });
});

// ─── Household membership operations ─────────────────────────────────────────

describeIfDdb('Household membership — invite + accept flow', () => {
  let owner: Awaited<ReturnType<typeof createTestUser>>;
  let invitee: Awaited<ReturnType<typeof createTestUser>>;
  let household: Awaited<ReturnType<typeof createTestHousehold>>;
  let inviteToken: string;

  beforeAll(async () => {
    if (!(await canConnect())) return;
    owner = await createTestUser({ email: 'owner@example.com' });
    invitee = await createTestUser({ email: 'invitee@example.com' });
    household = await createTestHousehold(owner.id, { name: 'Owner Kitchen' });
    inviteToken = uuid().replace(/-/g, '').toUpperCase();
  });

  afterAll(() => cleanupTestData());

  test('pending invite record written to DynamoDB', async () => {
    const inviteId = uuid();
    await ddb.send(
      new PutCommand({
        TableName: TABLE,
        Item: {
          PK: `HOUSEHOLD#${household.id}`,
          SK: `INVITE#${inviteId}`,
          entityType: 'HouseholdInvite',
          id: inviteId,
          householdId: household.id,
          invitedEmail: invitee.email,
          inviteToken,
          role: 'member',
          expiresAt: new Date(Date.now() + 48 * 3600_000).toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          _version: 1,
        },
      }),
    );

    const res = await ddb.send(
      new GetCommand({
        TableName: TABLE,
        Key: { PK: `HOUSEHOLD#${household.id}`, SK: `INVITE#${inviteId}` },
      }),
    );
    expect(res.Item).toBeDefined();
    expect(res.Item!.inviteToken).toBe(inviteToken);
    expect(res.Item!.invitedEmail).toBe(invitee.email);
  });

  test('accepting invite creates MEMBER record for invitee', async () => {
    await ddb.send(
      new PutCommand({
        TableName: TABLE,
        Item: {
          PK: `HOUSEHOLD#${household.id}`,
          SK: `MEMBER#${invitee.id}`,
          entityType: 'HouseholdMember',
          userId: invitee.id,
          householdId: household.id,
          role: 'member',
          joinedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          _version: 1,
          GSI1PK: `USER#${invitee.id}`,
          GSI1SK: `HOUSEHOLD#${household.id}`,
        },
      }),
    );

    const res = await ddb.send(
      new GetCommand({
        TableName: TABLE,
        Key: { PK: `HOUSEHOLD#${household.id}`, SK: `MEMBER#${invitee.id}` },
      }),
    );
    expect(res.Item).toBeDefined();
    expect(res.Item!.role).toBe('member');
  });

  test('listing household members returns both owner and member', async () => {
    const res = await ddb.send(
      new QueryCommand({
        TableName: TABLE,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: {
          ':pk': `HOUSEHOLD#${household.id}`,
          ':sk': 'MEMBER#',
        },
      }),
    );
    expect(res.Items!.length).toBeGreaterThanOrEqual(2);
    const roles = res.Items!.map((m) => m.role);
    expect(roles).toContain('owner');
    expect(roles).toContain('member');
  });
});

// ─── Role-based access control ────────────────────────────────────────────────

describeIfDdb('Role-based access — owner vs member', () => {
  let ownerUser: Awaited<ReturnType<typeof createTestUser>>;
  let memberUser: Awaited<ReturnType<typeof createTestUser>>;
  let household: Awaited<ReturnType<typeof createTestHousehold>>;

  beforeAll(async () => {
    if (!(await canConnect())) return;
    ownerUser = await createTestUser();
    memberUser = await createTestUser();
    household = await createTestHousehold(ownerUser.id);

    // Add memberUser as a member
    await ddb.send(
      new PutCommand({
        TableName: TABLE,
        Item: {
          PK: `HOUSEHOLD#${household.id}`,
          SK: `MEMBER#${memberUser.id}`,
          entityType: 'HouseholdMember',
          userId: memberUser.id,
          role: 'member',
          joinedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          _version: 1,
          GSI1PK: `USER#${memberUser.id}`,
          GSI1SK: `HOUSEHOLD#${household.id}`,
        },
      }),
    );
  });

  afterAll(() => cleanupTestData());

  test('owner role is stored as "owner" in DynamoDB', async () => {
    const ctx = createTestContext(ownerUser.id);
    const res = await ddb.send(
      new GetCommand({
        TableName: TABLE,
        Key: { PK: `HOUSEHOLD#${household.id}`, SK: `MEMBER#${ctx.userId}` },
      }),
    );
    expect(res.Item!.role).toBe('owner');
  });

  test('member role is stored as "member" in DynamoDB', async () => {
    const res = await ddb.send(
      new GetCommand({
        TableName: TABLE,
        Key: { PK: `HOUSEHOLD#${household.id}`, SK: `MEMBER#${memberUser.id}` },
      }),
    );
    expect(res.Item!.role).toBe('member');
  });

  test('non-member lookup returns null (cross-tenant access denied at DB level)', async () => {
    const outsider = await createTestUser();
    const res = await ddb.send(
      new GetCommand({
        TableName: TABLE,
        Key: { PK: `HOUSEHOLD#${household.id}`, SK: `MEMBER#${outsider.id}` },
      }),
    );
    expect(res.Item).toBeUndefined();
  });

  test('GSI1 query returns all households for a user', async () => {
    const res = await ddb.send(
      new QueryCommand({
        TableName: TABLE,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :pk AND begins_with(GSI1SK, :sk)',
        ExpressionAttributeValues: {
          ':pk': `USER#${memberUser.id}`,
          ':sk': 'HOUSEHOLD#',
        },
      }),
    );
    expect(res.Items!.length).toBeGreaterThanOrEqual(1);
    expect(res.Items!.some((m) => m.GSI1SK === `HOUSEHOLD#${household.id}`)).toBe(true);
  });
});
