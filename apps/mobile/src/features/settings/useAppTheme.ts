import { useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { prefsStorage } from './storage';

const PREFS_KEY = 'user_preferences';

function readThemePref(): 'auto' | 'light' | 'dark' {
  try {
    const raw = prefsStorage.getString(PREFS_KEY);
    if (raw) return (JSON.parse(raw).theme as 'auto' | 'light' | 'dark') ?? 'auto';
  } catch {}
  return 'auto';
}

export function useAppTheme(): 'light' | 'dark' {
  const systemScheme = useColorScheme() ?? 'light';
  const [pref, setPref] = useState<'auto' | 'light' | 'dark'>(readThemePref);

  useEffect(() => {
    const listener = prefsStorage.addOnValueChangedListener((key) => {
      if (key === PREFS_KEY) setPref(readThemePref());
    });
    return () => listener.remove();
  }, []);

  if (pref === 'light') return 'light';
  if (pref === 'dark') return 'dark';
  return systemScheme === 'dark' ? 'dark' : 'light';
}
