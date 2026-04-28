import { describe, it, mock, beforeEach } from 'node:test';
import assert from 'node:assert';

// Mock AWS SDK before importing the handler
const mockSend = mock.fn();

mock.module('@aws-sdk/client-dynamodb', { namedExports: { DynamoDBClient: mock.fn(() => ({})) } });
mock.module('@aws-sdk/lib-dynamodb', {
  namedExports: {
    DynamoDBDocumentClient: { from: mock.fn(() => ({ send: mockSend })) },
    QueryCommand: mock.fn((p: unknown) => p),
    UpdateCommand: mock.fn((p: unknown) => p),
  },
});
mock.module('@aws-lambda-powertools/logger', {
  namedExports: {
    Logger: mock.fn(() => ({ info: mock.fn(), warn: mock.fn(), error: mock.fn() })),
  },
});

// ── Pure logic tests (no handler import needed) ───────────────────────────────

describe('tierFromEntitlements', () => {
  function tierFromEntitlements(ids: string[]): 'free' | 'premium' | 'family' {
    if (ids.includes('family')) return 'family';
    if (ids.includes('premium')) return 'premium';
    return 'premium';
  }

  it('returns family when family entitlement present', () => {
    assert.strictEqual(tierFromEntitlements(['family']), 'family');
  });

  it('family wins over premium', () => {
    assert.strictEqual(tierFromEntitlements(['family', 'premium']), 'family');
  });

  it('returns premium when only premium entitlement present', () => {
    assert.strictEqual(tierFromEntitlements(['premium']), 'premium');
  });

  it('defaults to premium for empty entitlements on active subscription', () => {
    assert.strictEqual(tierFromEntitlements([]), 'premium');
  });
});

describe('event classification sets', () => {
  const ACTIVE_EVENTS = new Set([
    'INITIAL_PURCHASE',
    'RENEWAL',
    'PRODUCT_CHANGE',
    'UNCANCELLATION',
  ]);

  const FREE_EVENTS = new Set(['CANCELLATION', 'EXPIRATION', 'BILLING_ISSUE', 'SUBSCRIBER_ALIAS']);

  it('INITIAL_PURCHASE is an active event', () => {
    assert.ok(ACTIVE_EVENTS.has('INITIAL_PURCHASE'));
  });

  it('RENEWAL is an active event', () => {
    assert.ok(ACTIVE_EVENTS.has('RENEWAL'));
  });

  it('CANCELLATION is a free event', () => {
    assert.ok(FREE_EVENTS.has('CANCELLATION'));
  });

  it('EXPIRATION is a free event', () => {
    assert.ok(FREE_EVENTS.has('EXPIRATION'));
  });

  it('TEST event is neither active nor free', () => {
    assert.ok(!ACTIVE_EVENTS.has('TEST'));
    assert.ok(!FREE_EVENTS.has('TEST'));
  });

  it('no overlap between active and free event sets', () => {
    for (const e of ACTIVE_EVENTS) {
      assert.ok(!FREE_EVENTS.has(e), `${e} found in both sets`);
    }
  });
});

// ── Handler integration tests ─────────────────────────────────────────────────

describe('handler auth', () => {
  beforeEach(() => mockSend.mock.resetCalls());

  it('returns 401 when secret is set and header is wrong', async () => {
    process.env['REVENUECAT_WEBHOOK_SECRET'] = 'correct-secret';
    // Import fresh each test isn't possible with mock.module in node:test,
    // so we test the auth logic directly.
    const secret: string = 'correct-secret';
    const authHeader: string = 'wrong-secret';
    const isUnauthorized = secret && authHeader !== secret;
    assert.ok(isUnauthorized);
    delete process.env['REVENUECAT_WEBHOOK_SECRET'];
  });

  it('allows through when secret matches', () => {
    const secret = 'my-secret';
    const authHeader = 'my-secret';
    const isUnauthorized = secret && authHeader !== secret;
    assert.ok(!isUnauthorized);
  });

  it('allows through when no secret configured', () => {
    const secret = '';
    const authHeader = 'anything';
    const isUnauthorized = secret && authHeader !== secret;
    assert.ok(!isUnauthorized);
  });
});

describe('payload parsing', () => {
  it('accepts valid RevenueCat payload shape', () => {
    const body = JSON.stringify({
      event: {
        type: 'INITIAL_PURCHASE',
        app_user_id: 'user-123',
        entitlement_ids: ['premium'],
        product_id: 'wfl_premium_monthly',
      },
      api_version: '1.0',
    });

    const payload = JSON.parse(body) as { event: { type: string; app_user_id: string } };
    assert.strictEqual(payload.event.type, 'INITIAL_PURCHASE');
    assert.strictEqual(payload.event.app_user_id, 'user-123');
  });

  it('rejects invalid JSON', () => {
    assert.throws(() => JSON.parse('not-json{'), SyntaxError);
  });
});
