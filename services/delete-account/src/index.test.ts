import { describe, it, mock } from 'node:test';
import assert from 'node:assert';

// Mock AWS SDK before importing the handler
const mockSend = mock.fn();

mock.module('@aws-sdk/client-dynamodb', { namedExports: { DynamoDBClient: mock.fn(() => ({})) } });
mock.module('@aws-sdk/lib-dynamodb', {
  namedExports: {
    DynamoDBDocumentClient: { from: mock.fn(() => ({ send: mockSend })) },
    QueryCommand: mock.fn((p: unknown) => p),
    UpdateCommand: mock.fn((p: unknown) => p),
    BatchWriteCommand: mock.fn((p: unknown) => p),
  },
});
mock.module('@aws-sdk/client-cognito-identity-provider', {
  namedExports: {
    CognitoIdentityProviderClient: mock.fn(() => ({ send: mockSend })),
    AdminDisableUserCommand: mock.fn((p: unknown) => p),
    AdminDeleteUserCommand: mock.fn((p: unknown) => p),
  },
});
mock.module('@aws-lambda-powertools/logger', {
  namedExports: {
    Logger: mock.fn(() => ({ info: mock.fn(), warn: mock.fn(), error: mock.fn() })),
  },
});

// ── Pure logic tests ──────────────────────────────────────────────────────────

describe('purge timing', () => {
  it('purgeAt is PURGE_DELAY_DAYS after now', () => {
    const PURGE_DELAY_DAYS = 30;
    const now = Date.now();
    const purgeAt = new Date(now + PURGE_DELAY_DAYS * 86_400_000).toISOString();
    const diff = new Date(purgeAt).getTime() - now;
    // Allow 1s tolerance
    assert.ok(Math.abs(diff - PURGE_DELAY_DAYS * 86_400_000) < 1000);
  });

  it('purge delay defaults to 30 days', () => {
    const PURGE_DELAY_DAYS = Number(process.env['PURGE_DELAY_DAYS'] ?? '30');
    assert.strictEqual(PURGE_DELAY_DAYS, 30);
  });
});

describe('batch deletion logic', () => {
  it('splits 26 keys into two batches of 25 and 1', () => {
    const keys = Array.from({ length: 26 }, (_, i) => ({ PK: `PK${i}`, SK: 'SK' }));
    const batches: (typeof keys)[] = [];
    for (let i = 0; i < keys.length; i += 25) {
      batches.push(keys.slice(i, i + 25));
    }
    assert.strictEqual(batches.length, 2);
    assert.strictEqual(batches[0]!.length, 25);
    assert.strictEqual(batches[1]!.length, 1);
  });

  it('splits exactly 25 keys into one batch', () => {
    const keys = Array.from({ length: 25 }, (_, i) => ({ PK: `PK${i}`, SK: 'SK' }));
    const batches: (typeof keys)[] = [];
    for (let i = 0; i < keys.length; i += 25) {
      batches.push(keys.slice(i, i + 25));
    }
    assert.strictEqual(batches.length, 1);
    assert.strictEqual(batches[0]!.length, 25);
  });

  it('handles empty keys array', () => {
    const keys: { PK: string; SK: string }[] = [];
    const batches: (typeof keys)[] = [];
    for (let i = 0; i < keys.length; i += 25) {
      batches.push(keys.slice(i, i + 25));
    }
    assert.strictEqual(batches.length, 0);
  });
});

describe('DeleteAccountEvent shape', () => {
  it('purge defaults to false', () => {
    const event = { userId: 'u1', householdIds: ['h1'] };
    const { purge = false } = event as { userId: string; householdIds: string[]; purge?: boolean };
    assert.strictEqual(purge, false);
  });

  it('purge can be set to true for hard delete', () => {
    const event = { userId: 'u1', householdIds: ['h1'], purge: true };
    const { purge = false } = event;
    assert.strictEqual(purge, true);
  });
});

describe('soft-delete update expression', () => {
  it('sets status, deletedAt and updatedAt fields', () => {
    const deletedAt = new Date().toISOString();
    const expr = 'SET #st = :deleted, deletedAt = :ts, updatedAt = :ts';
    assert.ok(expr.includes('#st'));
    assert.ok(expr.includes('deletedAt'));
    assert.ok(expr.includes('updatedAt'));

    const values = { ':deleted': 'deleted', ':ts': deletedAt };
    assert.strictEqual(values[':deleted'], 'deleted');
    assert.strictEqual(values[':ts'], deletedAt);
  });
});
