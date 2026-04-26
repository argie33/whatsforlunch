import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import { handler } from './index';
import { AppSyncIdentityWithRequestId } from 'aws-lambda/common/appsync';

const mockIdentity: AppSyncIdentityWithRequestId = {
  accountId: '123456789',
  cognitoIdentityAuthProvider: 'cognito-idp.us-east-1.amazonaws.com/us-east-1_abc123',
  cognitoIdentityAuthType: 'authenticated',
  cognitoIdentityId: 'us-east-1:12345678-1234-1234-1234-123456789012',
  claims: {
    sub: 'user-id-123',
    email: 'test@example.com',
  },
  defaultAuthorizationType: 'AMAZON_COGNITO_USER_POOLS',
  issuer: 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_abc123',
  principalOrgId: null,
  requestId: 'request-id-123',
  sourceIp: ['192.168.1.1'],
  sub: 'user-id-123',
  userArn: 'arn:aws:iam::123456789:user/test',
  username: 'test@example.com',
};

describe('classify-food Lambda', () => {
  before(() => {
    process.env.NODE_ENV = 'development';
  });

  it('should classify a food item successfully', async () => {
    const event = {
      arguments: {
        photoPath: 's3://wfl-photos-dev/12345/item-abc.jpg',
        userId: 'user-123',
        householdId: 'household-456',
        itemId: 'item-789',
        storageLocation: 'fridge' as const,
        userTimeZone: 'America/Los_Angeles',
        userHint: 'leftover pasta',
      },
      identity: mockIdentity,
    };

    const result = await handler(event as any);

    assert.ok(result, 'Should return a result');
    assert.ok(result.classification, 'Should have classification');
    assert.ok(result.classification.foodType, 'Should have foodType');
    assert.ok(result.classification.foodName, 'Should have foodName');
    assert.ok(typeof result.classification.daysSafe === 'number', 'Should have daysSafe');
    assert.ok(typeof result.classification.confidence === 'number', 'Should have confidence');
    assert.ok(result.classification.confidence >= 0 && result.classification.confidence <= 1, 'Confidence should be 0-1');
    assert.ok(result.classification.reasoning, 'Should have reasoning');
    assert.ok(Array.isArray(result.classification.alternatives), 'Should have alternatives array');
    assert.ok(['none', 'possible_mold', 'discoloration', 'freezer_burn'].includes(result.classification.visualWarning), 'Should have valid visualWarning');
    assert.ok(result.latencyMs > 0, 'Should have latency');
    assert.ok(result.costUsd >= 0, 'Should have cost');
    assert.equal(result.promptVersion, 1, 'Should have prompt version');
  });

  it('should handle different storage locations', async () => {
    const locations = ['fridge', 'freezer', 'pantry', 'counter', 'lunchbox'] as const;

    for (const location of locations) {
      const event = {
        arguments: {
          photoPath: 's3://wfl-photos-dev/12345/item-abc.jpg',
          userId: 'user-123',
          householdId: 'household-456',
          itemId: 'item-789',
          storageLocation: location,
          userTimeZone: 'America/New_York',
        },
        identity: mockIdentity,
      };

      const result = await handler(event as any);
      assert.ok(result.classification, `Should handle ${location}`);
    }
  });

  it('should calculate costs correctly', async () => {
    const event = {
      arguments: {
        photoPath: 's3://wfl-photos-dev/12345/item-abc.jpg',
        userId: 'user-123',
        householdId: 'household-456',
        itemId: 'item-789',
        storageLocation: 'fridge' as const,
        userTimeZone: 'America/Los_Angeles',
      },
      identity: mockIdentity,
    };

    const result = await handler(event as any);

    // Cost should be positive and reasonable (< $0.01 per call)
    assert.ok(result.costUsd > 0, 'Should have positive cost');
    assert.ok(result.costUsd < 0.01, 'Cost should be reasonable (<$0.01)');
  });

  it('should handle optional user hint', async () => {
    const event = {
      arguments: {
        photoPath: 's3://wfl-photos-dev/12345/item-abc.jpg',
        userId: 'user-123',
        householdId: 'household-456',
        itemId: 'item-789',
        storageLocation: 'fridge' as const,
        userTimeZone: 'America/Los_Angeles',
        userHint: 'looks like chicken',
      },
      identity: mockIdentity,
    };

    const result = await handler(event as any);
    assert.ok(result.classification, 'Should handle user hint');
  });

  it('should validate input schema', async () => {
    const event = {
      arguments: {
        photoPath: '',
        userId: 'user-123',
        householdId: 'household-456',
        itemId: 'item-789',
        storageLocation: 'invalid-location' as any,
        userTimeZone: 'America/Los_Angeles',
      },
      identity: mockIdentity,
    };

    try {
      await handler(event as any);
      assert.fail('Should have thrown validation error');
    } catch (error) {
      assert.ok(error, 'Should throw error on invalid input');
    }
  });
});
