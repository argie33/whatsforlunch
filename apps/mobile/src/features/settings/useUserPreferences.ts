import { useState, useCallback } from 'react';
import { prefsStorage } from './storage';
import type { UserPreferences } from './types';

const PREFS_KEY = 'user_preferences';

const defaults: UserPreferences = {
  theme: 'auto',
  units: 'imperial',
  notificationsEnabled: true,
  enabledNotificationKinds: ['expiry_alert', 'daily_digest', 'household', 'system'],
  quietHoursStart: '22:00',
  quietHoursEnd: '07:00',
  dietaryTags: [],
  cuisineTags: [],
  allergyTags: [],
  deletePhotosAfterAI: true,
  shareAnalytics: true,
};

function load(): UserPreferences {
  try {
    const raw = prefsStorage.getString(PREFS_KEY);
    if (raw) return { ...defaults, ...JSON.parse(raw) };
  } catch {}
  return defaults;
}

function persist(prefs: UserPreferences): void {
  prefsStorage.set(PREFS_KEY, JSON.stringify(prefs));
}

export function useUserPreferences() {
  const [prefs, setState] = useState<UserPreferences>(load);

  const setPrefs = useCallback((patch: Partial<UserPreferences>) => {
    setState((current) => {
      const next = { ...current, ...patch };
      persist(next);
      return next;
    });
  }, []);

  return { prefs, setPrefs };
}
