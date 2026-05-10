import { renderHook, act } from '@testing-library/react-hooks';
import { useUserPreferences } from '../useUserPreferences';

jest.mock('react-native-mmkv', () => {
  const store: Record<string, string> = {};
  return {
    MMKV: jest.fn().mockImplementation(() => ({
      getString: (key: string) => store[key],
      set: (key: string, value: string) => {
        store[key] = value;
      },
      delete: (key: string) => {
        delete store[key];
      },
    })),
  };
});

describe('useUserPreferences', () => {
  it('returns defaults when no stored value', () => {
    const { result } = renderHook(() => useUserPreferences());
    expect(result.current.prefs.theme).toBe('auto');
    expect(result.current.prefs.units).toBe('imperial');
    expect(result.current.prefs.notificationsEnabled).toBe(true);
    expect(result.current.prefs.dietaryTags).toEqual([]);
  });

  it('merges partial update', () => {
    const { result } = renderHook(() => useUserPreferences());
    act(() => {
      result.current.setPrefs({ theme: 'dark' });
    });
    expect(result.current.prefs.theme).toBe('dark');
    expect(result.current.prefs.units).toBe('imperial');
  });

  it('persists toggle state', () => {
    const { result } = renderHook(() => useUserPreferences());
    act(() => {
      result.current.setPrefs({ notificationsEnabled: false });
    });
    expect(result.current.prefs.notificationsEnabled).toBe(false);
  });

  it('handles partial notification kinds update', () => {
    const { result } = renderHook(() => useUserPreferences());
    act(() => {
      result.current.setPrefs({ enabledNotificationKinds: ['expiry_alert'] });
    });
    expect(result.current.prefs.enabledNotificationKinds).toEqual(['expiry_alert']);
  });

  it('handles corrupt stored data gracefully', () => {
    const mmkv = new (require('react-native-mmkv').MMKV)();
    mmkv.set('user_preferences', 'not-json{{{');
    const { result } = renderHook(() => useUserPreferences());
    expect(result.current.prefs.theme).toBe('auto');
  });
});
