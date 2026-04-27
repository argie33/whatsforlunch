import { MMKV } from 'react-native-mmkv';
import { localSignIn, localSignOut, isLocallySignedIn } from '@/lib/local-auth';

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

export function setMockUserName(name: string): void {
  const user = getMockUser();
  mockStorage.set('mock_user', JSON.stringify({ ...user, name }));
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  if (IS_MOCK) {
    const signedIn = await isLocallySignedIn();
    if (!signedIn) return null;
    return getMockUser();
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
    await localSignOut();
    mockStorage.delete('mock_user');
    return;
  }
  const { signOut: amplifySignOut } = await import('@aws-amplify/auth');
  await amplifySignOut();
}

export async function signIn(email: string): Promise<void> {
  if (IS_MOCK) {
    await localSignIn(email);
    return;
  }
  const { signIn: amplifySignIn } = await import('@aws-amplify/auth');
  await amplifySignIn({ username: email });
}
