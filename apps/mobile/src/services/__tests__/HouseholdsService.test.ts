import { __resetAll } from '../../__tests__/__mocks__/mmkv';

// Lightweight WatermelonDB mock
const createdRecords: Record<string, unknown>[] = [];
const mockHouseholdCreate = jest.fn().mockImplementation((fn: (r: any) => void) => {
  const r: Record<string, unknown> = { id: `local-wdb-${Date.now()}` };
  fn(r);
  createdRecords.push({ ...r, table: 'households' });
  return r;
});
const mockMemberCreate = jest.fn().mockImplementation((fn: (r: any) => void) => {
  const r: Record<string, unknown> = { id: `local-member-${Date.now()}` };
  fn(r);
  createdRecords.push({ ...r, table: 'household_members' });
  return r;
});
const mockWrite = jest.fn().mockImplementation((fn: () => unknown) => fn());
const mockGet = jest.fn().mockImplementation((table: string) => ({
  create: table === 'households' ? mockHouseholdCreate : mockMemberCreate,
}));

const mockDb = { write: mockWrite, get: mockGet };

beforeEach(() => {
  __resetAll();
  jest.resetModules();
  jest.clearAllMocks();
  createdRecords.length = 0;
});

async function getService() {
  return (await import('../HouseholdsService')).householdsService;
}

describe('HouseholdsService.createHousehold', () => {
  test('creates a household record with correct fields', async () => {
    const service = await getService();

    await service.createHousehold(mockDb as any, { name: 'Home', ownerId: 'user-001' });

    expect(mockHouseholdCreate).toHaveBeenCalledTimes(1);
    const record = createdRecords.find((r) => r.table === 'households') as any;
    expect(record.name).toBe('Home');
    expect(record.ownerId).toBe('user-001');
    expect(record.memberCount).toBe(1);
    expect(record.version).toBe(1);
  });

  test('also creates an owner member record', async () => {
    const service = await getService();

    await service.createHousehold(mockDb as any, { name: 'Home', ownerId: 'user-001' });

    expect(mockMemberCreate).toHaveBeenCalledTimes(1);
    const member = createdRecords.find((r) => r.table === 'household_members') as any;
    expect(member.userId).toBe('user-001');
    expect(member.role).toBe('owner');
  });

  test('enqueues createHousehold op', async () => {
    const service = await getService();
    const { writeQueue } = await import('../../db/queue');
    const enqueueSpy = jest.spyOn(writeQueue, 'enqueue');

    await service.createHousehold(mockDb as any, { name: 'Office', ownerId: 'user-002' });

    expect(enqueueSpy).toHaveBeenCalledWith(expect.objectContaining({
      type: 'createHousehold',
      payload: expect.objectContaining({ name: 'Office', ownerId: 'user-002' }),
    }));
  });
});

describe('HouseholdsService.inviteMember', () => {
  test('enqueues inviteMember op with email', async () => {
    const service = await getService();
    const { writeQueue } = await import('../../db/queue');
    const enqueueSpy = jest.spyOn(writeQueue, 'enqueue');

    await service.inviteMember({
      householdLocalId: 'local-hh-1',
      householdCloudId: 'cloud-hh-abc',
      email: 'friend@example.com',
    });

    expect(enqueueSpy).toHaveBeenCalledWith(expect.objectContaining({
      type: 'inviteMember',
      cloudId: 'cloud-hh-abc',
      householdId: 'cloud-hh-abc',
      payload: { email: 'friend@example.com' },
    }));
  });

  test('does not touch the database', async () => {
    const service = await getService();

    await service.inviteMember({
      householdLocalId: 'local-hh-1',
      householdCloudId: 'cloud-hh-abc',
      email: 'someone@example.com',
    });

    expect(mockDb.write).not.toHaveBeenCalled();
    expect(mockDb.get).not.toHaveBeenCalled();
  });
});

describe('HouseholdsService.renameHousehold', () => {
  test('enqueues renameHousehold op', async () => {
    const service = await getService();
    const { writeQueue } = await import('../../db/queue');
    const enqueueSpy = jest.spyOn(writeQueue, 'enqueue');

    const fakeHousehold = {
      id: 'local-hh-1',
      cloudId: 'cloud-hh-abc',
      name: 'Old Name',
      version: 1,
      lastChangedAt: 0,
      update: jest.fn().mockImplementation((fn: (r: any) => void) => {
        fn({ name: '', lastChangedAt: 0, version: 1 });
      }),
    };

    await service.renameHousehold(mockDb as any, fakeHousehold as any, 'New Name');

    expect(enqueueSpy).toHaveBeenCalledWith(expect.objectContaining({
      type: 'renameHousehold',
      payload: { name: 'New Name' },
    }));
  });
});

describe('HouseholdsService analytics', () => {
  test('createHousehold captures HOUSEHOLD_CREATED posthog event', async () => {
    const { mockCapture } = await import('posthog-react-native') as any;
    const service = await getService();

    await service.createHousehold(mockDb as any, { name: 'Analytics Test', ownerId: 'user-001' });

    expect(mockCapture).toHaveBeenCalledWith('settings_household_created');
  });

  test('inviteMember captures MEMBER_INVITED posthog event', async () => {
    const { mockCapture } = await import('posthog-react-native') as any;
    const service = await getService();

    await service.inviteMember({
      householdLocalId: 'local-hh-1',
      householdCloudId: 'cloud-hh-abc',
      email: 'test@example.com',
    });

    expect(mockCapture).toHaveBeenCalledWith('settings_member_invited');
  });
});
