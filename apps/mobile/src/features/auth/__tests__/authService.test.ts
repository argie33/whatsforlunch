jest.mock('react-native-mmkv', () => {
  const store: Record<string, string> = {};
  return {
    MMKV: jest.fn().mockImplementation(() => ({
      getString: (key: string) => store[key],
      set: (key: string, value: string) => { store[key] = value; },
      delete: (key: string) => { delete store[key]; },
    })),
  };
});

jest.mock('@/lib/local-auth', () => ({
  localSignIn: jest.fn().mockResolvedValue({ token: 'tok', userId: 'u1' }),
  localSignOut: jest.fn().mockResolvedValue(undefined),
  isLocallySignedIn: jest.fn().mockResolvedValue(true),
}));

// Force IS_MOCK to true for all tests
process.env.EXPO_PUBLIC_AUTH_MODE = 'local';

import { getCurrentUser, signOut, setMockUserName } from '../authService';

describe('authService (mock mode)', () => {
  it('returns default mock user when signed in', async () => {
    const user = await getCurrentUser();
    expect(user).not.toBeNull();
    expect(user?.userId).toBe('local-user-001');
    expect(user?.email).toBe('dev@local.test');
  });

  it('setMockUserName updates returned name', async () => {
    setMockUserName('Alice Test');
    const user = await getCurrentUser();
    expect(user?.name).toBe('Alice Test');
  });

  it('signOut clears stored user', async () => {
    const { localSignOut } = require('@/lib/local-auth');
    await signOut();
    expect(localSignOut).toHaveBeenCalled();
  });

  it('returns null when not locally signed in', async () => {
    const { isLocallySignedIn } = require('@/lib/local-auth');
    isLocallySignedIn.mockResolvedValueOnce(false);
    const user = await getCurrentUser();
    expect(user).toBeNull();
  });
});
