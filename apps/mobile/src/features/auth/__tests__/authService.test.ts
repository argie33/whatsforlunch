import { getCurrentUser, signOut, signIn } from '../authService';

jest.mock('@/lib/local-auth', () => ({
  localSignIn: jest.fn().mockResolvedValue({ token: 'tok', userId: 'u1' }),
  localSignOut: jest.fn().mockResolvedValue(undefined),
  isLocallySignedIn: jest.fn().mockResolvedValue(true),
}));

describe('authService', () => {
  it('exports auth functions', () => {
    expect(typeof getCurrentUser).toBe('function');
    expect(typeof signOut).toBe('function');
    expect(typeof signIn).toBe('function');
  });
});
