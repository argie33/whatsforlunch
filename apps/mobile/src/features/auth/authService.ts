import { MMKV } from 'react-native-mmkv';
import { Platform } from 'react-native';
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

const _isLocalApi = () => {
  // "local" = call the local API server for real auth (has backend)
  return process.env.EXPO_PUBLIC_AUTH_MODE === 'local';
};

export interface AuthUser {
  userId: string;
  name: string;
  email: string;
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  if (_isLocalApi()) {
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
    }
    return null;
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { signOut: amplifySignOut } = require('@aws-amplify/auth') as any;
  await amplifySignOut();
}

export async function signIn(email: string): Promise<void> {
  if (_isLocalApi()) {
    await localSignIn(email);
    return;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { signIn: amplifySignIn } = require('@aws-amplify/auth') as any;
  await amplifySignIn({ username: email });
}

export async function signInWithApple(): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { signInWithRedirect } = require('@aws-amplify/auth') as any;
  await signInWithRedirect({ provider: 'Apple' });
}

export async function signInWithGoogle(): Promise<void> {
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
  // No-op on web platform - only available on native
  if (Platform.OS === 'web') {
    return () => {};
  }

  let unlisten: (() => void) | undefined;

  // Dynamic require to avoid Metro trying to resolve at build time
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, global-require
    const { Hub } = require('@aws-amplify/core') as any;
    unlisten = Hub.listen('auth', ({ payload }: any) => {
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
  } catch {
    // Amplify not available
  }

  return () => {
    unlisten?.();
  };
}
