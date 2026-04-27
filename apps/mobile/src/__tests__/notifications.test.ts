import { __resetAll } from './__mocks__/mmkv';

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  AndroidImportance: { DEFAULT: 3 },
  getPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  setNotificationChannelAsync: jest.fn().mockResolvedValue(undefined),
  scheduleNotificationAsync: jest.fn().mockResolvedValue('notif-id-abc'),
  cancelScheduledNotificationAsync: jest.fn().mockResolvedValue(undefined),
  cancelAllScheduledNotificationsAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/i18n', () => ({
  t: (key: string) => key,
}));

const NOW = new Date('2024-01-15T12:00:00.000Z').getTime();
const MS_1H = 60 * 60 * 1000;
const MS_1D = 24 * MS_1H;
const MS_2H = 2 * MS_1H;

type Notifs = typeof import('expo-notifications');

function getNotifications() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('../../lib/notifications') as typeof import('../../lib/notifications');
}

function getExpoMocks(): jest.Mocked<Notifs> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('expo-notifications') as jest.Mocked<Notifs>;
}

function makeItem(overrides: { id?: string; status?: string; expiryAt?: number; foodName?: string } = {}) {
  return {
    id: 'item-1',
    foodName: 'Milk',
    status: 'active',
    expiryAt: NOW + 7 * MS_1D,
    householdId: 'hh-1',
    cloudId: null,
    ...overrides,
  } as any;
}

beforeEach(() => {
  __resetAll();
  jest.resetModules();
  jest.useFakeTimers();
  jest.setSystemTime(NOW);
});

afterEach(() => {
  jest.useRealTimers();
});

// ─── scheduleExpiryNotification ───────────────────────────────────────────────

