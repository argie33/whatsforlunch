export type ThemePreference = 'auto' | 'light' | 'dark';
export type UnitsPreference = 'imperial' | 'metric';
export type NotificationKind = 'expiry_alert' | 'daily_digest' | 'household' | 'system';

export interface UserPreferences {
  theme: ThemePreference;
  units: UnitsPreference;
  notificationsEnabled: boolean;
  enabledNotificationKinds: NotificationKind[];
  quietHoursStart: string;
  quietHoursEnd: string;
  dietaryTags: string[];
  cuisineTags: string[];
  allergyTags: string[];
  deletePhotosAfterAI: boolean;
  shareAnalytics: boolean;
}
