import { MMKV } from 'react-native-mmkv';
import { localSignIn, getLocalToken, getLocalUserId, localSignOut } from '@/lib/local-auth';
import { secureGet } from '@/lib/secure-store';

// Decode JWT payload (basic implementation - no verification)
function decodeJWT(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1];
    const decoded = Buffer.from(payload, 'base64').toString('utf-8');
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

// babel-preset-expo inlines EXPO_PUBLIC_* env vars at transform time, so we can't
// rely on process.env at runtime for mock detection. __setMockMode() lets tests
// override this without changing production behaviour.
let _mockModeOverride: boolean | null = null;

const _isLocalApi = () => {
  // "local" = call the local API server for real auth (has backend)
  return process.env.EXPO_PUBLIC_AUTH_MODE === 'local';
};

const _isMock = () => {
  if (_mockModeOverride !== null) return _mockModeOverride;
  // "mock" = pure offline (no backend)
  return process.env.EXPO_PUBLIC_AUTH_MODE === 'mock';
};

/** Test-only: force mock mode on/off. Call __resetMockMode() in afterEach. */
export function __setMockMode(value: boolean): void {
  _mockModeOverride = value;
}
export function __resetMockMode(): void {
  _mockModeOverride = null;
}

// Exported const for callers that import IS_MOCK — evaluated once at module load.
// True if in pure offline mode (not connected to any API)
export const IS_MOCK = _isMock();

export interface AuthUser {
  userId: string;
  name: string;
  email: string;
}

const mockStorage = new MMKV({ id: 'wfl.mock.auth' });

const DEFAULT_MOCK_USER: AuthUser = {
  userId: 'local-user-001',
  name: 'Dev User',
  email: 'dev@local.test',
};

function getMockUser(): AuthUser {
  try {
    const raw = mockStorage.getString('mock_user');
    if (raw) return JSON.parse(raw) as AuthUser;
  } catch {}
  return DEFAULT_MOCK_USER;
}

function isMockSignedIn(): boolean {
  return mockStorage.getBoolean('mock_signed_in') ?? false;
}

export function setMockUserName(name: string): void {
  const user = getMockUser();
  mockStorage.set('mock_user', JSON.stringify({ ...user, name }));
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  if (_isLocalApi()) {
    // Check if we have a valid local API token
    const token = await getLocalToken();
    if (token) {
      const payload = decodeJWT(token);
      if (payload && typeof payload.sub === 'string' && typeof payload.email === 'string') {
        return {
          userId: payload.sub,
          email: payload.email,
          name: (payload.name as string) || payload.email.split('@')[0],
        };
      }
      // Fallback if decode fails
      const userId = await getLocalUserId();
      if (userId) {
        return {
          userId,
          name: 'Local User',
          email: 'local@dev.test',
        };
      }
    }
    return null;
  }
  if (_isMock()) {
    return isMockSignedIn() ? getMockUser() : null;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { getCurrentUser: amplifyGetCurrentUser, fetchUserAttributes } =
      require('@aws-amplify/auth') as any;
    const amplifyUser = await amplifyGetCurrentUser();
    const attrs = await fetchUserAttributes();
    return {
      userId: amplifyUser.userId,
      name: attrs.name ?? attrs.email ?? amplifyUser.username,
      email: attrs.email ?? '',
    };
  } catch {
    return null;
  }
}

export async function signOut(): Promise<void> {
  if (_isLocalApi()) {
    await localSignOut();
    return;
  }
  if (_isMock()) {
    mockStorage.set('mock_signed_in', false);
    mockStorage.delete('mock_user');
    return;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { signOut: amplifySignOut } = require('@aws-amplify/auth') as any;
  await amplifySignOut();
}

export async function signIn(email: string): Promise<void> {
  if (_isLocalApi()) {
    // Call local API to get real JWT token
    await localSignIn(email);
    return;
  }
  if (_isMock()) {
    const existing = getMockUser();
    if (email && email !== existing.email) {
      mockStorage.set('mock_user', JSON.stringify({ ...existing, email }));
    }
    mockStorage.set('mock_signed_in', true);
    return;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { signIn: amplifySignIn } = require('@aws-amplify/auth') as any;
  await amplifySignIn({ username: email });
}

export async function signInWithApple(): Promise<void> {
  if (_isMock()) {
    const mockAppleUser: AuthUser = {
      userId: 'local-apple-user',
      name: 'Apple User',
      email: 'apple@mock.test',
    };
    mockStorage.set('mock_user', JSON.stringify(mockAppleUser));
    mockStorage.set('mock_signed_in', true);
    return;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { signInWithRedirect } = require('@aws-amplify/auth') as any;
  await signInWithRedirect({ provider: 'Apple' });
}

export async function signInWithGoogle(): Promise<void> {
  if (_isMock()) {
    const mockGoogleUser: AuthUser = {
      userId: 'local-google-user',
      name: 'Google User',
      email: 'google@mock.test',
    };
    mockStorage.set('mock_user', JSON.stringify(mockGoogleUser));
    mockStorage.set('mock_signed_in', true);
    return;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { signInWithRedirect } = require('@aws-amplify/auth') as any;
  await signInWithRedirect({ provider: 'Google' });
}

// Subscribe to Amplify Hub events for OAuth callback handling.
// Call once at app startup (in _layout.tsx or lib/amplify.ts) for prod.
export function listenForSocialSignInCallback(
  onSuccess: () => void,
  onError: (err: Error) => void,
): () => void {
  if (_isMock()) return () => {};
  let unlisten: (() => void) | undefined;

  import('@aws-amplify/core')
    .then(({ Hub }) => {
      unlisten = Hub.listen('auth', ({ payload }) => {
        switch (payload.event) {
          case 'signInWithRedirect':
            onSuccess();
            break;
          case 'signInWithRedirect_failure':
            onError(
              new Error(
                String((payload.data as Record<string, unknown>)?.error ?? 'Social sign-in failed'),
              ),
            );
            break;
          default:
            break;
        }
      });
    })
    .catch(() => {});

  return () => {
    unlisten?.();
  };
}
