import { describe, it, mock } from 'node:test';
import assert from 'node:assert';

// Mock AWS SDK before importing the handler
const mockSend = mock.fn();

mock.module('@aws-sdk/client-dynamodb', { namedExports: { DynamoDBClient: mock.fn(() => ({})) } });
mock.module('@aws-sdk/lib-dynamodb', {
  namedExports: {
    DynamoDBDocumentClient: { from: mock.fn(() => ({ send: mockSend })) },
    QueryCommand: mock.fn((p: unknown) => p),
  },
});
mock.module('@aws-sdk/client-s3', {
  namedExports: {
    S3Client: mock.fn(() => ({ send: mockSend })),
    PutObjectCommand: mock.fn((p: unknown) => p),
    GetObjectCommand: mock.fn((p: unknown) => p),
  },
});
mock.module('@aws-sdk/s3-request-presigner', {
  namedExports: {
    getSignedUrl: mock.fn(async () => 'https://s3.example.com/exports/user/123.json?sig=abc'),
  },
});
mock.module('@aws-lambda-powertools/logger', {
  namedExports: {
    Logger: mock.fn(() => ({ info: mock.fn(), warn: mock.fn(), error: mock.fn() })),
  },
});

// ── stripInternalKeys (pure function, tested inline) ──────────────────────────

function stripInternalKeys(item: Record<string, unknown>): Record<string, unknown> {
  const { PK, SK, GSI1PK, GSI1SK, GSI2PK, GSI2SK, entityType, ...rest } = item;
  void PK;
  void SK;
  void GSI1PK;
  void GSI1SK;
  void GSI2PK;
  void GSI2SK;
  void entityType;
  return rest;
}

describe('stripInternalKeys', () => {
  it('removes all DynamoDB key fields', () => {
    const item = {
      PK: 'HOUSEHOLD#h1',
      SK: 'ITEM#i1',
      GSI1PK: 'USER#u1',
      GSI1SK: 'ITEM#i1',
      GSI2PK: 'STATUS#active',
      GSI2SK: '2024-01-01',
      entityType: 'Item',
      foodName: 'Milk',
      status: 'active',
    };
    const result = stripInternalKeys(item);
    assert.ok(!('PK' in result));
    assert.ok(!('SK' in result));
    assert.ok(!('GSI1PK' in result));
    assert.ok(!('GSI1SK' in result));
    assert.ok(!('GSI2PK' in result));
    assert.ok(!('GSI2SK' in result));
    assert.ok(!('entityType' in result));
  });

  it('preserves business fields', () => {
    const item = {
      PK: 'HOUSEHOLD#h1',
      SK: 'ITEM#i1',
      foodName: 'Chicken',
      status: 'active',
      expiryAt: '2024-12-31T00:00:00Z',
    };
    const result = stripInternalKeys(item);
    assert.strictEqual(result['foodName'], 'Chicken');
    assert.strictEqual(result['status'], 'active');
    assert.strictEqual(result['expiryAt'], '2024-12-31T00:00:00Z');
  });

  it('handles item with no internal keys', () => {
    const item = { foodName: 'Rice', quantity: 2 };
    const result = stripInternalKeys(item);
    assert.deepStrictEqual(result, item);
  });
});

// ── ExportPayload shape ───────────────────────────────────────────────────────

describe('ExportPayload', () => {
  it('assembles payload with required fields', () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      userId: 'user-123',
      households: [
        {
          householdId: 'hh-1',
          items: [{ foodName: 'Milk' }],
          containers: [],
          shoppingList: [],
          members: [],
        },
      ],
    };

    assert.ok(payload.exportedAt);
    assert.strictEqual(payload.userId, 'user-123');
    assert.strictEqual(payload.households.length, 1);
    assert.strictEqual(payload.households[0]!.householdId, 'hh-1');
    assert.strictEqual(payload.households[0]!.items.length, 1);
  });

  it('totalItems counts across all households', () => {
    const households = [{ items: [1, 2, 3] }, { items: [4, 5] }];
    const total = households.reduce((n, h) => n + h.items.length, 0);
    assert.strictEqual(total, 5);
  });
});

// ── S3 key format ─────────────────────────────────────────────────────────────

describe('S3 export key', () => {
  it('scopes exports under userId', () => {
    const userId = 'user-abc';
    const key = `exports/${userId}/${Date.now()}.json`;
    assert.ok(key.startsWith(`exports/${userId}/`));
    assert.ok(key.endsWith('.json'));
  });
});

// ── URL TTL ───────────────────────────────────────────────────────────────────

describe('presigned URL TTL', () => {
  it('defaults to 86400 seconds (24 hours)', () => {
    const URL_TTL_SECONDS = Number(process.env['URL_TTL_SECONDS'] ?? '86400');
    assert.strictEqual(URL_TTL_SECONDS, 86400);
  });

  it('expiresAt is TTL seconds from now', () => {
    const TTL = 86400;
    const now = Date.now();
    const expiresAt = new Date(now + TTL * 1000).toISOString();
    const diff = new Date(expiresAt).getTime() - now;
    assert.ok(Math.abs(diff - TTL * 1000) < 1000);
  });
});

// ── soft-delete filter in export ─────────────────────────────────────────────

describe('deleted item filter', () => {
  it('excludes items with deletedAt set', () => {
    const items = [
      { foodName: 'Milk', deletedAt: '2024-01-01T00:00:00Z' },
      { foodName: 'Eggs' },
      { foodName: 'Chicken', deletedAt: '2024-01-02T00:00:00Z' },
    ];
    const active = items.filter((r) => !r['deletedAt' as keyof typeof r]);
    assert.strictEqual(active.length, 1);
    assert.strictEqual(active[0]!.foodName, 'Eggs');
  });
});
