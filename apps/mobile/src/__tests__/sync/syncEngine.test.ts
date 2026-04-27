import { SyncEngine, DeltaSyncPayload, CloudItem, CloudContainer } from '../../db/sync';

// ─── Repository mocks ────────────────────────────────────────────────────────

const mockItemRepo = {
  upsertFromCloud: jest.fn().mockResolvedValue(undefined),
  findById: jest.fn().mockResolvedValue(null),
};

const mockContainerRepo = {
  upsertFromCloud: jest.fn().mockResolvedValue(undefined),
  findById: jest.fn().mockResolvedValue(null),
};

const mockHouseholdRepo = {
  upsertFromCloud: jest.fn().mockResolvedValue(undefined),
  findById: jest.fn().mockResolvedValue(null),
};

const mockShoppingRepo = {
  upsertFromCloud: jest.fn().mockResolvedValue(undefined),
  findById: jest.fn().mockResolvedValue(null),
};

jest.mock('../../db/repositories/ItemRepository', () => ({
  ItemRepository: jest.fn().mockImplementation(() => mockItemRepo),
}));

jest.mock('../../db/repositories/ContainerRepository', () => ({
  ContainerRepository: jest.fn().mockImplementation(() => mockContainerRepo),
}));

jest.mock('../../db/repositories/HouseholdRepository', () => ({
  HouseholdRepository: jest.fn().mockImplementation(() => mockHouseholdRepo),
}));

