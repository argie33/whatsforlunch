/**
 * Advanced Test Utilities
 * Fixtures, mocks, and assertion helpers for comprehensive testing
 */

import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { v4 as uuid } from 'uuid';

/**
 * Test data fixtures
 */
export const Fixtures = {
  /**
   * Create a complete test household with members
   */
  createFullHousehold: async (ddb: DynamoDBDocumentClient, memberCount = 2) => {
    const ownerId = uuid();
    const householdId = uuid();
    const members = [
      { userId: ownerId, role: 'owner' },
      ...Array.from({ length: memberCount - 1 }, () => ({
        userId: uuid(),
        role: 'member' as const,
      })),
    ];

    // Setup household and members
    const household = {
      PK: `HOUSEHOLD#${householdId}`,
      SK: 'METADATA',
      id: householdId,
      name: 'Test Household',
      ownerId,
    };

    // Create items with various states
    const items = [
      {
        id: uuid(),
        status: 'active' as const,
        expiryAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: uuid(),
        status: 'eaten' as const,
        expiryAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: uuid(),
        status: 'frozen' as const,
        expiryAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ];

    return {
      household,
      householdId,
      ownerId,
      members,
      items,
    };
  },

  /**
   * Create items with various states for testing
   */
  createItemVariations: () => {
    const now = Date.now();
    return {
      active: {
        status: 'active',
        expiryAt: new Date(now + 24 * 60 * 60 * 1000).toISOString(),
        statusColor: 'orange',
      },
      fresh: {
        status: 'active',
        expiryAt: new Date(now + 72 * 60 * 60 * 1000).toISOString(),
        statusColor: 'yellow',
      },
      veryFresh: {
        status: 'active',
        expiryAt: new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString(),
        statusColor: 'green',
      },
      expired: {
        status: 'active',
        expiryAt: new Date(now - 1000).toISOString(),
        statusColor: 'red',
      },
      eaten: {
        status: 'eaten',
        expiryAt: new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString(),
        statusColor: 'gray',
      },
      frozen: {
        status: 'frozen',
        expiryAt: new Date(now + 90 * 24 * 60 * 60 * 1000).toISOString(),
        statusColor: 'green',
      },
    };
  },
};

/**
 * Mock generators for common objects
 */
export const Mocks = {
  /**
   * Create mock AppSync event
   */
  createEvent: (args: any = {}, userId: string = uuid()) => {
    return {
      arguments: args,
      identity: {
        claims: {
          sub: userId,
          email: `${userId}@example.com`,
        },
      },
      request: {
        requestId: uuid(),
        domainName: 'localhost',
      },
    };
  },

  /**
   * Create mock DynamoDB error
   */
  createDbError: (code: string, message: string) => {
    const error = new Error(message);
    (error as any).code = code;
    return error;
  },

  /**
   * Create mock GraphQL error response
   */
  createErrorResponse: (errorType: string, message: string) => {
    return {
      errorType,
      message,
    };
  },
};

/**
 * Assertion helpers
 */
export const Assert = {
  /**
   * Assert resolver returned error
   */
  isError: (result: any) => {
    return result?.errorType && result?.message;
  },

  /**
   * Assert resolver returned success
   */
  isSuccess: (result: any) => {
    return result && !result?.errorType;
  },

  /**
   * Assert specific error type
   */
  isErrorType: (result: any, expectedType: string) => {
    return result?.errorType === expectedType;
  },

  /**
   * Assert field exists in result
   */
  hasField: (result: any, field: string) => {
    return field in result && result[field] !== undefined;
  },

  /**
   * Assert all required fields exist
   */
  hasAllFields: (result: any, fields: string[]) => {
    return fields.every((field) => Assert.hasField(result, field));
  },

  /**
   * Assert version was incremented
   */
  versionIncremented: (oldVersion: number, newVersion: number) => {
    return newVersion === oldVersion + 1;
  },

  /**
   * Assert timestamp is recent (within last second)
   */
  recentTimestamp: (timestamp: string) => {
    const age = Date.now() - new Date(timestamp).getTime();
    return age >= 0 && age < 1000;
  },

  /**
   * Assert array length
   */
  arrayLength: (arr: any[], expectedLength: number) => {
    return Array.isArray(arr) && arr.length === expectedLength;
  },

  /**
   * Assert page contains expected items
   */
  pageContains: (page: any, expectedIds: string[]) => {
    const actualIds = (page?.items || []).map((item: any) => item.id);
    return expectedIds.every((id) => actualIds.includes(id));
  },
};

/**
 * Test data builders
 */
export const Builders = {
  /**
   * Build an item with customizations
   */
  buildItem: (overrides: any = {}) => {
    const now = Date.now();
    return {
      id: uuid(),
      householdId: uuid(),
      foodType: 'chicken',
      quantity: 1,
      quantityUnit: 'portion',
      status: 'active',
      expiryAt: new Date(now + 24 * 60 * 60 * 1000).toISOString(),
      storageLocation: 'fridge',
      createdByUserId: uuid(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      _version: 1,
      _lastChangedAt: now,
      ...overrides,
    };
  },

  /**
   * Build a household
   */
  buildHousehold: (overrides: any = {}) => {
    return {
      id: uuid(),
      name: 'Test Household',
      ownerId: uuid(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      _version: 1,
      _lastChangedAt: Date.now(),
      ...overrides,
    };
  },

  /**
   * Build a shopping item
   */
  buildShoppingItem: (overrides: any = {}) => {
    return {
      id: uuid(),
      householdId: uuid(),
      name: 'Milk',
      quantity: '1 liter',
      category: 'dairy',
      addedByUserId: uuid(),
      purchasedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      _version: 1,
      _lastChangedAt: Date.now(),
      ...overrides,
    };
  },

  /**
   * Build multiple items
   */
  buildItems: (count: number, overrides: any = {}) => {
    return Array.from({ length: count }, () => Builders.buildItem(overrides));
  },
};

/**
 * Scenario helpers for common test flows
 */
export const Scenarios = {
  /**
   * Simulate concurrent item update conflict
   */
  concurrentUpdateConflict: async (ddb: DynamoDBDocumentClient, item: any) => {
    // Create item with version 1
    await ddb.put({ TableName: 'WFL-Main-dev', Item: item });

    // Simulate two concurrent updates
    const update1 = { ...item, foodType: 'beef', _version: 2 };
    const update2 = { ...item, quantity: 2, _version: 2 };

    return { update1, update2, originalVersion: item._version };
  },

  /**
   * Simulate household membership progression
   */
  householdMembershipFlow: async (ddb: DynamoDBDocumentClient, householdId: string) => {
    const owner = uuid();
    const member1 = uuid();
    const member2 = uuid();

    return {
      householdId,
      owner,
      initialMembers: [{ userId: owner, role: 'owner' }],
      addedMembers: [
        { userId: member1, role: 'member' },
        { userId: member2, role: 'member' },
      ],
      finalMembers: [
        { userId: owner, role: 'owner' },
        { userId: member1, role: 'member' },
      ],
    };
  },

  /**
   * Simulate item lifecycle
   */
  itemLifecycle: () => {
    const itemId = uuid();
    const userId = uuid();
    const now = Date.now();

    return {
      itemId,
      userId,
      creation: {
        status: 'active',
        expiryAt: new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString(),
        version: 1,
      },
      partial: {
        status: 'partial',
        quantity: '0.5',
        version: 2,
      },
      frozen: {
        status: 'frozen',
        expiryAt: new Date(now + 90 * 24 * 60 * 60 * 1000).toISOString(),
        version: 3,
      },
      eaten: {
        status: 'eaten',
        version: 4,
      },
    };
  },
};

/**
 * Performance testing helpers
 */
export const Performance = {
  /**
   * Measure resolver execution time
   */
  measureExecution: async (fn: () => Promise<any>) => {
    const start = Date.now();
    const result = await fn();
    const duration = Date.now() - start;

    return {
      result,
      duration,
      performanceOk: duration < 1000, // 1 second threshold
    };
  },

  /**
   * Run resolver N times and collect metrics
   */
  benchmarkResolver: async (fn: () => Promise<any>, iterations: number = 10) => {
    const durations: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const start = Date.now();
      await fn();
      durations.push(Date.now() - start);
    }

    return {
      iterations,
      avgDuration: Math.floor(durations.reduce((a, b) => a + b, 0) / durations.length),
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      p95Duration: durations.sort((a, b) => a - b)[Math.floor(durations.length * 0.95)],
    };
  },
};

/**
 * Cleanup helper
 */
export async function cleanupTestData(
  ddb: DynamoDBDocumentClient,
  pk: string
) {
  // Delete all items with this PK
  const query = await ddb.query({
    TableName: 'WFL-Main-dev',
    KeyConditionExpression: 'PK = :pk',
    ExpressionAttributeValues: { ':pk': pk },
  } as any);

  for (const item of query.Items || []) {
    await ddb.delete({
      TableName: 'WFL-Main-dev',
      Key: { PK: item.PK, SK: item.SK },
    } as any);
  }
}
