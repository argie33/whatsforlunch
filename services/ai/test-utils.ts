/**
 * Test utilities for AI Lambda integration testing.
 * Used by W4, W6, W9 for end-to-end testing.
 */

import { BedrockMockClient } from './shared/src/bedrock-mock';
import { TextractMockClient } from './shared/src/textract-mock';
import { AppSyncIdentityWithRequestId } from 'aws-lambda/common/appsync';
import { v4 as uuid } from 'crypto';

/**
 * Mock AppSync identity for testing.
 */
export function createMockIdentity(userId: string = uuid()): AppSyncIdentityWithRequestId {
  return {
    accountId: '123456789012',
    cognitoIdentityAuthProvider: 'cognito-idp.us-east-1.amazonaws.com/us-east-1_test123',
    cognitoIdentityAuthType: 'authenticated',
    cognitoIdentityId: `us-east-1:${uuid()}`,
    claims: {
      sub: userId,
      email: `test-${userId.substring(0, 8)}@example.com`,
    },
    defaultAuthorizationType: 'AMAZON_COGNITO_USER_POOLS',
    issuer: 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_test123',
    principalOrgId: null,
    requestId: uuid(),
    sourceIp: ['192.168.1.1'],
    sub: userId,
    userArn: `arn:aws:iam::123456789012:user/${userId}`,
    username: `test-${userId.substring(0, 8)}@example.com`,
  };
}

/**
 * Test data builder for classify-food Lambda.
 */
export interface ClassifyFoodTestInput {
  photoPath?: string;
  userId?: string;
  householdId?: string;
  itemId?: string;
  storageLocation?: 'fridge' | 'freezer' | 'pantry' | 'counter' | 'lunchbox';
  userHint?: string;
  userTimeZone?: string;
}

export function createClassifyFoodInput(overrides: ClassifyFoodTestInput = {}) {
  return {
    photoPath: overrides.photoPath || 's3://test-bucket/photos/test-photo.jpg',
    userId: overrides.userId || uuid(),
    householdId: overrides.householdId || uuid(),
    itemId: overrides.itemId || uuid(),
    storageLocation: overrides.storageLocation || 'fridge',
    userHint: overrides.userHint,
    userTimeZone: overrides.userTimeZone || 'America/Los_Angeles',
  };
}

/**
 * Test data builder for ocr-expiry-date Lambda.
 */
export interface OcrExpiryDateTestInput {
  photoPath?: string;
  userId?: string;
  householdId?: string;
  itemId?: string;
}

export function createOcrExpiryDateInput(overrides: OcrExpiryDateTestInput = {}) {
  return {
    photoPath: overrides.photoPath || 's3://test-bucket/photos/test-date.jpg',
    userId: overrides.userId || uuid(),
    householdId: overrides.householdId || uuid(),
    itemId: overrides.itemId || uuid(),
  };
}

/**
 * Mock DynamoDB for testing (returns stub data).
 */
export class MockDynamoDB {
  async putItem(tableName: string, item: Record<string, unknown>): Promise<void> {
    // Stub: in real tests, use DynamoDB local
    console.log(`[MOCK DynamoDB] PutItem on ${tableName}:`, JSON.stringify(item));
  }

  async getItem(
    tableName: string,
    key: Record<string, unknown>,
  ): Promise<Record<string, unknown> | null> {
    // Stub: return mock data
    if (tableName === 'WFL-Main' && key['PK'] === 'PROFILE#test') {
      return {
        id: 'user-123',
        aiQuotaUsedToday: 5,
        aiQuotaResetAt: new Date().toISOString(),
      };
    }
    return null;
  }

  async query(
    tableName: string,
    indexName: string,
    keyCondition: Record<string, unknown>,
  ): Promise<Record<string, unknown>[]> {
    // Stub: return mock data based on query
    if (indexName === 'GSI1' && keyCondition['GSI1PK'] === 'USER#test') {
      return [
        {
          id: 'household-1',
          name: 'Test Household',
          memberCount: 2,
        },
      ];
    }
    return [];
  }
}

/**
 * Mock S3 for testing.
 */
export class MockS3 {
  async getObject(bucket: string, key: string): Promise<Uint8Array> {
    // Stub: return fake image bytes (JPEG header)
    return new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
  }

  async putObject(bucket: string, key: string, body: Uint8Array): Promise<void> {
    console.log(`[MOCK S3] PutObject ${bucket}/${key} (${body.length} bytes)`);
  }

  async getSignedUrl(bucket: string, key: string): Promise<string> {
    return `https://s3.amazonaws.com/${bucket}/${key}?signed=true`;
  }
}

/**
 * Mock CloudWatch for metrics.
 */
export class MockCloudWatch {
  private metrics: Array<{ name: string; value: number; unit: string; timestamp: Date }> = [];

  putMetric(name: string, value: number, unit: string = 'None'): void {
    this.metrics.push({ name, value, unit, timestamp: new Date() });
    console.log(`[MOCK CloudWatch] ${name}=${value}${unit ? ` ${unit}` : ''}`);
  }

  getMetrics() {
    return this.metrics;
  }

  clear() {
    this.metrics = [];
  }
}

/**
 * Test harness combining all mocks.
 */
export class AILambdaTestHarness {
  bedrockClient = new BedrockMockClient();
  textractClient = new TextractMockClient();
  dynamodb = new MockDynamoDB();
  s3 = new MockS3();
  cloudwatch = new MockCloudWatch();

  createEvent(lambdaType: 'classify-food' | 'ocr-expiry-date', overrides?: Record<string, unknown>) {
    if (lambdaType === 'classify-food') {
      return {
        arguments: { ...createClassifyFoodInput(), ...overrides },
        identity: createMockIdentity(),
      };
    } else {
      return {
        arguments: { ...createOcrExpiryDateInput(), ...overrides },
        identity: createMockIdentity(),
      };
    }
  }

  reset() {
    this.cloudwatch.clear();
  }
}

/**
 * Assertion helpers for tests.
 */
export function assertClassifyFoodResponse(response: unknown) {
  if (!response || typeof response !== 'object') {
    throw new Error('Response is not an object');
  }

  const r = response as Record<string, unknown>;

  if (!r.classification) throw new Error('Missing classification');
  if (typeof r.latencyMs !== 'number') throw new Error('Missing latencyMs');
  if (typeof r.costUsd !== 'number') throw new Error('Missing costUsd');

  const c = r.classification as Record<string, unknown>;
  if (!c.foodType) throw new Error('Missing foodType');
  if (!c.foodName) throw new Error('Missing foodName');
  if (typeof c.daysSafe !== 'number') throw new Error('Missing daysSafe');
  if (typeof c.confidence !== 'number') throw new Error('Missing confidence');
  if (!c.reasoning) throw new Error('Missing reasoning');
  if (!Array.isArray(c.alternatives)) throw new Error('Missing alternatives');
  if (!c.visualWarning) throw new Error('Missing visualWarning');
}

export function assertOcrExpiryDateResponse(response: unknown) {
  if (!response || typeof response !== 'object') {
    throw new Error('Response is not an object');
  }

  const r = response as Record<string, unknown>;

  if (!r.expiryDate) throw new Error('Missing expiryDate');
  if (typeof r.latencyMs !== 'number') throw new Error('Missing latencyMs');
  if (typeof r.costUsd !== 'number') throw new Error('Missing costUsd');

  const e = r.expiryDate as Record<string, unknown>;
  if (!Array.isArray(e.detectedDates)) throw new Error('Missing detectedDates');
  if (typeof e.confidence !== 'number') throw new Error('Missing confidence');
}