jest.mock('../../db/repositories/ShoppingListRepository', () => ({
  ShoppingListRepository: jest.fn().mockImplementation(() => mockShoppingRepo),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeItem(i: number): CloudItem {
  return {
    id: `cloud-item-${i}`,
    householdId: 'hh-001',
    addedByUserId: 'user-001',
    foodType: 'dairy',
    foodName: `Item ${i}`,
    category: 'dairy',
    storageLocation: 'fridge',
    storedAt: Date.now(),
    storedTz: 'America/New_York',
    expiryAt: Date.now() + 86_400_000,
    expirySource: 'rule',
    status: 'active',
    _version: 1,
    _lastChangedAt: Date.now(),
  };
}

function makeContainer(i: number): CloudContainer {
  return {
    id: `cloud-container-${i}`,
    householdId: 'hh-001',
    qrToken: `qr-${i}`,
    claimedAt: Date.now(),
    claimedBy: 'user-001',
    _version: 1,
    _lastChangedAt: Date.now(),
  };
}

const emptyPayload: DeltaSyncPayload = {
  containers: [],
  items: [],
  shoppingList: [],
  serverTimestamp: new Date().toISOString(),
};

// ─── Test setup ───────────────────────────────────────────────────────────────

// ─── Fake DB ──────────────────────────────────────────────────────────────────
// confirmPush calls db.write() directly; provide a passthrough implementation.

const mockDb = {
  write: jest.fn((fn: () => Promise<void>) => fn()),
};

let engine: SyncEngine;

beforeEach(() => {
  jest.clearAllMocks();
  mockDb.write.mockImplementation((fn: () => Promise<void>) => fn());
  engine = new SyncEngine(mockDb as never);
});

// ─── applyDelta ───────────────────────────────────────────────────────────────

describe('SyncEngine.applyDelta', () => {
  test('empty payload completes without calling any repo', async () => {
    await engine.applyDelta(emptyPayload);
    expect(mockItemRepo.upsertFromCloud).not.toHaveBeenCalled();
    expect(mockContainerRepo.upsertFromCloud).not.toHaveBeenCalled();
    expect(mockShoppingRepo.upsertFromCloud).not.toHaveBeenCalled();
  });

  test('routes items to ItemRepository.upsertFromCloud', async () => {
    await engine.applyDelta({ ...emptyPayload, items: [makeItem(1), makeItem(2)] });
    expect(mockItemRepo.upsertFromCloud).toHaveBeenCalledTimes(2);
  });

  test('routes containers to ContainerRepository.upsertFromCloud', async () => {
    await engine.applyDelta({ ...emptyPayload, containers: [makeContainer(1)] });
    expect(mockContainerRepo.upsertFromCloud).toHaveBeenCalledTimes(1);
  });

  test('processes items + containers in same delta', async () => {
    await engine.applyDelta({
      ...emptyPayload,
      items: [makeItem(1)],
      containers: [makeContainer(1)],
    });
    expect(mockItemRepo.upsertFromCloud).toHaveBeenCalledTimes(1);
    expect(mockContainerRepo.upsertFromCloud).toHaveBeenCalledTimes(1);
  });

  test('passes correct field mapping to upsertFromCloud for items', async () => {
    const item = makeItem(42);
    await engine.applyDelta({ ...emptyPayload, items: [item] });
    const call = mockItemRepo.upsertFromCloud.mock.calls[0][0];
    expect(call.id).toBe('cloud-item-42');
    expect(call.version).toBe(1);
    expect(call.lastChangedAt).toBe(item._lastChangedAt);
  });

  test('passes correct field mapping to upsertFromCloud for containers', async () => {
    const c = makeContainer(7);
    await engine.applyDelta({ ...emptyPayload, containers: [c] });
    const call = mockContainerRepo.upsertFromCloud.mock.calls[0][0];
    expect(call.id).toBe('cloud-container-7');
    expect(call.qrToken).toBe('qr-7');
    expect(call.version).toBe(1);
  });

  test('tombstoned item (deletedAt set) is forwarded to repo', async () => {
    const item = { ...makeItem(1), deletedAt: Date.now() };
    await engine.applyDelta({ ...emptyPayload, items: [item] });
    const call = mockItemRepo.upsertFromCloud.mock.calls[0][0];
    expect(call.deletedAt).toEqual(item.deletedAt);
  });

  test('rejects if a repo throws', async () => {
    mockItemRepo.upsertFromCloud.mockRejectedValueOnce(new Error('DB write failed'));
    await expect(
      engine.applyDelta({ ...emptyPayload, items: [makeItem(1)] }),
    ).rejects.toThrow('DB write failed');
  });
});

// ─── confirmPush ─────────────────────────────────────────────────────────────

describe('SyncEngine.confirmPush', () => {
  test('stamps item with cloudId + version after successful push', async () => {
    const fakeItem = {
      cloudId: '',
      version: 0,
      lastChangedAt: 0,
      update: jest.fn((fn) => fn(fakeItem)),
    };
    mockItemRepo.findById.mockResolvedValueOnce(fakeItem);

    await engine.confirmPush([
      { localId: 'local-001', cloudId: 'cloud-001', version: 2, lastChangedAt: 9999 },
    ]);

    expect(fakeItem.cloudId).toBe('cloud-001');
    expect(fakeItem.version).toBe(2);
    expect(fakeItem.lastChangedAt).toBe(9999);
  });

  test('falls through to container when item not found', async () => {
    mockItemRepo.findById.mockResolvedValueOnce(null);
    const fakeContainer = {
      cloudId: '',
      version: 0,
      lastChangedAt: 0,
      update: jest.fn((fn) => fn(fakeContainer)),
    };
    mockContainerRepo.findById.mockResolvedValueOnce(fakeContainer);

    await engine.confirmPush([
      { localId: 'local-c-001', cloudId: 'cloud-c-001', version: 1, lastChangedAt: 5000 },
    ]);

    expect(fakeContainer.cloudId).toBe('cloud-c-001');
    expect(fakeContainer.version).toBe(1);
  });

  test('skips confirmation gracefully when localId not found anywhere', async () => {
    mockItemRepo.findById.mockResolvedValue(null);
    mockContainerRepo.findById.mockResolvedValue(null);
    mockShoppingRepo.findById.mockResolvedValue(null);

    await expect(
      engine.confirmPush([{ localId: 'ghost', cloudId: 'x', version: 1, lastChangedAt: 1 }]),
    ).resolves.not.toThrow();
  });

  test('processes multiple confirmations independently', async () => {
    const fakeItem1 = { cloudId: '', version: 0, lastChangedAt: 0, update: jest.fn((fn) => fn(fakeItem1)) };
    const fakeItem2 = { cloudId: '', version: 0, lastChangedAt: 0, update: jest.fn((fn) => fn(fakeItem2)) };
    mockItemRepo.findById
      .mockResolvedValueOnce(fakeItem1)
      .mockResolvedValueOnce(fakeItem2);

    await engine.confirmPush([
      { localId: 'l1', cloudId: 'c1', version: 1, lastChangedAt: 100 },
      { localId: 'l2', cloudId: 'c2', version: 3, lastChangedAt: 200 },
    ]);

    expect(fakeItem1.cloudId).toBe('c1');
    expect(fakeItem2.cloudId).toBe('c2');
    expect(fakeItem2.version).toBe(3);
  });
});

// ─── Performance: 1000 items in < 5s ─────────────────────────────────────────
// This measures the Promise.all orchestration overhead with mocked (no-op) repos.
// End-to-end DB write perf must be validated on a device or simulator.

describe('SyncEngine performance', () => {
  test('applyDelta with 1000 items completes in < 5s', async () => {
    const items = Array.from({ length: 1000 }, (_, i) => makeItem(i));
    const t0 = Date.now();
    await engine.applyDelta({ ...emptyPayload, items });
    const elapsed = Date.now() - t0;
    expect(elapsed).toBeLessThan(5000);
    expect(mockItemRepo.upsertFromCloud).toHaveBeenCalledTimes(1000);
  });

  test('applyDelta with 1000 containers completes in < 5s', async () => {
    const containers = Array.from({ length: 1000 }, (_, i) => makeContainer(i));
    const t0 = Date.now();
    await engine.applyDelta({ ...emptyPayload, containers });
    const elapsed = Date.now() - t0;
    expect(elapsed).toBeLessThan(5000);
    expect(mockContainerRepo.upsertFromCloud).toHaveBeenCalledTimes(1000);
  });

  test('applyDelta with mixed 1000-item+200-container delta in < 5s', async () => {
    const items = Array.from({ length: 1000 }, (_, i) => makeItem(i));
    const containers = Array.from({ length: 200 }, (_, i) => makeContainer(i));
    const t0 = Date.now();
    await engine.applyDelta({ ...emptyPayload, items, containers });
    const elapsed = Date.now() - t0;
    expect(elapsed).toBeLessThan(5000);
  });
});
