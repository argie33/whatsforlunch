import { __resetAll } from './__mocks__/mmkv';

beforeEach(() => {
  __resetAll();
  jest.resetModules();
});

async function getAnalytics() {
  return import('../lib/analytics');
}

async function getMockCapture() {
  const { mockCapture } = (await import('posthog-react-native')) as any;
  return mockCapture as jest.Mock;
}

// ─── track ────────────────────────────────────────────────────────────────────

describe('track', () => {
  test('calls posthog.capture with the event name', async () => {
    const { track, Events } = await getAnalytics();
    const mockCapture = await getMockCapture();

    track(Events.ITEM_MARK_EATEN, { days_before_expiry: 2 });

    expect(mockCapture).toHaveBeenCalledWith('item_mark_eaten', { days_before_expiry: 2 });
  });

  test('calls posthog.capture with no properties when omitted', async () => {
    const { track, Events } = await getAnalytics();
    const mockCapture = await getMockCapture();

    track(Events.SIGN_OUT);

    expect(mockCapture).toHaveBeenCalledWith('sign_out', undefined);
  });
});

// ─── trackItemMarkedEaten ─────────────────────────────────────────────────────

describe('trackItemMarkedEaten', () => {
  test('fires item_mark_eaten with positive days when not yet expired', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-15T12:00:00Z').getTime());

    const { trackItemMarkedEaten } = await getAnalytics();
    const mockCapture = await getMockCapture();

    const expiryAt = Date.now() + 3 * 86_400_000; // 3 days from now
    trackItemMarkedEaten(expiryAt);

    expect(mockCapture).toHaveBeenCalledWith('item_mark_eaten', { days_before_expiry: 3 });
    jest.useRealTimers();
  });

  test('reports 0 or negative days when already expired', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-15T12:00:00Z').getTime());

    const { trackItemMarkedEaten } = await getAnalytics();
    const mockCapture = await getMockCapture();

    const expiryAt = Date.now() - 2 * 86_400_000; // 2 days ago
    trackItemMarkedEaten(expiryAt);

    const call = (mockCapture as jest.Mock).mock.calls[0];
    expect(call[0]).toBe('item_mark_eaten');
    expect(call[1].days_before_expiry).toBeLessThanOrEqual(0);
    jest.useRealTimers();
  });
});

// ─── trackItemTossed ──────────────────────────────────────────────────────────

describe('trackItemTossed', () => {
  test('fires item_mark_tossed with days_before_expiry', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-15T12:00:00Z').getTime());

    const { trackItemTossed } = await getAnalytics();
    const mockCapture = await getMockCapture();

    trackItemTossed(Date.now() + 7 * 86_400_000);

    expect(mockCapture).toHaveBeenCalledWith('item_mark_tossed', { days_before_expiry: 7 });
    jest.useRealTimers();
  });
});

// ─── trackItemAdded ───────────────────────────────────────────────────────────

describe('trackItemAdded', () => {
  test('fires item_add_completed with method, food_type, and storage_location', async () => {
    const { trackItemAdded } = await getAnalytics();
    const mockCapture = await getMockCapture();

    trackItemAdded('barcode', 'milk', 'fridge');

    expect(mockCapture).toHaveBeenCalledWith('item_add_completed', {
      method: 'barcode',
      food_type: 'milk',
      storage_location: 'fridge',
    });
  });
});

// ─── trackSignIn ──────────────────────────────────────────────────────────────

describe('trackSignIn', () => {
  test('fires sign_in_completed with method', async () => {
    const { trackSignIn } = await getAnalytics();
    const mockCapture = await getMockCapture();

    trackSignIn('magic_link');

    expect(mockCapture).toHaveBeenCalledWith('sign_in_completed', { method: 'magic_link' });
  });
});

// ─── trackOnboardingSlide ─────────────────────────────────────────────────────

describe('trackOnboardingSlide', () => {
  test('fires onboarding_slide_viewed with slide number', async () => {
    const { trackOnboardingSlide } = await getAnalytics();
    const mockCapture = await getMockCapture();

    trackOnboardingSlide(2);

    expect(mockCapture).toHaveBeenCalledWith('onboarding_slide_viewed', { slide: 2 });
  });
});
