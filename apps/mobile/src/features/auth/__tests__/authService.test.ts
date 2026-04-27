// Mock MMKV
const mockAuthStorage = {
  getString: jest.fn(),
  set: jest.fn(),
  delete: jest.fn(),
};
jest.mock('react-native-mmkv', () => ({
  MMKV: jest.fn(() => mockAuthStorage),
}));

// Force mock mode for all tests
process.env.EXPO_PUBLIC_AUTH_MODE = 'mock';

import { getCurrentUser, signOut, setMockUserName, IS_MOCK } from '../authService';

describe('authService (mock mode)', () => {
  beforeEach(() => {
    mockAuthStorage.getString.mockReturnValue(null);
    mockAuthStorage.set.mockClear();
    mockAuthStorage.delete.mockClear();
  });

  it('IS_MOCK is true when AUTH_MODE is mock', () => {
    expect(IS_MOCK).toBe(true);
  });

  it('returns default mock user when no stored user', async () => {
    const user = await getCurrentUser();
    expect(user).not.toBeNull();
    expect(user?.userId).toBe('local-user-001');
    expect(user?.email).toBe('dev@local.test');
  });

  it('returns stored mock user when one exists', async () => {
    mockAuthStorage.getString.mockReturnValue(
      JSON.stringify({ userId: 'u123', name: 'Alex', email: 'alex@test.com' })
    );
    const user = await getCurrentUser();
    expect(user?.name).toBe('Alex');
    expect(user?.email).toBe('alex@test.com');
  });

  it('signOut deletes stored user', async () => {
    await signOut();
    expect(mockAuthStorage.delete).toHaveBeenCalledWith('mock.user');
  });

  it('setMockUserName updates stored user name', () => {
    mockAuthStorage.getString.mockReturnValue(
      JSON.stringify({ userId: 'u1', name: 'Old Name', email: 'x@x.com' })
    );
    setMockUserName('New Name');
    expect(mockAuthStorage.set).toHaveBeenCalledWith(
      'mock.user',
      expect.stringContaining('"name":"New Name"')
    );
  });

  it('handles corrupt stored user gracefully', async () => {
    mockAuthStorage.getString.mockReturnValue('{bad json');
    const user = await getCurrentUser();
    // Falls back to MOCK_USER default
    expect(user?.userId).toBe('local-user-001');
  });
});
