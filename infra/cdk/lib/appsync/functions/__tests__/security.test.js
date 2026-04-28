/**
 * W3 Phase C — Cross-tenant access security tests for AppSync pipeline functions.
 *
 * Tests that checkHouseholdMembership and checkOwnerRole correctly enforce
 * household-scoped authorization without any AWS runtime.
 *
 * The AppSync `util` object is mocked to capture error/unauthorized calls.
 */
'use strict';

const { readFileSync } = require('fs');
const path = require('path');

// ─── Mock AppSync util ────────────────────────────────────────────────────────

class AppSyncAuthError extends Error {
  constructor(msg, type) {
    super(msg);
    this.errorType = type;
  }
}

const util = {
  error(msg, type) { throw new AppSyncAuthError(msg, type); },
  unauthorized(msg) { throw new AppSyncAuthError(msg || 'Unauthorized', 'Unauthorized'); },
};

// ─── Load pipeline functions (eval with util in scope) ────────────────────────

function loadFunction(name) {
  const code = readFileSync(path.join(__dirname, '..', `${name}.js`), 'utf-8');
  const wrapped = code
    .replace(/^export /gm, '')   // strip ES module exports
    .replace(/^import .+$/gm, ''); // strip imports (none expected)
  // eslint-disable-next-line no-new-func
  const fn = new Function('util', `${wrapped}; return { request, response };`);
  return fn(util);
}

const membership = loadFunction('checkHouseholdMembership');
const ownerRole = loadFunction('checkOwnerRole');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeCtx({ sub = 'user-001', householdId, inputKey = 'input', stash = {}, prev = null, result = null, error = null } = {}) {
  const args = householdId ? { [inputKey]: { householdId } } : {};
  return { identity: { sub }, args, stash, prev: { result: prev }, result, error };
}

// ─── checkHouseholdMembership — request ──────────────────────────────────────

describe('checkHouseholdMembership.request', () => {
  test('builds GetItem for HOUSEHOLD#householdId MEMBER#userId', () => {
    const ctx = makeCtx({ sub: 'user-1', householdId: 'hh-1' });
    const op = membership.request(ctx);
    expect(op.operation).toBe('GetItem');
    expect(op.key.PK.S).toBe('HOUSEHOLD#hh-1');
    expect(op.key.SK.S).toBe('MEMBER#user-1');
  });

  test('resolves householdId from args.householdId (top-level)', () => {
    const ctx = { identity: { sub: 'u-1' }, args: { householdId: 'hh-top' }, stash: {}, prev: { result: null } };
    const op = membership.request(ctx);
    expect(op.key.PK.S).toBe('HOUSEHOLD#hh-top');
  });

  test('resolves householdId from args.id for getHousehold resolver', () => {
    const ctx = { identity: { sub: 'u-1' }, args: { id: 'hh-direct' }, stash: {}, prev: { result: null } };
    const op = membership.request(ctx);
    expect(op.key.PK.S).toBe('HOUSEHOLD#hh-direct');
  });

  test('rejects unauthenticated request (no sub)', () => {
    const ctx = makeCtx({ sub: undefined, householdId: 'hh-1' });
    ctx.identity.sub = undefined;
    expect(() => membership.request(ctx)).toThrow(AppSyncAuthError);
    expect(() => membership.request(ctx)).toThrow(expect.objectContaining({ errorType: 'UNAUTHENTICATED' }));
  });

  test('rejects request missing householdId', () => {
    const ctx = { identity: { sub: 'u-1' }, args: {}, stash: {}, prev: { result: null } };
    expect(() => membership.request(ctx)).toThrow(expect.objectContaining({ errorType: 'BAD_REQUEST' }));
  });
});

// ─── checkHouseholdMembership — response ──────────────────────────────────────

describe('checkHouseholdMembership.response', () => {
  test('passes through prev.result and sets stash when member exists', () => {
    const memberRecord = { role: { S: 'member' }, userId: { S: 'user-1' } };
    const ctx = { ...makeCtx(), result: memberRecord, stash: {}, error: null, prev: { result: { someData: true } } };
    const result = membership.response(ctx);
    expect(result).toEqual({ someData: true });
    expect(ctx.stash.userRole).toBe('member');
    expect(ctx.stash.householdMember).toBe(memberRecord);
  });

  test('rejects non-member (null DynamoDB result)', () => {
    const ctx = { ...makeCtx(), result: null, stash: {}, error: null, prev: { result: null } };
    expect(() => membership.response(ctx)).toThrow(expect.objectContaining({ errorType: 'Unauthorized' }));
  });

  test('rejects on DynamoDB error', () => {
    const ctx = { ...makeCtx(), result: null, stash: {}, error: { message: 'DynamoDB timeout' }, prev: { result: null } };
    expect(() => membership.response(ctx)).toThrow(expect.objectContaining({ errorType: 'INTERNAL_ERROR' }));
  });

  test('extracts plain string role (non-DynamoDB-typed format)', () => {
    const ctx = { ...makeCtx(), result: { role: 'owner' }, stash: {}, error: null, prev: { result: {} } };
    membership.response(ctx);
    expect(ctx.stash.userRole).toBe('owner');
  });
});

