import type { CustomerInfo } from '../../__tests__/__mocks__/react-native-purchases';

// moduleNameMapper in jest.config.js already routes this import to the mock file.
jest.mock('react-native-purchases');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getService() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return (require('../SubscriptionService') as typeof import('../SubscriptionService'))
    .subscriptionService;
}

function makeMockInfo(overrides: Partial<CustomerInfo> = {}): CustomerInfo {
  return {
    entitlements: { active: {} },
    managementURL: null,
    ...overrides,
  };
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.resetModules();
  jest.clearAllMocks();
});

// ─── isPremium ────────────────────────────────────────────────────────────────

describe('SubscriptionService.isPremium', () => {
  test('returns false when entitlements.active is empty', () => {
    const service = getService();
    const info = makeMockInfo();
    expect(service.isPremium(info)).toBe(false);
  });

  test('returns true when premium entitlement is present', () => {
    const service = getService();
    const info = makeMockInfo({
      entitlements: {
        active: {
          premium: { identifier: 'premium', isActive: true, expirationDate: null },
        },
      },
    });
    expect(service.isPremium(info)).toBe(true);
  });

  test('returns false when a different entitlement is active but not premium', () => {
    const service = getService();
    const info = makeMockInfo({
      entitlements: {
        active: {
          pro: { identifier: 'pro', isActive: true, expirationDate: null },
        },
      },
    });
    expect(service.isPremium(info)).toBe(false);
  });
});

// ─── renewalDate ──────────────────────────────────────────────────────────────

describe('SubscriptionService.renewalDate', () => {
  test('returns null when no premium entitlement', () => {
    const service = getService();
    const info = makeMockInfo();
    expect(service.renewalDate(info)).toBeNull();
  });

  test('returns null when premium entitlement has no expirationDate', () => {
    const service = getService();
    const info = makeMockInfo({
      entitlements: {
        active: { premium: { identifier: 'premium', expirationDate: null } },
      },
    });
    expect(service.renewalDate(info)).toBeNull();
  });

  test('returns a Date when premium entitlement has an expirationDate string', () => {
    const service = getService();
    const isoDate = '2027-01-15T00:00:00.000Z';
    const info = makeMockInfo({
      entitlements: {
        active: { premium: { identifier: 'premium', expirationDate: isoDate } },
      },
    });
    const result = service.renewalDate(info);
    expect(result).toBeInstanceOf(Date);
    expect(result!.toISOString()).toBe(isoDate);
  });
});

// ─── managementUrl ────────────────────────────────────────────────────────────

describe('SubscriptionService.managementUrl', () => {
  test('returns null when managementURL is null', () => {
    const service = getService();
    const info = makeMockInfo({ managementURL: null });
    expect(service.managementUrl(info)).toBeNull();
  });

  test('returns null when managementURL is undefined', () => {
    const service = getService();
    const info = makeMockInfo({ managementURL: undefined });
    expect(service.managementUrl(info)).toBeNull();
  });

  test('returns the URL string when managementURL is set', () => {
    const service = getService();
    const url = 'https://apps.apple.com/account/subscriptions';
    const info = makeMockInfo({ managementURL: url });
    expect(service.managementUrl(info)).toBe(url);
  });
});

// ─── getOffering ──────────────────────────────────────────────────────────────

describe('SubscriptionService.getOffering', () => {
  test('returns null when getOfferings resolves with current: null', async () => {
    const Purchases = require('react-native-purchases').default;
    Purchases.getOfferings.mockResolvedValueOnce({ current: null });

    const service = getService();
    const result = await service.getOffering();
    expect(result).toBeNull();
  });
});
