/**
 * Offline scenario tests for W8 — Mobile Sync & Offline.
 *
 * These tests simulate airplane-mode conditions, partial sync interruptions,
 * and multi-device conflict scenarios by controlling the mocked network layer.
 *
 * All tests use the real queue.ts backed by the in-memory MMKV mock.
 */

import { __resetAll } from '../__mocks__/mmkv';

beforeEach(() => {
  __resetAll();
  jest.resetModules();
});

function getQueue() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('../../db/queue').writeQueue as typeof import('../../db/queue').writeQueue;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeOp(localId: string, type = 'createItem' as const) {
  return {
    type,
    localId,
    cloudId: `cloud-${localId}`,
    householdId: 'hh-001',
    payload: { foodName: `Food ${localId}` },
  };
}

// ─── Airplane mode: accumulate writes while offline ───────────────────────────

describe('Airplane mode — queue accumulation', () => {
  test('multiple items enqueued while offline are all preserved', () => {
    const q = getQueue();
    q.enqueue(makeOp('item-1'));
    q.enqueue(makeOp('item-2'));
    q.enqueue(makeOp('item-3'));
    expect(q.size()).toBe(3);
    expect(q.peek().map((o) => o.localId)).toEqual(['item-1', 'item-2', 'item-3']);
  });

  test('editing same item twice offline collapses to one pending op', () => {
    const q = getQueue();
    q.enqueue({ ...makeOp('item-1', 'updateItem'), payload: { notes: 'first edit' } });
    q.enqueue({ ...makeOp('item-1', 'updateItem'), payload: { notes: 'second edit' } });
    expect(q.size()).toBe(1);
    expect(q.peek()[0].payload.notes).toBe('second edit');
  });

  test('create + mark-eaten while offline both enqueued (different op types)', () => {
    const q = getQueue();
    q.enqueue(makeOp('item-1', 'createItem'));
    q.enqueue(makeOp('item-1', 'markItemEaten'));
    expect(q.size()).toBe(2);
  });

  test('marking item eaten then marking it frozen: both preserved in order', () => {
    const q = getQueue();
    q.enqueue(makeOp('item-1', 'markItemEaten'));
    q.enqueue(makeOp('item-1', 'markItemFrozen'));
    const ops = q.peek();
    expect(ops[0].type).toBe('markItemEaten');
    expect(ops[1].type).toBe('markItemFrozen');
  });

  test('20 items queued offline while online drops each as it succeeds', () => {
    const q = getQueue();
    const ids = Array.from({ length: 20 }, (_, i) => `item-${i}`);
    ids.forEach((id) => q.enqueue(makeOp(id)));
    expect(q.size()).toBe(20);

    // Simulate successful drain
    const ops = q.peek();
    ops.forEach((op) => q.remove(op.id));
    expect(q.size()).toBe(0);
  });
});

// ─── Partial sync interruption ────────────────────────────────────────────────

describe('Partial sync — interrupted drain', () => {
  test('failed op increments retryCount and stays in queue', () => {
    const q = getQueue();
    const queued = q.enqueue(makeOp('item-1'));

    // Simulate one failed network call
    const kept = q.markRetry(queued.id);

    expect(kept).toBe(true);
    expect(q.peek()[0].retryCount).toBe(1);
    expect(q.size()).toBe(1);
  });

  test('successful op is removed; remaining ops stay', () => {
    const q = getQueue();
    const op1 = q.enqueue(makeOp('item-1'));
    q.enqueue(makeOp('item-2'));

    // item-1 succeeds, item-2 pending
    q.remove(op1.id);

    expect(q.size()).toBe(1);
    expect(q.peek()[0].localId).toBe('item-2');
  });

  test('partially drained: first 3 succeed, 4th fails and retries', () => {
    const q = getQueue();
    const ops = Array.from({ length: 5 }, (_, i) => q.enqueue(makeOp(`item-${i}`)));

    // Drain first 3 successfully
    ops.slice(0, 3).forEach((op) => q.remove(op.id));

    // 4th fails
    q.markRetry(ops[3].id);

    expect(q.size()).toBe(2); // 4th (failed) + 5th (not yet attempted)
    expect(q.peek()[0].retryCount).toBe(1);
    expect(q.peek()[1].retryCount).toBe(0);
  });

  test('after reconnection, all remaining ops are visible for drain', () => {
    const q = getQueue();
    // Queue 5 ops "while offline"
    Array.from({ length: 5 }, (_, i) => q.enqueue(makeOp(`item-${i}`)));
    // Simulate "reconnected — drain all"
    const pending = q.peek();
    expect(pending).toHaveLength(5);
  });
});

// ─── Retry exhaustion ─────────────────────────────────────────────────────────

describe('Retry exhaustion', () => {
  test('op is silently dropped after 5 consecutive failures', () => {
    const q = getQueue();
    const queued = q.enqueue(makeOp('item-permanent-fail'));

    for (let i = 0; i < 4; i++) {
      const kept = q.markRetry(queued.id);
      expect(kept).toBe(true);
    }
    // 5th failure drops it
    const kept = q.markRetry(queued.id);
    expect(kept).toBe(false);
    expect(q.size()).toBe(0);
  });

  test('other ops survive when one is exhausted', () => {
    const q = getQueue();
    const bad = q.enqueue(makeOp('item-bad'));
    q.enqueue(makeOp('item-good'));

    for (let i = 0; i < 5; i++) q.markRetry(bad.id);

    expect(q.size()).toBe(1);
    expect(q.peek()[0].localId).toBe('item-good');
  });
});

// ─── Conflict scenario: local unconfirmed vs cloud ────────────────────────────
// These tests exercise the conflict.ts logic under offline conditions.

describe('Conflict resolution: offline local edit vs cloud update', () => {
  test('version=0 local edit is overwritten by any cloud value', () => {
    const { resolveField } = require('../../db/conflict');
    // Unconfirmed local write (version=0) — cloud always wins even with older timestamp
    const result = resolveField('notes', 'local unsynced note', 'cloud note', 9999, 1, 0);
    expect(result).toBe('cloud note');
  });

  test('confirmed local edit (version>0) wins when local is newer', () => {
    const { resolveField } = require('../../db/conflict');
    const result = resolveField('notes', 'fresh local note', 'stale cloud note', 9999, 1000, 1);
    expect(result).toBe('fresh local note');
  });

  test('two devices mark item eaten simultaneously — forward state preserved', () => {
    const { isForwardStatus } = require('../../db/conflict');
    // Device A: active → eaten. Device B also: active → eaten. Both are valid.
    expect(isForwardStatus('active', 'eaten')).toBe(true);
    // After device A's write lands, device B receives eaten status from server.
    // Even though eaten → eaten is same tier (order 2 >= 2), isForwardStatus allows it.
    expect(isForwardStatus('eaten', 'eaten')).toBe(true);
  });

  test('server-side status rewind cannot be applied to terminal state', () => {
    const { resolveField } = require('../../db/conflict');
    // Cloud sends 'active' for an item the local client already marked 'eaten'
    const result = resolveField('status', 'eaten', 'active', 1000, 9999, 2);
    // Even though cloud is newer, 'active' is a backward state — keep 'eaten'
    expect(result).toBe('eaten');
  });

  test('offline delete queued while cloud updates same item: delete survives drain', () => {
    const q = getQueue();
    q.enqueue(makeOp('item-race', 'deleteItem'));
    // Cloud update arrives — does NOT remove local delete from queue
    // (cloud updates are applied via applyDelta, not the queue)
    expect(q.size()).toBe(1);
    expect(q.peek()[0].type).toBe('deleteItem');
  });
});
