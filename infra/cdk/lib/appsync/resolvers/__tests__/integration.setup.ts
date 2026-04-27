/**
 * Integration test setup for resolvers
 * Connects to local DynamoDB and provides test utilities
 */

import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuid } from 'uuid';

const endpoint = process.env.DYNAMODB_ENDPOINT || 'http://localhost:8000';
const tableName = 'WFL-Main-dev';

const client = new DynamoDB({
  endpoint,
  region: 'us-west-2',
  credentials: {
    accessKeyId: 'test',
    secretAccessKey: 'test',
  },
});

export const ddb = DynamoDBDocumentClient.from(client);

export function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

export interface TestUser {
  id: string;
  email: string;
  displayName: string;
}

export interface TestHousehold {
  id: string;
  name: string;
  ownerId: string;
}

export interface TestContext {
  userId: string;
  claims: {
    sub: string;
    email: string;
  };
}

/**
 * Create test user profile in DynamoDB
 */
export async function createTestUser(overrides?: Partial<TestUser>): Promise<TestUser> {
  const userId = uuid();
  const user = {
    PK: `USER#${userId}`,
    SK: 'PROFILE',
    id: userId,
    entityType: 'Profile',
    email: overrides?.email || `test-${userId}@example.com`,
    displayName: overrides?.displayName || 'Test User',
    photoUrl: null,
    timeZone: 'UTC',
    units: 'imperial',
    locale: 'en-US',
    dietaryPreferences: [],
    cuisinePreferences: [],
    allergies: [],
    createdAt: getCurrentTimestamp(),
    updatedAt: getCurrentTimestamp(),
    _version: 1,
    _lastChangedAt: Date.now(),
  };

  await ddb.send(new PutCommand({ TableName: tableName, Item: user as any }));
  return { id: userId, email: user.email, displayName: user.displayName };
}

/**
 * Create test household in DynamoDB
 */
export async function createTestHousehold(
  ownerId: string,
  overrides?: Partial<TestHousehold>
): Promise<TestHousehold> {
  const householdId = uuid();
  const household = {
    PK: `HOUSEHOLD#${householdId}`,
    SK: 'METADATA',
    id: householdId,
    entityType: 'Household',
    name: overrides?.name || 'Test Household',
    imageUrl: null,
    ownerId,
    createdAt: getCurrentTimestamp(),
    updatedAt: getCurrentTimestamp(),
    _version: 1,
    _lastChangedAt: Date.now(),
  };

  const member = {
    PK: `HOUSEHOLD#${householdId}`,
    SK: `MEMBER#${ownerId}`,
    id: uuid(),
    entityType: 'HouseholdMember',
    householdId,
    userId: ownerId,
    role: 'owner',
    joinedAt: getCurrentTimestamp(),
    updatedAt: getCurrentTimestamp(),
    _version: 1,
    _lastChangedAt: Date.now(),
    GSI1PK: `USER#${ownerId}`,
    GSI1SK: `HOUSEHOLD#${householdId}`,
  };

  await ddb.send(new PutCommand({ TableName: tableName, Item: household as any }));
  await ddb.send(new PutCommand({ TableName: tableName, Item: member as any }));

  return {
    id: householdId,
    name: household.name,
    ownerId,
  };
}

/**
 * Create test context (mocked AppSync event context)
 */
export function createTestContext(userId: string, email: string = 'test@example.com'): TestContext {
  return {
    userId,
    claims: {
      sub: userId,
      email,
    },
  };
}

/**
 * Clean up test data
 */
export async function cleanupTestData(): Promise<void> {
  // For local testing, we'd typically delete items or reset table
  // This is a placeholder - implement as needed
  console.log('Cleanup: Integration tests complete');
}

/**
 * Create mock AppSync event
 */
export function createMockAppSyncEvent(
  userContext: TestContext,
  args: any = {},
  identity: any = {}
) {
  return {
    arguments: args,
    identity: {
      claims: userContext.claims,
      ...identity,
    },
    request: {
      requestId: uuid(),
      domainName: 'localhost',
      domainPrefix: 'local',
    },
  };
}
