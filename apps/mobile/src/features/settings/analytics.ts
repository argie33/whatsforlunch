import { useAnalytics } from '@/lib/posthog';
import { Sentry } from '@/lib/sentry';

export const SettingsEvents = {
  THEME_CHANGED: 'settings_theme_changed',
  UNITS_CHANGED: 'settings_units_changed',
  NOTIFICATIONS_TOGGLED: 'settings_notifications_toggled',
  DIETARY_UPDATED: 'settings_dietary_updated',
  CUISINE_UPDATED: 'settings_cuisine_updated',
  ALLERGY_UPDATED: 'settings_allergy_updated',
  PRIVACY_UPDATED: 'settings_privacy_updated',
  DIGEST_TOGGLED: 'settings_digest_toggled',
  SIGN_OUT: 'settings_sign_out',
  DELETE_ACCOUNT_INITIATED: 'settings_delete_account_initiated',
  DELETE_ACCOUNT_CONFIRMED: 'settings_delete_account_confirmed',
  EXPORT_DATA_REQUESTED: 'settings_export_data_requested',
  BUG_REPORT_SENT: 'settings_bug_report_sent',
  PROFILE_UPDATED: 'settings_profile_updated',
  HOUSEHOLD_CREATED: 'settings_household_created',
  HOUSEHOLD_RENAMED: 'settings_household_renamed',
  MEMBER_INVITED: 'settings_member_invited',
} as const;

export function trackSignOut(): void {
  Sentry.addBreadcrumb({ category: 'auth', message: 'User signed out', level: 'info' });
}

export function trackDeleteAccountInitiated(): void {
  Sentry.addBreadcrumb({ category: 'account', message: 'Delete account initiated', level: 'warning' });
}

export function trackDeleteAccountConfirmed(): void {
  Sentry.addBreadcrumb({ category: 'account', message: 'Delete account confirmed', level: 'warning' });
}

export function trackExportDataRequested(): void {
  Sentry.addBreadcrumb({ category: 'account', message: 'Export data requested', level: 'info' });
}
