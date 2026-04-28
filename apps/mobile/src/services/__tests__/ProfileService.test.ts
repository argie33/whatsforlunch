import { __resetAll } from '../../__tests__/__mocks__/mmkv';

// Mock authService — tests run outside IS_MOCK context
const mockSetMockUserName = jest.fn();
jest.mock('../../features/auth/authService', () => ({
  IS_MOCK: false,
  setMockUserName: mockSetMockUserName,
}));

// Lightweight WatermelonDB mock
const mockUpdate = jest.fn().mockImplementation((fn: (r: any) => void) => {
  const r: Record<string, unknown> = {
    version: 1,
    lastChangedAt: 0,
    displayName: '',
    timeZone: 'UTC',
    units: 'imperial',
  };
  fn(r);
  return r;
});
const mockCreate = jest.fn().mockImplementation((fn: (r: any) => void) => {
  const r: Record<string, unknown> = {};
  fn(r);
  return r;
});
const mockFetch = jest.fn().mockResolvedValue([]);
const mockWrite = jest.fn().mockImplementation((fn: () => unknown) => fn());
const mockGet = jest.fn().mockReturnValue({
  query: jest.fn().mockReturnValue({ fetch: mockFetch }),
  create: mockCreate,
});

const mockDb = { write: mockWrite, get: mockGet };

beforeEach(() => {
  __resetAll();
  jest.resetModules();
  jest.clearAllMocks();
  mockFetch.mockResolvedValue([]);
});

function getService() {
  return (require('../ProfileService') as typeof import('../ProfileService')).profileService;
}

describe('ProfileService.updateProfile', () => {
  test('enqueues updateProfile op with displayName payload', async () => {
    const service = getService();
    const { writeQueue } = require('../../db/queue') as typeof import('../../db/queue');
    const enqueueSpy = jest.spyOn(writeQueue, 'enqueue');

    await service.updateProfile(mockDb as any, 'user-001', { displayName: 'Alice' });

    expect(enqueueSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'updateProfile',
        localId: 'user-001',
        cloudId: 'user-001',
        payload: expect.objectContaining({ displayName: 'Alice' }),
      }),
    );
  });

  test('payload omits undefined fields', async () => {
    const service = getService();
    const { writeQueue } = require('../../db/queue') as typeof import('../../db/queue');
    const enqueueSpy = jest.spyOn(writeQueue, 'enqueue');

    await service.updateProfile(mockDb as any, 'user-001', { displayName: 'Bob' });

    const payload = enqueueSpy.mock.calls[0][0].payload as Record<string, unknown>;
    expect(payload).not.toHaveProperty('timeZone');
    expect(payload).not.toHaveProperty('units');
  });

  test('creates profile record when none exists', async () => {
    mockFetch.mockResolvedValueOnce([]); // no existing profile
    const service = getService();

    await service.updateProfile(mockDb as any, 'user-001', {
      displayName: 'Carol',
      units: 'metric',
    });

    expect(mockCreate).toHaveBeenCalled();
  });

  test('updates existing profile record when found', async () => {
    const fakeProfile = {
      displayName: 'Old Name',
      version: 2,
      lastChangedAt: 100,
      update: mockUpdate,
    };
    mockFetch.mockResolvedValueOnce([fakeProfile]);
    const service = getService();

    await service.updateProfile(mockDb as any, 'user-001', { displayName: 'New Name' });

    expect(mockUpdate).toHaveBeenCalled();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  test('does NOT call setMockUserName when IS_MOCK is false', async () => {
    const service = getService();
    await service.updateProfile(mockDb as any, 'user-001', { displayName: 'Dave' });
    expect(mockSetMockUserName).not.toHaveBeenCalled();
  });

  test('captures PROFILE_UPDATED posthog event', async () => {
    const { mockCapture } = require('posthog-react-native') as any;
    const service = getService();
    await service.updateProfile(mockDb as any, 'user-001', { displayName: 'Frank' });
    expect(mockCapture).toHaveBeenCalledWith('settings_profile_updated', expect.any(Object));
  });
});

describe('ProfileService.updateProfile — IS_MOCK mode', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.doMock('../../features/auth/authService', () => ({
      IS_MOCK: true,
      setMockUserName: mockSetMockUserName,
    }));
  });

  test('calls setMockUserName when IS_MOCK is true', async () => {
    const service = getService();
    await service.updateProfile(mockDb as any, 'user-001', { displayName: 'Eve' });
    expect(mockSetMockUserName).toHaveBeenCalledWith('Eve');
  });
});
