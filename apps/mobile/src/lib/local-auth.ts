/**
 * Local dev auth — no Cognito.
 * Calls the mock server's signIn mutation, stores JWT in SecureStore.
 * Only active when EXPO_PUBLIC_AUTH_MODE=local.
 */
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'wfl_local_token';
const USER_ID_KEY = 'wfl_local_user_id';
const API_URL = process.env.EXPO_PUBLIC_APPSYNC_URL ?? 'http://localhost:4000/graphql';

const SIGN_IN_MUTATION = `
  mutation SignIn($email: String!) {
    signIn(email: $email) {
      token
      userId
    }
  }
`;

export async function localSignIn(email: string): Promise<{ token: string; userId: string }> {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: SIGN_IN_MUTATION, variables: { email } }),
  });

  if (!res.ok) throw new Error(`Sign-in request failed: ${res.status}`);

  const json = (await res.json()) as { data?: { signIn?: { token: string; userId: string } }; errors?: unknown[] };

  if (json.errors?.length) throw new Error(`Sign-in error: ${JSON.stringify(json.errors)}`);
  if (!json.data?.signIn) throw new Error('Sign-in returned no data');

  const { token, userId } = json.data.signIn;

  await SecureStore.setItemAsync(TOKEN_KEY, token);
  await SecureStore.setItemAsync(USER_ID_KEY, userId);

  return { token, userId };
}

export async function getLocalToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function getLocalUserId(): Promise<string | null> {
  return SecureStore.getItemAsync(USER_ID_KEY);
}

export async function localSignOut(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(USER_ID_KEY);
}

export async function isLocallySignedIn(): Promise<boolean> {
  const token = await getLocalToken();
  return token !== null;
}
