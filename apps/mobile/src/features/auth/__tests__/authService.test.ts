import {
  getCurrentUser,
  signOut,
  setMockUserName,
  signIn,
  __setMockMode,
  __resetMockMode,
} from '../authService';
import { __resetAll } from '../../../__tests__/__mocks__/mmkv';

jest.mock('@/lib/local-auth', () => ({
  localSignIn: jest.fn().mockResolvedValue({ token: 'tok', userId: 'u1' }),
  localSignOut: jest.fn().mockResolvedValue(undefined),
  isLocallySignedIn: jest.fn().mockResolvedValue(true),
}));

describe('authService (mock mode)', () => {
  beforeEach(async () => {
    __setMockMode(true);
    __resetAll();
    await signIn('dev@local.test');
  });

  afterEach(() => {
    __resetMockMode();
  });

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
    // In mock mode, signOut clears MMKV storage (doesn't call localSignOut)
    await signOut();
    const user = await getCurrentUser();
    expect(user).toBeNull();
  });

  it('returns null when not signed in', async () => {
    await signOut();
    const user = await getCurrentUser();
    expect(user).toBeNull();
  });
});
