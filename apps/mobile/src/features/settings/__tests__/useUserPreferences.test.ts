import { renderHook, act } from '@testing-library/react-hooks';

// Mock MMKV before importing the hook
const mockStorage = {
  getString: jest.fn(),
  set: jest.fn(),
  delete: jest.fn(),
};
jest.mock('react-native-mmkv', () => ({
  MMKV: jest.fn(() => mockStorage),
}));

import { useUserPreferences } from '../useUserPreferences';

describe('useUserPreferences', () => {
  beforeEach(() => {
    mockStorage.getString.mockReturnValue(null);
    mockStorage.set.mockClear();
  });

  it('returns default preferences when nothing stored', () => {
    const { result } = renderHook(() => useUserPreferences());
    expect(result.current.prefs.theme).toBe('auto');
    expect(result.current.prefs.units).toBe('imperial');
    expect(result.current.prefs.notificationsEnabled).toBe(true);
    expect(result.current.prefs.dietaryTags).toEqual([]);
  });

  it('merges stored preferences with defaults', () => {
    mockStorage.getString.mockReturnValue(
      JSON.stringify({ theme: 'dark', units: 'metric' })
    );
    const { result } = renderHook(() => useUserPreferences());
    expect(result.current.prefs.theme).toBe('dark');
    expect(result.current.prefs.units).toBe('metric');
    // Defaults fill in the rest
    expect(result.current.prefs.notificationsEnabled).toBe(true);
  });

  it('persists preference updates to MMKV', () => {
    const { result } = renderHook(() => useUserPreferences());
    act(() => {
      result.current.setPrefs({ theme: 'dark' });
    });
    expect(result.current.prefs.theme).toBe('dark');
    expect(mockStorage.set).toHaveBeenCalledWith(
      'preferences',
      expect.stringContaining('"theme":"dark"')
    );
  });

  it('partial update preserves other fields', () => {
    const { result } = renderHook(() => useUserPreferences());
    act(() => {
      result.current.setPrefs({ dietaryTags: ['Vegan', 'Gluten-free'] });
    });
    act(() => {
      result.current.setPrefs({ theme: 'light' });
    });
    expect(result.current.prefs.dietaryTags).toEqual(['Vegan', 'Gluten-free']);
    expect(result.current.prefs.theme).toBe('light');
  });

  it('toggles notification kind on and off', () => {
    const { result } = renderHook(() => useUserPreferences());
    const kinds = result.current.prefs.enabledNotificationKinds;

    act(() => {
      result.current.setPrefs({ enabledNotificationKinds: kinds.filter(k => k !== 'daily_digest') });
    });
    expect(result.current.prefs.enabledNotificationKinds).not.toContain('daily_digest');

    act(() => {
      result.current.setPrefs({ enabledNotificationKinds: [...result.current.prefs.enabledNotificationKinds, 'daily_digest'] });
    });
    expect(result.current.prefs.enabledNotificationKinds).toContain('daily_digest');
  });

  it('handles corrupt MMKV data gracefully', () => {
    mockStorage.getString.mockReturnValue('{not valid json');
    const { result } = renderHook(() => useUserPreferences());
    // Falls back to defaults without throwing
    expect(result.current.prefs.theme).toBe('auto');
  });
});
