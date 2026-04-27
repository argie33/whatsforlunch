import { MMKV } from 'react-native-mmkv';

// Both 'mock' and 'local' mean: no AWS, use MMKV-backed stub auth
const IS_MOCK =
  process.env.EXPO_PUBLIC_AUTH_MODE === 'mock' ||
  process.env.EXPO_PUBLIC_AUTH_MODE === 'local';
const authStorage = new MMKV({ id: 'wfl.auth' });

export type AuthUser = {
  userId: string;
  name: string;
  email: string;
};

const MOCK_USER: AuthUser = {
  userId: 'local-user-001',
  name: 'Dev User',
  email: 'dev@local.test',
};

// ── Mock mode ────────────────────────────────────────────────────────────────

function getMockUser(): AuthUser | null {
  try {
    const raw = authStorage.getString('mock.user');
    return raw ? JSON.parse(raw) : MOCK_USER;
  } catch {
    return MOCK_USER;
  }
}

function setMockUser(user: AuthUser | null) {
  if (user) authStorage.set('mock.user', JSON.stringify(user));
  else authStorage.delete('mock.user');
}

// ── Real Amplify mode ────────────────────────────────────────────────────────

async function getAmplifyUser(): Promise<AuthUser | null> {
  try {
    const { getCurrentUser, fetchUserAttributes } = await import('@aws-amplify/auth');
    const cognito = await getCurrentUser();
    const attrs = await fetchUserAttributes();
    return {
      userId: cognito.userId,
      name: attrs.name ?? cognito.username,
      email: attrs.email ?? '',
    };
  } catch {
    return null;
  }
}

async function amplifySignOut(): Promise<void> {
  const { signOut } = await import('@aws-amplify/auth');
  await signOut();
}

// ── Public API ───────────────────────────────────────────────────────────────

export async function getCurrentUser(): Promise<AuthUser | null> {
  return IS_MOCK ? getMockUser() : getAmplifyUser();
}

export async function signOut(): Promise<void> {
  if (IS_MOCK) {
    setMockUser(null);
    return;
  }
  return amplifySignOut();
}

/** Call during onboarding to set the mock user name (mock mode only). */
export function setMockUserName(name: string) {
  if (!IS_MOCK) return;
  const current = getMockUser() ?? MOCK_USER;
  setMockUser({ ...current, name });
}

export { IS_MOCK };
