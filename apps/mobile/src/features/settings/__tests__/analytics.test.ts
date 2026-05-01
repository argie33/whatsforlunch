import {
  SettingsEvents,
  trackSignOut,
  trackDeleteAccountInitiated,
  trackDeleteAccountConfirmed,
  trackExportDataRequested,
} from '../analytics';

jest.mock('@/lib/sentry');

function getMockSentry() {
  return require('@/lib/sentry') as typeof import('../../../__tests__/__mocks__/sentry-local');
}

describe('SettingsEvents', () => {
  test('all event keys are non-empty strings', () => {
    for (const [, value] of Object.entries(SettingsEvents)) {
      expect(typeof value).toBe('string');
      expect(value.length).toBeGreaterThan(0);
    }
  });

  test('event values are snake_case prefixed with "settings_"', () => {
    const nonSettingsEvents = ['settings_sign_out']; // sign out could be considered auth
    for (const value of Object.values(SettingsEvents)) {
      expect(value).toMatch(/^settings_/);
    }
    void nonSettingsEvents;
  });
});

describe('trackSignOut', () => {
  test('adds a Sentry breadcrumb with auth category', () => {
    const { Sentry } = getMockSentry();
    trackSignOut();
    expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'auth', level: 'info' }),
    );
  });
});

describe('trackDeleteAccountInitiated', () => {
  test('adds a Sentry breadcrumb with account category and warning level', () => {
    const { Sentry } = getMockSentry();
    trackDeleteAccountInitiated();
    expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'account', level: 'warning' }),
    );
  });
});

describe('trackDeleteAccountConfirmed', () => {
  test('adds a Sentry breadcrumb with account category and warning level', () => {
    const { Sentry } = getMockSentry();
    trackDeleteAccountConfirmed();
    expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'account', level: 'warning' }),
    );
  });
});

describe('trackExportDataRequested', () => {
  test('adds a Sentry breadcrumb with account category and info level', () => {
    const { Sentry } = getMockSentry();
    trackExportDataRequested();
    expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'account', level: 'info' }),
    );
  });
});
