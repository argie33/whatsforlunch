// Test helpers for resolver testing
// Mock DynamoDB, Cognito context, and utility functions

import { v4 as uuidv4 } from 'uuid';

// Mock Cognito context for resolver testing
export function createMockCognitoContext(userId: string = uuidv4()) {
  return {
    requestContext: {
      identity: {
        claims: {
          sub: userId,
          email: `user-${userId.slice(0, 8)}@example.com`,
          'cognito:username': `user-${userId.slice(0, 8)}`,
        },
      },
      requestId: uuidv4(),
    },
  };
}

// Mock DynamoDB item for testing
export function createMockItem(overrides: Record<string, any> = {}) {
  const id = uuidv4();
  const now = new Date().toISOString();
  return {
    id,
    PK: `HOUSEHOLD#${uuidv4()}`,
    SK: `ITEM#${id}`,
    entityType: 'Item',
    householdId: uuidv4(),
    foodType: 'cooked_chicken',
    foodName: 'Leftover chicken',
    category: 'protein',
    storageLocation: 'fridge',
    quantityText: '2 servings',
    storedAt: now,
    storedTz: 'America/Los_Angeles',
    expiryAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days
    expirySource: 'rule',
    status: 'active',
    addedByUserId: uuidv4(),
    createdAt: now,
    updatedAt: now,
    _version: 1,
    _lastChangedAt: Date.now(),
    ...overrides,
  };
}

// Mock DynamoDB household
export function createMockHousehold(overrides: Record<string, any> = {}) {
  const id = uuidv4();
  const now = new Date().toISOString();
  return {
    id,
    PK: `HOUSEHOLD#${id}`,
    SK: 'META',
    entityType: 'Household',
    name: 'My Home',
    ownerId: uuidv4(),
    memberCount: 1,
    createdAt: now,
    updatedAt: now,
    _version: 1,
    _lastChangedAt: Date.now(),
    ...overrides,
  };
}

// Mock DynamoDB profile
export function createMockProfile(overrides: Record<string, any> = {}) {
  const userId = uuidv4();
  const now = new Date().toISOString();
  return {
    id: userId,
    PK: `USER#${userId}`,
    SK: 'PROFILE',
    entityType: 'Profile',
    email: `user-${userId.slice(0, 8)}@example.com`,
    displayName: 'Test User',
    timeZone: 'America/Los_Angeles',
    units: 'imperial',
    locale: 'en-US',
    dietaryPreferences: [],
    cuisinePreferences: [],
    allergies: [],
    subscriptionTier: 'free',
    aiQuotaUsedToday: 0,
    aiQuotaResetAt: now,
    createdAt: now,
    updatedAt: now,
    _version: 1,
    _lastChangedAt: Date.now(),
    ...overrides,
  };
}

// Mock event for resolver testing
export function createMockEvent(args: Record<string, any> = {}, userId: string = uuidv4()) {
  return {
    arguments: args,
    requestContext: {
      identity: {
        claims: {
          sub: userId,
          email: `user-${userId.slice(0, 8)}@example.com`,
        },
      },
      requestId: uuidv4(),
    },
  };
}

// Expected error format
export interface ErrorResponse {
  errorType: string;
  message: string;
  errorInfo?: {
    code: string;
    userMessage: string;
    requestId: string;
  };
}

// Assert error response
export function assertErrorResponse(response: any, expectedCode: string) {
  if (!response.errorType) {
    throw new Error(`Expected error response, got: ${JSON.stringify(response)}`);
  }
  if (response.errorType !== expectedCode) {
    throw new Error(`Expected error code ${expectedCode}, got ${response.errorType}`);
  }
  return response as ErrorResponse;
}
