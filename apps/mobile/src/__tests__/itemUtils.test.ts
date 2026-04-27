import {
  getItemStatus,
  formatTimeLeft,
  formatTimeLeftI18n,
  getBucket,
  groupItemsIntoSections,
} from '../../lib/itemUtils';
import type { Item } from '@/db/models/Item';
import type { TFunction } from 'i18next';

const NOW = new Date('2024-01-15T12:00:00.000Z').getTime();
const MS_1H = 60 * 60 * 1000;
const MS_1D = 24 * MS_1H;

function item(overrides: Record<string, unknown> = {}): Item {
  return {
    id: 'item-1',
    foodName: 'Apple',
    status: 'active',
    expiryAt: NOW + 7 * MS_1D,
    ...overrides,
  } as unknown as Item;
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(NOW);
});

afterEach(() => {
  jest.useRealTimers();
});

// ─── getItemStatus ─────────────────────────────────────────────────────────────

describe('getItemStatus', () => {
  test('frozen item returns frozen regardless of expiry', () => {
    expect(getItemStatus(item({ status: 'frozen', expiryAt: NOW - MS_1D }))).toBe('frozen');
  });

  test('expired when expiryAt is in the past', () => {
    expect(getItemStatus(item({ expiryAt: NOW - 1 }))).toBe('expired');
  });

  test('expired when expiryAt equals now', () => {
    expect(getItemStatus(item({ expiryAt: NOW }))).toBe('expired');
  });

  test('urgent when expiring within 24h', () => {
    expect(getItemStatus(item({ expiryAt: NOW + MS_1D - 1 }))).toBe('urgent');
  });

  test('soon when expiring within 3 days', () => {
    expect(getItemStatus(item({ expiryAt: NOW + 2 * MS_1D }))).toBe('soon');
  });

  test('soon boundary: exactly 3 days', () => {
    expect(getItemStatus(item({ expiryAt: NOW + 3 * MS_1D }))).toBe('soon');
  });

  test('fresh when expiring after 3 days', () => {
    expect(getItemStatus(item({ expiryAt: NOW + 3 * MS_1D + 1 }))).toBe('fresh');
  });

  test('fresh when expiring in 7 days', () => {
    expect(getItemStatus(item({ expiryAt: NOW + 7 * MS_1D }))).toBe('fresh');
  });
});

// ─── getBucket ────────────────────────────────────────────────────────────────

describe('getBucket', () => {
  test('mirrors getItemStatus for non-frozen items', () => {
    expect(getBucket(item({ expiryAt: NOW - 1 }))).toBe('expired');
    expect(getBucket(item({ expiryAt: NOW + 12 * MS_1H }))).toBe('urgent');
    expect(getBucket(item({ expiryAt: NOW + 2 * MS_1D }))).toBe('soon');
    expect(getBucket(item({ expiryAt: NOW + 7 * MS_1D }))).toBe('fresh');
  });

  test('frozen status takes priority over expiry time', () => {
    expect(getBucket(item({ status: 'frozen', expiryAt: NOW + 7 * MS_1D }))).toBe('frozen');
  });
});

// ─── formatTimeLeft ───────────────────────────────────────────────────────────

describe('formatTimeLeft', () => {
  test('expired same day returns "Expired today"', () => {
    expect(formatTimeLeft(NOW - 1)).toBe('Expired today');
  });

  test('expired same day (large ms past) returns "Expired today" if under 1 day', () => {
    expect(formatTimeLeft(NOW - MS_1H)).toBe('Expired today');
  });

  test('expired yesterday returns "1d ago"', () => {
    expect(formatTimeLeft(NOW - MS_1D)).toBe('1d ago');
  });

  test('expired 5 days ago returns "5d ago"', () => {
    expect(formatTimeLeft(NOW - 5 * MS_1D)).toBe('5d ago');
  });

  test('less than 1h remaining returns "Less than 1h"', () => {
    expect(formatTimeLeft(NOW + 30 * 60 * 1000)).toBe('Less than 1h');
  });

  test('exactly 1h remaining returns "Less than 1h"', () => {
    expect(formatTimeLeft(NOW + MS_1H)).toBe('Less than 1h');
  });

  test('5h remaining returns "5h left"', () => {
    expect(formatTimeLeft(NOW + 5 * MS_1H)).toBe('5h left');
  });

  test('23h remaining returns "23h left"', () => {
    expect(formatTimeLeft(NOW + 23 * MS_1H)).toBe('23h left');
  });

  test('exactly 1 day remaining returns "Tomorrow"', () => {
    expect(formatTimeLeft(NOW + MS_1D)).toBe('Tomorrow');
  });

  test('2 days remaining returns "2d left"', () => {
    expect(formatTimeLeft(NOW + 2 * MS_1D)).toBe('2d left');
  });

  test('7 days remaining returns "7d left"', () => {
    expect(formatTimeLeft(NOW + 7 * MS_1D)).toBe('7d left');
  });
});

// ─── formatTimeLeftI18n ───────────────────────────────────────────────────────