// ─── checkOwnerRole — request ─────────────────────────────────────────────────

describe('checkOwnerRole.request', () => {
  test('allows owner role and returns empty object (NONE data source)', () => {
    const ctx = { stash: { userRole: 'owner' }, prev: { result: {} } };
    const payload = ownerRole.request(ctx);
    expect(payload).toEqual({});
  });

  test('rejects member role', () => {
    const ctx = { stash: { userRole: 'member' }, prev: { result: {} } };
    expect(() => ownerRole.request(ctx)).toThrow(expect.objectContaining({ errorType: 'FORBIDDEN' }));
  });

  test('rejects viewer role', () => {
    const ctx = { stash: { userRole: 'viewer' }, prev: { result: {} } };
    expect(() => ownerRole.request(ctx)).toThrow(expect.objectContaining({ errorType: 'FORBIDDEN' }));
  });

  test('rejects undefined role (stash not populated)', () => {
    const ctx = { stash: {}, prev: { result: {} } };
    expect(() => ownerRole.request(ctx)).toThrow(expect.objectContaining({ errorType: 'FORBIDDEN' }));
  });
});

// ─── checkOwnerRole — response ────────────────────────────────────────────────

describe('checkOwnerRole.response', () => {
  test('passes through prev.result', () => {
    const ctx = { stash: { userRole: 'owner' }, prev: { result: { id: 'hh-1' } } };
    expect(ownerRole.response(ctx)).toEqual({ id: 'hh-1' });
  });
});

// ─── Cross-tenant scenarios ────────────────────────────────────────────────────

describe('Cross-tenant access: User B cannot access User A household', () => {
  test('membership check targets attacker-in-victim-household key', () => {
    const ctx = makeCtx({ sub: 'user-b', householdId: 'hh-a' });
    const op = membership.request(ctx);
    expect(op.key.PK.S).toBe('HOUSEHOLD#hh-a');
    expect(op.key.SK.S).toBe('MEMBER#user-b');
  });

  test('null DynamoDB result causes Unauthorized (non-member)', () => {
    const ctx = { ...makeCtx(), result: null, stash: {}, error: null, prev: { result: null } };
    expect(() => membership.response(ctx)).toThrow(
      expect.objectContaining({ errorType: 'Unauthorized', message: expect.stringContaining('Not a member') }),
    );
  });

  test('member cannot perform owner-only operations', () => {
    const ctx = { stash: { userRole: 'member' }, prev: { result: {} } };
    expect(() => ownerRole.request(ctx)).toThrow(
      expect.objectContaining({ errorType: 'FORBIDDEN', message: expect.stringContaining('owner role required') }),
    );
  });

  test('full pipeline: attacker stopped at membership check', () => {
    // Step 1: request builds correct GetItem key
    const reqCtx = makeCtx({ sub: 'attacker', householdId: 'victim-hh' });
    const op = membership.request(reqCtx);
    expect(op.key.PK.S).toBe('HOUSEHOLD#victim-hh');
    expect(op.key.SK.S).toBe('MEMBER#attacker');

    // Step 2: DynamoDB returns null — attacker is not a member
    const respCtx = { ...reqCtx, result: null, stash: {}, error: null };
    expect(() => membership.response(respCtx)).toThrow(
      expect.objectContaining({ errorType: 'Unauthorized' }),
    );
  });

  test('legitimate owner can proceed through full pipeline', () => {
    // Step 1: request
    const reqCtx = makeCtx({ sub: 'owner-user', householdId: 'my-hh' });
    const op = membership.request(reqCtx);
    expect(op.operation).toBe('GetItem');

    // Step 2: DynamoDB returns member record with owner role
    const respCtx = {
      ...reqCtx,
      result: { role: { S: 'owner' } },
      stash: {},
      error: null,
      prev: { result: { id: 'my-hh', name: "My Kitchen" } },
    };
    const passThrough = membership.response(respCtx);
    expect(passThrough).toEqual({ id: 'my-hh', name: "My Kitchen" });
    expect(respCtx.stash.userRole).toBe('owner');

    // Step 3: owner role check passes
    const ownerCtx = { stash: respCtx.stash, prev: { result: passThrough } };
    expect(() => ownerRole.request(ownerCtx)).not.toThrow();
  });
});
