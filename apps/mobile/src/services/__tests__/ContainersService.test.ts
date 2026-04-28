import { __resetAll } from '../../__tests__/__mocks__/mmkv';

// ─── WatermelonDB mock ────────────────────────────────────────────────────────

const fakeContainer = {
  id: 'local-ctn-abc',
  cloudId: 'cloud-ctn-abc',
  householdId: 'hh-001',
  qrToken: 'wfl-token-xyz',
  nickname: 'Fridge Top Shelf',
  archivedAt: undefined as number | undefined,
  update: jest.fn().mockImplementation(async (fn: (r: any) => void) => {
    fn(fakeContainer);
    return fakeContainer;
  }),
};

const mockFind = jest.fn().mockResolvedValue(fakeContainer);
const mockFetch = jest.fn().mockResolvedValue([fakeContainer]);
const mockCreate = jest.fn().mockImplementation((fn: (r: any) => void) => {
  const r: any = {
    id: 'local-new-ctn',
    cloudId: 'cloud-new-ctn',
    householdId: 'hh-001',
    qrToken: 'wfl-token-new',
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
  mockFind.mockResolvedValue(fakeContainer);
  mockFetch.mockResolvedValue([fakeContainer]);
  fakeContainer.update.mockImplementation(async (fn: (r: any) => void) => {
    fn(fakeContainer);
    return fakeContainer;
  });
});

async function getService() {
  return (await import('../ContainersService')).containersService;
}

async function getQueue() {
  return (await import('../../db/queue')).writeQueue;
}

// ─── resolveQrToken ──────────────────────────────────────────────────────────

describe('ContainersService.resolveQrToken', () => {
  test('returns mine with containerId when token found locally', async () => {
    const service = await getService();
    const result = await service.resolveQrToken(mockDb as any, 'wfl-token-xyz');
    expect(result).toEqual({ status: 'mine', containerId: fakeContainer.id });
  });

  test('returns unclaimed when token not in local DB', async () => {
    mockFetch.mockResolvedValueOnce([]);
    const service = await getService();
    const result = await service.resolveQrToken(mockDb as any, 'unknown-token');
    expect(result).toEqual({ status: 'unclaimed' });
  });
});

// ─── claimContainer ──────────────────────────────────────────────────────────

describe('ContainersService.claimContainer', () => {
  test('enqueues claimContainer op with qrToken and householdId', async () => {
    const service = await getService();
    const queue = await getQueue();
    const spy = jest.spyOn(queue, 'enqueue');

    await service.claimContainer(mockDb as any, {
      householdId: 'hh-001',
      qrToken: 'wfl-token-new',
      nickname: 'Pantry Shelf',
    });

    expect(spy).toHaveBeenCalledWith(expect.objectContaining({
      type: 'claimContainer',
      householdId: 'hh-001',
      payload: expect.objectContaining({
        qrToken: 'wfl-token-new',
        householdId: 'hh-001',
        nickname: 'Pantry Shelf',
      }),
    }));
  });

  test('null nickname in payload when omitted', async () => {
    const service = await getService();
    const queue = await getQueue();
    const spy = jest.spyOn(queue, 'enqueue');

    await service.claimContainer(mockDb as any, {
      householdId: 'hh-001',
      qrToken: 'wfl-token-no-name',
    });

    const payload = spy.mock.calls[0][0].payload as Record<string, unknown>;
    expect(payload.nickname).toBeNull();
  });

  test('returns the created container record', async () => {
    const service = await getService();
    const result = await service.claimContainer(mockDb as any, {
      householdId: 'hh-001',
      qrToken: 'wfl-token-new',
    });
    expect(result).toBeDefined();
    expect(result.qrToken).toBe('wfl-token-new');
  });
});

// ─── updateContainer ─────────────────────────────────────────────────────────

describe('ContainersService.updateContainer', () => {
  test('enqueues updateContainer op with nickname', async () => {
    const service = await getService();
    const queue = await getQueue();
    const spy = jest.spyOn(queue, 'enqueue');

    await service.updateContainer(mockDb as any, fakeContainer.id, { nickname: 'New Name' });

    expect(spy).toHaveBeenCalledWith(expect.objectContaining({
      type: 'updateContainer',
      payload: expect.objectContaining({ nickname: 'New Name' }),
    }));
  });

  test('payload omits undefined fields', async () => {
    const service = await getService();
    const queue = await getQueue();
    const spy = jest.spyOn(queue, 'enqueue');

    await service.updateContainer(mockDb as any, fakeContainer.id, { nickname: 'X' });

    const payload = spy.mock.calls[0][0].payload as Record<string, unknown>;
    expect(payload).not.toHaveProperty('imageUrl');
  });

  test('throws if container not found', async () => {
    mockFind.mockResolvedValueOnce(null);
    const service = await getService();
    await expect(
      service.updateContainer(mockDb as any, 'ghost-id', { nickname: 'X' }),
    ).rejects.toThrow('not found');
  });
});

// ─── archiveContainer ────────────────────────────────────────────────────────

describe('ContainersService.archiveContainer', () => {
  test('enqueues archiveContainer op', async () => {
    const service = await getService();
    const queue = await getQueue();
    const spy = jest.spyOn(queue, 'enqueue');

    await service.archiveContainer(mockDb as any, fakeContainer.id);

    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ type: 'archiveContainer' }));
  });

  test('throws if container not found', async () => {
    mockFind.mockResolvedValueOnce(null);
    const service = await getService();
    await expect(service.archiveContainer(mockDb as any, 'ghost-id')).rejects.toThrow('not found');
  });
});

// ─── unarchiveContainer ──────────────────────────────────────────────────────

describe('ContainersService.unarchiveContainer', () => {
  test('enqueues updateContainer with archivedAt: null', async () => {
    const service = await getService();
    const queue = await getQueue();
    const spy = jest.spyOn(queue, 'enqueue');

    await service.unarchiveContainer(mockDb as any, fakeContainer.id);

    expect(spy).toHaveBeenCalledWith(expect.objectContaining({
      type: 'updateContainer',
      payload: expect.objectContaining({ archivedAt: null }),
    }));
  });

  test('throws if container not found', async () => {
    mockFind.mockResolvedValueOnce(null);
    const service = await getService();
    await expect(service.unarchiveContainer(mockDb as any, 'ghost-id')).rejects.toThrow('not found');
  });
});

// ─── getContainerByQrToken ───────────────────────────────────────────────────

describe('ContainersService.getContainerByQrToken', () => {
  test('returns container when found', async () => {
    const service = await getService();
    const result = await service.getContainerByQrToken(mockDb as any, 'wfl-token-xyz');
    expect(result).toBe(fakeContainer);
  });

  test('returns null when not found', async () => {
    mockFetch.mockResolvedValueOnce([]);
    const service = await getService();
    const result = await service.getContainerByQrToken(mockDb as any, 'missing-token');
    expect(result).toBeNull();
  });
});
