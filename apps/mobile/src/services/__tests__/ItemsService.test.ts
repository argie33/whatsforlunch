import { __resetAll } from '../../__tests__/__mocks__/mmkv';

// ─── WatermelonDB mock ────────────────────────────────────────────────────────

const fakeItem = {
  id: 'local-item-abc',
  cloudId: 'cloud-item-abc',
  householdId: 'hh-001',
  expiryAt: Date.now() + 7 * 86400000,
  update: jest.fn().mockImplementation(async (fn: (r: any) => void) => {
    fn(fakeItem);
    return fakeItem;
  }),
};

const mockFind = jest.fn().mockResolvedValue(fakeItem);
const mockFetch = jest.fn().mockResolvedValue([]);
const mockCreate = jest.fn().mockImplementation((fn: (r: any) => void) => {
  const r: any = {
    id: 'local-created',
    cloudId: 'cloud-created',
    householdId: 'hh-001',
    status: 'active',
  };
  fn(r);
  return r;
});
const mockWrite = jest.fn().mockImplementation(async (fn: () => unknown) => fn());
const mockGet = jest.fn().mockReturnValue({
  query: jest.fn().mockReturnValue({ fetch: mockFetch }),
  find: mockFind,
  create: mockCreate,
});

const mockDb = { write: mockWrite, get: mockGet };

// ─── Setup ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  __resetAll();
  jest.resetModules();
  jest.clearAllMocks();
  mockFind.mockResolvedValue(fakeItem);
  mockFetch.mockResolvedValue([]);
  fakeItem.update.mockImplementation(async (fn: (r: any) => void) => {
    fn(fakeItem);
    return fakeItem;
  });
});

async function getService() {
  return (await import('../ItemsService')).itemsService;
}

async function getQueue() {
  return (await import('../../db/queue')).writeQueue;
}

// ─── markItemEaten ───────────────────────────────────────────────────────────

describe('ItemsService.markItemEaten', () => {
  test('enqueues markItemEaten op with correct ids', async () => {
    const service = await getService();
    const queue = await getQueue();
    const spy = jest.spyOn(queue, 'enqueue');

    await service.markItemEaten(mockDb as any, 'local-item-abc');

    expect(spy).toHaveBeenCalledWith(expect.objectContaining({
      type: 'markItemEaten',
      localId: fakeItem.id,
      cloudId: fakeItem.cloudId,
      householdId: fakeItem.householdId,
    }));
  });

  test('throws if item not found', async () => {
    mockFind.mockResolvedValueOnce(null);
    const service = await getService();
    await expect(service.markItemEaten(mockDb as any, 'ghost-id')).rejects.toThrow('not found');
  });
});

// ─── markItemTossed ──────────────────────────────────────────────────────────

describe('ItemsService.markItemTossed', () => {
  test('enqueues markItemTossed op', async () => {
    const service = await getService();
    const queue = await getQueue();
    const spy = jest.spyOn(queue, 'enqueue');

    await service.markItemTossed(mockDb as any, 'local-item-abc');

    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ type: 'markItemTossed' }));
  });

  test('throws if item not found', async () => {
    mockFind.mockResolvedValueOnce(null);
    const service = await getService();
    await expect(service.markItemTossed(mockDb as any, 'ghost-id')).rejects.toThrow('not found');
  });
});

// ─── markItemFrozen ──────────────────────────────────────────────────────────

describe('ItemsService.markItemFrozen', () => {
  test('enqueues markItemFrozen op', async () => {
    const service = await getService();
    const queue = await getQueue();
    const spy = jest.spyOn(queue, 'enqueue');

    await service.markItemFrozen(mockDb as any, 'local-item-abc');

    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ type: 'markItemFrozen' }));
  });
});

// ─── markItemPartial ─────────────────────────────────────────────────────────

