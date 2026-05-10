import { isForwardStatus, resolveField, mergeItem } from '../../db/conflict';

// ─── isForwardStatus ─────────────────────────────────────────────────────────

describe('isForwardStatus', () => {
  test('active → eaten is forward', () => {
    expect(isForwardStatus('active', 'eaten')).toBe(true);
  });

  test('active → tossed is forward', () => {
    expect(isForwardStatus('active', 'tossed')).toBe(true);
  });

  test('active → frozen is forward (same tier)', () => {
    expect(isForwardStatus('active', 'frozen')).toBe(true);
  });

  test('active → partial is forward (same tier)', () => {
    expect(isForwardStatus('active', 'partial')).toBe(true);
  });

  test('active → transferred is forward', () => {
    expect(isForwardStatus('active', 'transferred')).toBe(true);
  });

  test('active → active stays (equal tier, allowed)', () => {
    expect(isForwardStatus('active', 'active')).toBe(true);
  });

  test('eaten → active is backward — rejected', () => {
    expect(isForwardStatus('eaten', 'active')).toBe(false);
  });

  test('tossed → active is backward — rejected', () => {
    expect(isForwardStatus('tossed', 'active')).toBe(false);
  });

  test('eaten → frozen is backward — rejected', () => {
    expect(isForwardStatus('eaten', 'frozen')).toBe(false);
  });

  test('partial → active is backward — rejected', () => {
    expect(isForwardStatus('partial', 'active')).toBe(false);
  });

  test('unknown current status returns false', () => {
    expect(isForwardStatus('unknown', 'eaten')).toBe(false);
  });

  test('unknown next status returns false', () => {
    expect(isForwardStatus('active', 'unknown')).toBe(false);
  });

  test('both unknown returns false', () => {
    expect(isForwardStatus('', '')).toBe(false);
  });
});

// ─── resolveField ─────────────────────────────────────────────────────────────

describe('resolveField', () => {
  test('version=0 (unconfirmed local) always takes cloud value', () => {
    expect(resolveField('notes', 'local-note', 'cloud-note', 2000, 0, 0)).toBe('cloud-note');
  });

  test('version=0 even when local timestamp is much newer', () => {
    expect(resolveField('notes', 'local-val', 'cloud-val', 999_999, 0, 0)).toBe('cloud-val');
  });

  test('status: valid forward move applies cloud value', () => {
    expect(resolveField('status', 'active', 'eaten', 1000, 500, 1)).toBe('eaten');
  });

  test('status: backward move keeps local value regardless of timestamps', () => {
    expect(resolveField('status', 'eaten', 'active', 1000, 9999, 1)).toBe('eaten');
  });

  test('status: same tier move (frozen → partial) is allowed', () => {
    expect(resolveField('status', 'frozen', 'partial', 1000, 2000, 1)).toBe('partial');
  });

  test('LWW default: cloud newer timestamp wins', () => {
    expect(resolveField('notes', 'old note', 'new note', 1000, 2000, 1)).toBe('new note');
  });

  test('LWW default: local newer timestamp wins', () => {
    expect(resolveField('notes', 'new note', 'old note', 2000, 1000, 1)).toBe('new note');
  });

  test('LWW default: equal timestamps cloud wins (>= condition)', () => {
    expect(resolveField('notes', 'local', 'cloud', 1000, 1000, 1)).toBe('cloud');
  });

  test('LWW applies to expiryAt field', () => {
    // cloud has newer expiryAt — cloud wins
    expect(resolveField('expiryAt', 100, 200, 1000, 2000, 1)).toBe(200);
  });

  test('LWW applies to quantityText field', () => {
    expect(resolveField('quantityText', '100g', '50g', 2000, 1000, 1)).toBe('100g');
  });
});

// ─── mergeItem ────────────────────────────────────────────────────────────────

describe('mergeItem', () => {
  const baseLocal = {
    status: 'active' as string,
    quantityText: '200g',
    quantityValue: 200,
    notes: 'original notes',
    expiryAt: 1_000_000,
    lastChangedAt: 1000,
    version: 1,
  };

  test('cloud notes win when cloud is newer', () => {
    const merged = mergeItem(baseLocal, {
      status: 'active',
      notes: 'cloud updated',
      lastChangedAt: 2000,
    });
    expect(merged.notes).toBe('cloud updated');
  });

  test('local notes survive when local is newer', () => {
    const local = { ...baseLocal, lastChangedAt: 9000 };
    const merged = mergeItem(local, {
      status: 'active',
      notes: 'old cloud note',
      lastChangedAt: 1000,
    });
    expect(merged.notes).toBe('original notes'); // local.lastChangedAt (9000) > cloud.lastChangedAt (1000) → LWW keeps local
  });

  test('cloud status applied for valid forward transition', () => {
    const merged = mergeItem(baseLocal, { status: 'partial', lastChangedAt: 2000 });
    expect(merged.status).toBe('partial');
  });

  test('backward cloud status rejected even with very new cloud timestamp', () => {
    const local = { ...baseLocal, status: 'eaten' };
    const merged = mergeItem(local, { status: 'active', lastChangedAt: 999_999 });
    expect(merged.status).toBe('eaten');
  });

  test('null/undefined cloud fields are not merged into result', () => {
    const merged = mergeItem(baseLocal, { status: 'active', lastChangedAt: 2000 });
    // quantityText, quantityValue, notes, expiryAt not present in cloud payload → not in merged
    expect(merged.quantityText).toBeUndefined();
    expect(merged.quantityValue).toBeUndefined();
    expect(merged.notes).toBeUndefined();
    expect(merged.expiryAt).toBeUndefined();
  });

  test('all cloud fields merged when all provided', () => {
    const merged = mergeItem(baseLocal, {
      status: 'partial',
      quantityText: '100g',
      quantityValue: 100,
      notes: 'half eaten',
      expiryAt: 2_000_000,
      lastChangedAt: 2000,
    });
    expect(merged.status).toBe('partial');
    expect(merged.quantityText).toBe('100g');
    expect(merged.quantityValue).toBe(100);
    expect(merged.notes).toBe('half eaten');
    expect(merged.expiryAt).toBe(2_000_000);
  });

  test('version=0 local — cloud always wins on all fields', () => {
    const unconfirmedLocal = { ...baseLocal, version: 0, lastChangedAt: 9999 };
    const merged = mergeItem(unconfirmedLocal, {
      status: 'active',
      notes: 'server note',
      lastChangedAt: 1,
    });
    // Even though local timestamp is much newer, version=0 means cloud wins
    expect(merged.notes).toBe('server note');
  });
});
