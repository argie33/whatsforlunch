import { MMKV } from 'react-native-mmkv';
import { localSignOut } from '@/lib/local-auth';

export const IS_MOCK =
  process.env.EXPO_PUBLIC_AUTH_MODE === 'local' ||
  process.env.EXPO_PUBLIC_AUTH_MODE === 'mock';

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
  if (IS_MOCK) {
    return isMockSignedIn() ? getMockUser() : null;
  }
  try {
    const { getCurrentUser: amplifyGetCurrentUser, fetchUserAttributes } =
      await import('@aws-amplify/auth');
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
  if (IS_MOCK) {
    mockStorage.set('mock_signed_in', false);
    mockStorage.delete('mock_user');
    try { await localSignOut(); } catch {}
    return;
  }
  const { signOut: amplifySignOut } = await import('@aws-amplify/auth');
  await amplifySignOut();
}

export async function signIn(email: string): Promise<void> {
  if (IS_MOCK) {
    const existing = getMockUser();
    if (email && email !== existing.email) {
      mockStorage.set('mock_user', JSON.stringify({ ...existing, email }));
    }
    mockStorage.set('mock_signed_in', true);
    return;
  }
  const { signIn: amplifySignIn } = await import('@aws-amplify/auth');
  await amplifySignIn({ username: email });
}

export async function signInWithApple(): Promise<void> {
  if (IS_MOCK) {
    const mockAppleUser: AuthUser = {
      userId: 'local-apple-user',
      name: 'Apple User',
      email: 'apple@mock.test',
    };
    mockStorage.set('mock_user', JSON.stringify(mockAppleUser));
    mockStorage.set('mock_signed_in', true);
    return;
  }
  // Production: Amplify hosted UI OAuth flow for Apple
  // Cognito federated identity — opens Safari briefly then redirects back
  const { signInWithRedirect } = await import('@aws-amplify/auth');
  await signInWithRedirect({ provider: 'Apple' });
}

export async function signInWithGoogle(): Promise<void> {
  if (IS_MOCK) {
    const mockGoogleUser: AuthUser = {
      userId: 'local-google-user',
      name: 'Google User',
      email: 'google@mock.test',
    };
    mockStorage.set('mock_user', JSON.stringify(mockGoogleUser));
    mockStorage.set('mock_signed_in', true);
    return;
  }
  // Production: Amplify hosted UI OAuth flow for Google
  const { signInWithRedirect } = await import('@aws-amplify/auth');
  await signInWithRedirect({ provider: 'Google' });
}

// Subscribe to Amplify Hub events for OAuth callback handling.
// Call once at app startup (in _layout.tsx or lib/amplify.ts) for prod.
export function listenForSocialSignInCallback(onSuccess: () => void, onError: (err: Error) => void): () => void {
  if (IS_MOCK) return () => {};
  let hub: typeof import('@aws-amplify/core').Hub | undefined;
  let unlisten: (() => void) | undefined;

  import('@aws-amplify/core').then(({ Hub }) => {
    hub = Hub;
    unlisten = Hub.listen('auth', ({ payload }) => {
      switch (payload.event) {
        case 'signInWithRedirect':
          onSuccess();
          break;
        case 'signInWithRedirect_failure':
          onError(new Error(String((payload.data as Record<string, unknown>)?.error ?? 'Social sign-in failed')));
          break;
        default:
          break;
      }
    });
  }).catch(() => {});

  return () => {
    unlisten?.();
  };
}
