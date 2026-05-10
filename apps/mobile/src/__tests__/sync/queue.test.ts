import { __resetAll } from '../__mocks__/mmkv';

// Reset in-memory MMKV store before each test for isolation
beforeEach(() => {
  __resetAll();
  // Re-require so the MMKV instance inside queue.ts picks up the fresh store
  jest.resetModules();
});

function getQueue() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('../../db/queue').writeQueue as typeof import('../../db/queue').writeQueue;
}

const baseOp = {
  type: 'createItem' as const,
  localId: 'local-001',
  cloudId: 'cloud-001',
  householdId: 'hh-001',
  payload: { foodName: 'Leftover Pasta' },
};

// ─── Enqueue ──────────────────────────────────────────────────────────────────

describe('enqueue', () => {
  test('adds an op and increases size', () => {
    const q = getQueue();
    q.enqueue(baseOp);
    expect(q.size()).toBe(1);
  });

  test('assigns id, retryCount=0, enqueuedAt', () => {
    const q = getQueue();
    const queued = q.enqueue(baseOp);
    expect(queued.id).toBeTruthy();
    expect(queued.retryCount).toBe(0);
    expect(queued.enqueuedAt).toBeGreaterThan(0);
  });

  test('deduplicates same localId + type — keeps latest payload', () => {
    const q = getQueue();
    q.enqueue(baseOp);
    q.enqueue({ ...baseOp, payload: { foodName: 'Updated Pasta' } });
    expect(q.size()).toBe(1);
    expect(q.peek()[0].payload.foodName).toBe('Updated Pasta');
  });

  test('does NOT dedup different op types for same localId', () => {
    const q = getQueue();
    q.enqueue(baseOp);
    q.enqueue({ ...baseOp, type: 'markItemEaten' });
    expect(q.size()).toBe(2);
  });

  test('does NOT dedup different localIds with same type', () => {
    const q = getQueue();
    q.enqueue(baseOp);
    q.enqueue({ ...baseOp, localId: 'local-002' });
    expect(q.size()).toBe(2);
  });

  test('peek returns ops in enqueue order', () => {
    const q = getQueue();
    q.enqueue(baseOp);
    q.enqueue({ ...baseOp, localId: 'local-002' });
    const ops = q.peek();
    expect(ops[0].localId).toBe('local-001');
    expect(ops[1].localId).toBe('local-002');
  });
});

// ─── Remove ───────────────────────────────────────────────────────────────────

describe('remove', () => {
  test('removes op by id', () => {
    const q = getQueue();
    const queued = q.enqueue(baseOp);
    q.remove(queued.id);
    expect(q.size()).toBe(0);
  });

  test('no-ops gracefully when id not found', () => {
    const q = getQueue();
    q.enqueue(baseOp);
    q.remove('nonexistent-id');
    expect(q.size()).toBe(1);
  });

  test('only removes the targeted op', () => {
    const q = getQueue();
    const first = q.enqueue(baseOp);
    q.enqueue({ ...baseOp, localId: 'local-002' });
    q.remove(first.id);
    expect(q.size()).toBe(1);
    expect(q.peek()[0].localId).toBe('local-002');
  });
});

// ─── Retry ────────────────────────────────────────────────────────────────────

describe('markRetry', () => {
  test('increments retryCount and returns true while under limit', () => {
    const q = getQueue();
    const queued = q.enqueue(baseOp);
    const kept = q.markRetry(queued.id);
    expect(kept).toBe(true);
    expect(q.peek()[0].retryCount).toBe(1);
  });

  test('op is dropped (returns false) after MAX_RETRIES=5 calls', () => {
    const q = getQueue();
    const queued = q.enqueue(baseOp);
    for (let i = 0; i < 4; i++) q.markRetry(queued.id);
    // 4 retries, still alive
    expect(q.size()).toBe(1);
    const kept = q.markRetry(queued.id); // 5th retry triggers drop
    expect(kept).toBe(false);
    expect(q.size()).toBe(0);
  });

  test('returns false when id not found', () => {
    const q = getQueue();
    expect(q.markRetry('ghost-id')).toBe(false);
  });
});

// ─── Clear ────────────────────────────────────────────────────────────────────

describe('clear', () => {
  test('removes all ops', () => {
    const q = getQueue();
    q.enqueue(baseOp);
    q.enqueue({ ...baseOp, localId: 'local-002' });
    q.enqueue({ ...baseOp, localId: 'local-003' });
    q.clear();
    expect(q.size()).toBe(0);
  });

  test('clear on empty queue is safe', () => {
    const q = getQueue();
    expect(() => q.clear()).not.toThrow();
    expect(q.size()).toBe(0);
  });
});

// ─── Persistence ──────────────────────────────────────────────────────────────

describe('persistence across module instances', () => {
  test('ops written by one require() are visible to another', () => {
    // Both calls return the same module instance within the same test
    // (jest.resetModules is called in beforeEach, not between lines)
    const q = getQueue();
    q.enqueue(baseOp);
    // Re-access the same instance
    const q2 = getQueue();
    expect(q2.size()).toBe(1);
  });
});
