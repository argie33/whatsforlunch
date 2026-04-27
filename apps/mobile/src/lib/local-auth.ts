/**
 * Local dev auth — no Cognito.
 * Calls the local API server's signIn mutation, stores JWT in SecureStore.
 * Active only when EXPO_PUBLIC_AUTH_MODE=local.
 */
import { secureGet, secureSet, secureDelete } from './secure-store';

const TOKEN_KEY = 'wfl_local_token';
const USER_ID_KEY = 'wfl_local_user_id';

const LOCAL_API = process.env['EXPO_PUBLIC_APPSYNC_URL'] ?? 'http://localhost:4000/graphql';

const SIGN_IN_MUTATION = `
  mutation SignIn($email: String!) {
    signIn(email: $email) { token userId }
  }
`;

export async function localSignIn(email: string): Promise<{ token: string; userId: string }> {
  const res = await fetch(LOCAL_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: SIGN_IN_MUTATION, variables: { email } }),
  });

  if (!res.ok) throw new Error(`Sign-in request failed: HTTP ${res.status}`);

  const json = (await res.json()) as {
    data?: { signIn?: { token: string; userId: string } };
    errors?: { message: string }[];
  };

  if (json.errors?.length) throw new Error(json.errors[0]?.message ?? 'Sign-in failed');
  if (!json.data?.signIn) throw new Error('Sign-in returned no data');

  const { token, userId } = json.data.signIn;
  await Promise.all([secureSet(TOKEN_KEY, token), secureSet(USER_ID_KEY, userId)]);
  return { token, userId };
}

export async function getLocalToken(): Promise<string | null> {
  return secureGet(TOKEN_KEY);
}

export async function getLocalUserId(): Promise<string | null> {
  return secureGet(USER_ID_KEY);
}

export async function localSignOut(): Promise<void> {
  await Promise.all([secureDelete(TOKEN_KEY), secureDelete(USER_ID_KEY)]);
}

export async function isLocallySignedIn(): Promise<boolean> {
  const token = await getLocalToken();
  return token !== null;
}
