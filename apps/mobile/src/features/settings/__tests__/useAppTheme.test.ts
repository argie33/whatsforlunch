import { renderHook } from '@testing-library/react-hooks';
import { useAppTheme } from '../useAppTheme';

const mockUseColorScheme = jest.fn<'light' | 'dark' | null | undefined, []>(() => 'light');
// Get __resetAll from the same module instance (via moduleNameMapper) that
// storage.ts and prefsStorage use, so they share the same `stores` object.
function getMmkvMock() {
  return require('react-native-mmkv') as typeof import('../../../__tests__/__mocks__/mmkv');
}
jest.mock('react-native', () => ({
  useColorScheme: () => mockUseColorScheme(),
  Platform: { OS: 'ios', select: jest.fn((obj: Record<string, unknown>) => obj['ios']) },
}));

beforeEach(() => {
  getMmkvMock().__resetAll();
  mockUseColorScheme.mockReturnValue('light');
});

describe('useAppTheme', () => {
  test('returns "light" when system is light and pref is auto', () => {
    mockUseColorScheme.mockReturnValue('light');
    const { result } = renderHook(() => useAppTheme());
    expect(result.current).toBe('light');
  });

  test('returns "dark" when system is dark and pref is auto', () => {
    mockUseColorScheme.mockReturnValue('dark');
    const { result } = renderHook(() => useAppTheme());
    expect(result.current).toBe('dark');
  });

  test('returns "light" when pref is explicitly "light" regardless of dark system', () => {
    mockUseColorScheme.mockReturnValue('dark');
    const { MMKV } = getMmkvMock();
    const storage = new MMKV({ id: 'wfl.user.prefs' });
    storage.set('user_preferences', JSON.stringify({ theme: 'light' }));

    const { result } = renderHook(() => useAppTheme());
    expect(result.current).toBe('light');
  });

  test('returns "dark" when pref is explicitly "dark" regardless of light system', () => {
    mockUseColorScheme.mockReturnValue('light');
    const { MMKV } = getMmkvMock();
    const storage = new MMKV({ id: 'wfl.user.prefs' });
    storage.set('user_preferences', JSON.stringify({ theme: 'dark' }));

    const { result } = renderHook(() => useAppTheme());
    expect(result.current).toBe('dark');
  });

  test('falls back gracefully when stored JSON is corrupt', () => {
    mockUseColorScheme.mockReturnValue('light');
    const { MMKV } = getMmkvMock();
    const storage = new MMKV({ id: 'wfl.user.prefs' });
    storage.set('user_preferences', 'not-valid-json{');

    const { result } = renderHook(() => useAppTheme());
    expect(result.current).toBe('light');
  });
});