describe('ItemsService.markItemPartial', () => {
  test('enqueues markItemPartial with quantity payload', async () => {
    const service = await getService();
    const queue = await getQueue();
    const spy = jest.spyOn(queue, 'enqueue');

    await service.markItemPartial(mockDb as any, 'local-item-abc', {
      quantityText: 'Half',
      quantityValue: 0.5,
      quantityUnit: 'cups',
    });

    expect(spy).toHaveBeenCalledWith(expect.objectContaining({
      type: 'markItemPartial',
      payload: expect.objectContaining({
        quantityText: 'Half',
        quantityValue: 0.5,
        quantityUnit: 'cups',
      }),
    }));
  });

  test('null quantityValue and quantityUnit when not provided', async () => {
    const service = await getService();
    const queue = await getQueue();
    const spy = jest.spyOn(queue, 'enqueue');

    await service.markItemPartial(mockDb as any, 'local-item-abc', {
      quantityText: 'A little',
    });

    const payload = spy.mock.calls[0][0].payload as Record<string, unknown>;
    expect(payload.quantityValue).toBeNull();
    expect(payload.quantityUnit).toBeNull();
  });
});

// ─── snoozeItem ──────────────────────────────────────────────────────────────

describe('ItemsService.snoozeItem', () => {
  test('enqueues updateItem op with extended expiryAt as ISO string', async () => {
    jest.useFakeTimers();
    const NOW = new Date('2024-01-15T12:00:00.000Z').getTime();
    jest.setSystemTime(NOW);

    const itemWithKnownExpiry = { ...fakeItem, expiryAt: NOW + 3 * 86400000 };
    mockFind.mockResolvedValueOnce(itemWithKnownExpiry);
    itemWithKnownExpiry.update = jest.fn().mockImplementation(async (fn: (r: any) => void) => {
      fn(itemWithKnownExpiry);
      return itemWithKnownExpiry;
    });

    const service = await getService();
    const queue = await getQueue();
    const spy = jest.spyOn(queue, 'enqueue');

    await service.snoozeItem(mockDb as any, 'local-item-abc', 2);

    const enqueued = spy.mock.calls[0][0];
    expect(enqueued.type).toBe('updateItem');
    const expectedExpiry = new Date(itemWithKnownExpiry.expiryAt + 2 * 86400000).toISOString();
    expect(enqueued.payload).toMatchObject({ expiryAt: expectedExpiry });

    jest.useRealTimers();
  });

  test('throws if item not found', async () => {
    mockFind.mockResolvedValueOnce(null);
    const service = await getService();
    await expect(service.snoozeItem(mockDb as any, 'ghost-id', 3)).rejects.toThrow('not found');
  });
});

// ─── deleteItem ──────────────────────────────────────────────────────────────

describe('ItemsService.deleteItem', () => {
  test('enqueues deleteItem op', async () => {
    const service = await getService();
    const queue = await getQueue();
    const spy = jest.spyOn(queue, 'enqueue');

    await service.deleteItem(mockDb as any, 'local-item-abc');

    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ type: 'deleteItem' }));
  });

  test('throws if item not found', async () => {
    mockFind.mockResolvedValueOnce(null);
    const service = await getService();
    await expect(service.deleteItem(mockDb as any, 'ghost-id')).rejects.toThrow('not found');
  });
});

// ─── lookupBarcode ───────────────────────────────────────────────────────────

describe('ItemsService.lookupBarcode', () => {
  const mockFetchGlobal = jest.spyOn(global, 'fetch' as any);

  test('returns parsed product on success', async () => {
    mockFetchGlobal.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        status: 1,
        product: {
          product_name: 'Organic Milk',
          brands: 'Happy Farms',
          serving_size: '240ml',
          image_front_small_url: 'https://example.com/img.jpg',
        },
      }),
    } as any);

    const service = await getService();
    const result = await service.lookupBarcode('012345678905');

    expect(result).toEqual({
      product: 'Organic Milk',
      brand: 'Happy Farms',
      servingSize: '240ml',
      imageUrl: 'https://example.com/img.jpg',
    });
  });

  test('returns null when API returns status !== 1', async () => {
    mockFetchGlobal.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: 0 }),
    } as any);

    const service = await getService();
    const result = await service.lookupBarcode('000000000000');
    expect(result).toBeNull();
  });

  test('returns null when HTTP response is not ok', async () => {
    mockFetchGlobal.mockResolvedValueOnce({ ok: false } as any);
    const service = await getService();
    const result = await service.lookupBarcode('000000000000');
    expect(result).toBeNull();
  });

  test('returns null on network error', async () => {
    mockFetchGlobal.mockRejectedValueOnce(new Error('Network request failed'));
    const service = await getService();
    const result = await service.lookupBarcode('000000000000');
    expect(result).toBeNull();
  });
});