describe('scheduleExpiryNotification', () => {
  test('does not schedule if item is already expired', async () => {
    const { scheduleExpiryNotification } = getNotifications();
    const expo = getExpoMocks();

    await scheduleExpiryNotification(makeItem({ expiryAt: NOW - 1 }));

    expect(expo.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  test('does not schedule if expiring in less than 2h', async () => {
    const { scheduleExpiryNotification } = getNotifications();
    const expo = getExpoMocks();

    await scheduleExpiryNotification(makeItem({ expiryAt: NOW + MS_2H - 1000 }));

    expect(expo.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  test('does not schedule if expiring at exactly 2h (boundary)', async () => {
    const { scheduleExpiryNotification } = getNotifications();
    const expo = getExpoMocks();

    await scheduleExpiryNotification(makeItem({ expiryAt: NOW + MS_2H }));

    expect(expo.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  test('schedules with trigger = msLeft - 2h when expiring within 24h', async () => {
    const { scheduleExpiryNotification } = getNotifications();
    const expo = getExpoMocks();

    const expiryAt = NOW + 5 * MS_1H; // 5h from now, inside 24h window
    await scheduleExpiryNotification(makeItem({ expiryAt }));

    expect(expo.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
    const call = (expo.scheduleNotificationAsync as jest.Mock).mock.calls[0][0];
    const expectedSeconds = Math.floor((5 * MS_1H - MS_2H) / 1000); // 3h in seconds
    expect(call.trigger.seconds).toBe(expectedSeconds);
    expect(call.trigger.repeats).toBe(false);
  });

  test('schedules with trigger = msLeft - 1d when expiring after 24h', async () => {
    const { scheduleExpiryNotification } = getNotifications();
    const expo = getExpoMocks();

    const expiryAt = NOW + 3 * MS_1D;
    await scheduleExpiryNotification(makeItem({ expiryAt }));

    expect(expo.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
    const call = (expo.scheduleNotificationAsync as jest.Mock).mock.calls[0][0];
    const expectedSeconds = Math.floor((3 * MS_1D - MS_1D) / 1000); // 2 days in seconds
    expect(call.trigger.seconds).toBe(expectedSeconds);
  });

  test('stores the notification id in MMKV', async () => {
    const { scheduleExpiryNotification, cancelExpiryNotification } = getNotifications();
    const expo = getExpoMocks();
    (expo.scheduleNotificationAsync as jest.Mock).mockResolvedValueOnce('stored-notif-id');

    const it = makeItem({ id: 'item-99', expiryAt: NOW + 5 * MS_1H });
    await scheduleExpiryNotification(it);

    // Cancel should call cancelScheduledNotificationAsync with the stored id
    await cancelExpiryNotification('item-99');
    expect(expo.cancelScheduledNotificationAsync).toHaveBeenCalledWith('stored-notif-id');
  });

  test('uses urgent notification keys when expiring within 24h', async () => {
    const { scheduleExpiryNotification } = getNotifications();
    const expo = getExpoMocks();

    await scheduleExpiryNotification(makeItem({ expiryAt: NOW + 5 * MS_1H }));

    const call = (expo.scheduleNotificationAsync as jest.Mock).mock.calls[0][0];
    expect(call.content.title).toBe('notifications.localExpiry.urgentTitle');
    expect(call.content.body).toBe('notifications.localExpiry.urgentBody');
  });

  test('uses normal notification keys when expiring after 24h', async () => {
    const { scheduleExpiryNotification } = getNotifications();
    const expo = getExpoMocks();

    await scheduleExpiryNotification(makeItem({ expiryAt: NOW + 3 * MS_1D }));

    const call = (expo.scheduleNotificationAsync as jest.Mock).mock.calls[0][0];
    expect(call.content.title).toBe('notifications.localExpiry.title');
    expect(call.content.body).toBe('notifications.localExpiry.body');
  });
});

// ─── cancelExpiryNotification ─────────────────────────────────────────────────

describe('cancelExpiryNotification', () => {
  test('no-ops when no stored notification id', async () => {
    const { cancelExpiryNotification } = getNotifications();
    const expo = getExpoMocks();

    await cancelExpiryNotification('nonexistent-item');

    expect(expo.cancelScheduledNotificationAsync).not.toHaveBeenCalled();
  });

  test('cancels and clears stored id', async () => {
    const { scheduleExpiryNotification, cancelExpiryNotification } = getNotifications();
    const expo = getExpoMocks();
    (expo.scheduleNotificationAsync as jest.Mock).mockResolvedValueOnce('my-notif-id');

    await scheduleExpiryNotification(makeItem({ id: 'item-cancel', expiryAt: NOW + 5 * MS_1H }));
    await cancelExpiryNotification('item-cancel');

    expect(expo.cancelScheduledNotificationAsync).toHaveBeenCalledWith('my-notif-id');

    // A second cancel should not call cancelScheduledNotificationAsync again
    (expo.cancelScheduledNotificationAsync as jest.Mock).mockClear();
    await cancelExpiryNotification('item-cancel');
    expect(expo.cancelScheduledNotificationAsync).not.toHaveBeenCalled();
  });
});

// ─── rescheduleAllNotifications ───────────────────────────────────────────────

describe('rescheduleAllNotifications', () => {
  test('cancels all scheduled notifications first', async () => {
    const { rescheduleAllNotifications } = getNotifications();
    const expo = getExpoMocks();

    await rescheduleAllNotifications([]);

    expect(expo.cancelAllScheduledNotificationsAsync).toHaveBeenCalledTimes(1);
  });

  test('only reschedules active and partial items', async () => {
    const { rescheduleAllNotifications } = getNotifications();
    const expo = getExpoMocks();

    const items = [
      makeItem({ id: 'active', status: 'active', expiryAt: NOW + 5 * MS_1H }),
      makeItem({ id: 'partial', status: 'partial', expiryAt: NOW + 3 * MS_1D }),
      makeItem({ id: 'eaten', status: 'eaten', expiryAt: NOW + 5 * MS_1H }),
      makeItem({ id: 'tossed', status: 'tossed', expiryAt: NOW + 5 * MS_1H }),
      makeItem({ id: 'frozen', status: 'frozen', expiryAt: NOW + 5 * MS_1H }),
    ];

    await rescheduleAllNotifications(items);

    // Only 2 scheduleNotificationAsync calls: active + partial
    expect(expo.scheduleNotificationAsync).toHaveBeenCalledTimes(2);
  });

  test('skips already-expired items even if status is active', async () => {
    const { rescheduleAllNotifications } = getNotifications();
    const expo = getExpoMocks();

    const items = [
      makeItem({ id: 'expired-active', status: 'active', expiryAt: NOW - MS_1D }),
      makeItem({ id: 'valid-active', status: 'active', expiryAt: NOW + 5 * MS_1H }),
    ];

    await rescheduleAllNotifications(items);

    // Expired item is skipped by scheduleExpiryNotification's own guard
    expect(expo.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
  });
});
