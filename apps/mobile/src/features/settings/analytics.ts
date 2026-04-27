import { addBreadcrumb } from '@/lib/sentry';

/**
 * Call useAnalytics() from @/lib/posthog inside components.
 * These helpers are for non-component contexts (authService, etc.).
 *
 * Events schema: snake_case, prefixed with 'settings.'
 */

export const SettingsEvents = {
  SIGN_OUT: 'settings.sign_out',
  DELETE_ACCOUNT_INITIATED: 'settings.delete_account_initiated',
  DELETE_ACCOUNT_CONFIRMED: 'settings.delete_account_confirmed',
  PREFERENCES_CHANGED: 'settings.preferences_changed',
  NOTIFICATIONS_TOGGLED: 'settings.notifications_toggled',
  NOTIFICATION_KIND_TOGGLED: 'settings.notification_kind_toggled',
  EXPORT_DATA_REQUESTED: 'settings.export_data_requested',
  THEME_CHANGED: 'settings.theme_changed',
  UNITS_CHANGED: 'settings.units_changed',
} as const;

export type SettingsEvent = typeof SettingsEvents[keyof typeof SettingsEvents];

/** Sentry breadcrumb helpers for destructive actions (no PII). */
export function trackSignOut() {
  addBreadcrumb({ category: 'account', message: 'sign_out', level: 'info' });
}

export function trackDeleteAccountInitiated() {
  addBreadcrumb({ category: 'account', message: 'delete_account_initiated', level: 'warning' });
}

export function trackDeleteAccountConfirmed() {
  addBreadcrumb({ category: 'account', message: 'delete_account_confirmed', level: 'warning' });
}

export function trackExportDataRequested() {
  addBreadcrumb({ category: 'data', message: 'export_data_requested', level: 'info' });
}