describe('formatTimeLeftI18n', () => {
  const t = jest.fn((key: string, opts?: Record<string, unknown>) =>
    opts ? `${key}:${JSON.stringify(opts)}` : key,
  ) as unknown as TFunction;

  beforeEach(() => (t as jest.Mock).mockClear());

  test('expired today calls time.expiredToday', () => {
    formatTimeLeftI18n(NOW - 1, t);
    expect(t).toHaveBeenCalledWith('time.expiredToday');
  });

  test('expired days ago calls time.expiredDaysAgo with count', () => {
    formatTimeLeftI18n(NOW - 3 * MS_1D, t);
    expect(t).toHaveBeenCalledWith('time.expiredDaysAgo', { count: 3 });
  });

  test('under 1h calls time.lessThan1Hour', () => {
    formatTimeLeftI18n(NOW + 30 * 60 * 1000, t);
    expect(t).toHaveBeenCalledWith('time.lessThan1Hour');
  });

  test('hours left calls time.hoursLeft with count', () => {
    formatTimeLeftI18n(NOW + 5 * MS_1H, t);
    expect(t).toHaveBeenCalledWith('time.hoursLeft', { count: 5 });
  });

  test('exactly 1 day calls time.tomorrow', () => {
    formatTimeLeftI18n(NOW + MS_1D, t);
    expect(t).toHaveBeenCalledWith('time.tomorrow');
  });

  test('multiple days calls time.daysLeft with count', () => {
    formatTimeLeftI18n(NOW + 7 * MS_1D, t);
    expect(t).toHaveBeenCalledWith('time.daysLeft', { count: 7 });
  });
});

// ─── groupItemsIntoSections ───────────────────────────────────────────────────

describe('groupItemsIntoSections', () => {
  test('empty input returns empty array', () => {
    expect(groupItemsIntoSections([])).toEqual([]);
  });

  test('returns sections only for non-empty buckets', () => {
    const items = [
      item({ id: 'a', expiryAt: NOW - 1 }),  // expired
      item({ id: 'b', expiryAt: NOW + 7 * MS_1D }), // fresh
    ] as unknown as Item[];
    const sections = groupItemsIntoSections(items);
    expect(sections).toHaveLength(2);
    const keys = sections.map((s) => s.key);
    expect(keys).toContain('expired');
    expect(keys).toContain('fresh');
    expect(keys).not.toContain('urgent');
    expect(keys).not.toContain('soon');
    expect(keys).not.toContain('frozen');
  });

  test('sections are ordered: expired, urgent, soon, fresh, frozen', () => {
    const items = [
      item({ id: 'frozen', status: 'frozen', expiryAt: NOW + 30 * MS_1D }),
      item({ id: 'fresh', expiryAt: NOW + 7 * MS_1D }),
      item({ id: 'soon', expiryAt: NOW + 2 * MS_1D }),
      item({ id: 'urgent', expiryAt: NOW + 12 * MS_1H }),
      item({ id: 'expired', expiryAt: NOW - MS_1D }),
    ] as unknown as Item[];
    const keys = groupItemsIntoSections(items).map((s) => s.key);
    expect(keys).toEqual(['expired', 'urgent', 'soon', 'fresh', 'frozen']);
  });

  test('items within a bucket appear in insertion order', () => {
    const items = [
      item({ id: 'a', expiryAt: NOW + 7 * MS_1D }),
      item({ id: 'b', expiryAt: NOW + 10 * MS_1D }),
    ] as unknown as Item[];
    const sections = groupItemsIntoSections(items);
    expect(sections).toHaveLength(1);
    expect(sections[0].items.map((i) => (i).id)).toEqual(['a', 'b']);
  });

  test('labelKey follows dashboard.section{Bucket} convention', () => {
    const items = [
      item({ id: 'e', expiryAt: NOW - 1 }),
      item({ id: 'u', expiryAt: NOW + 12 * MS_1H }),
      item({ id: 's', expiryAt: NOW + 2 * MS_1D }),
      item({ id: 'f', expiryAt: NOW + 7 * MS_1D }),
      item({ id: 'fr', status: 'frozen', expiryAt: NOW + 30 * MS_1D }),
    ] as unknown as Item[];
    const sections = groupItemsIntoSections(items);
    const labelMap = Object.fromEntries(sections.map((s) => [s.key, s.labelKey]));
    expect(labelMap.expired).toBe('dashboard.sectionExpired');
    expect(labelMap.urgent).toBe('dashboard.sectionUrgent');
    expect(labelMap.soon).toBe('dashboard.sectionSoon');
    expect(labelMap.fresh).toBe('dashboard.sectionFresh');
    expect(labelMap.frozen).toBe('dashboard.sectionFrozen');
  });

  test('single item ends up in the correct bucket', () => {
    const sections = groupItemsIntoSections([
      item({ expiryAt: NOW + 12 * MS_1H }) as unknown as Item,
    ]);
    expect(sections).toHaveLength(1);
    expect(sections[0].key).toBe('urgent');
  });
});
