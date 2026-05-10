/**
 * Local dev auth — no Cognito.
 * Calls the local API server's signIn mutation, stores JWT in SecureStore.
 * Active only when EXPO_PUBLIC_AUTH_MODE=local.
 */
import { secureGet, secureSet, secureDelete } from './secure-store';

const TOKEN_KEY = 'wfl_local_token';
const USER_ID_KEY = 'wfl_local_user_id';
const HOUSEHOLD_ID_KEY = 'wfl_local_household_id';

const LOCAL_API = process.env['EXPO_PUBLIC_APPSYNC_URL'] ?? 'http://localhost:4000/graphql';

const SIGN_IN_MUTATION = `
  mutation SignIn($email: String!) {
    signIn(email: $email) { token userId }
  }
`;

const GET_PROFILE_QUERY = `
  query GetProfile {
    getProfile {
      id
      email
      defaultHouseholdId
    }
  }
`;

export async function localSignIn(
  email: string,
): Promise<{ token: string; userId: string; householdId: string }> {
  // Step 1: Sign in and get token
  const signInRes = await fetch(LOCAL_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: SIGN_IN_MUTATION, variables: { email } }),
  });

  if (!signInRes.ok) throw new Error(`Sign-in request failed: HTTP ${signInRes.status}`);

  const signInJson = (await signInRes.json()) as {
    data?: { signIn?: { token: string; userId: string } };
    errors?: { message: string }[];
  };

  if (signInJson.errors?.length) throw new Error(signInJson.errors[0]?.message ?? 'Sign-in failed');
  if (!signInJson.data?.signIn) throw new Error('Sign-in returned no data');

  const { token, userId } = signInJson.data.signIn;

  // Step 2: Fetch user profile to get household ID
  let householdId = '';
  try {
    const profileRes = await fetch(LOCAL_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ query: GET_PROFILE_QUERY }),
    });

    const profileJson = (await profileRes.json()) as {
      data?: { getProfile?: { id: string; defaultHouseholdId: string | null } };
      errors?: { message: string }[];
    };

    if (profileJson.errors?.length) {
      console.warn('[localSignIn] Could not fetch profile:', profileJson.errors[0]?.message);
    } else if (profileJson.data?.getProfile?.defaultHouseholdId) {
      householdId = profileJson.data.getProfile.defaultHouseholdId;
    }
  } catch (err) {
    console.warn('[localSignIn] Profile fetch error:', err);
  }

  // If no household from profile, create one on the backend
  if (!householdId) {
    try {
      const hhRes = await fetch(LOCAL_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          query: `mutation { createHousehold(input: { name: "My Home" }) { id } }`,
        }),
      });

      const hhJson = (await hhRes.json()) as {
        data?: { createHousehold?: { id: string } };
        errors?: { message: string }[];
      };

      if (hhJson.data?.createHousehold?.id) {
        householdId = hhJson.data.createHousehold.id;
      }
    } catch (err) {
      console.warn('[localSignIn] Could not create household:', err);
    }
  }

  if (!householdId) {
    throw new Error('Could not obtain household ID');
  }

  // Step 3: Store in secure storage
  await Promise.all([
    secureSet(TOKEN_KEY, token),
    secureSet(USER_ID_KEY, userId),
    secureSet(HOUSEHOLD_ID_KEY, householdId),
  ]);

  return { token, userId, householdId };
}

export async function getLocalToken(): Promise<string | null> {
  return secureGet(TOKEN_KEY);
}

export async function getLocalUserId(): Promise<string | null> {
  return secureGet(USER_ID_KEY);
}

export async function getLocalHouseholdId(): Promise<string | null> {
  return secureGet(HOUSEHOLD_ID_KEY);
}

export async function localSignOut(): Promise<void> {
  await Promise.all([
    secureDelete(TOKEN_KEY),
    secureDelete(USER_ID_KEY),
    secureDelete(HOUSEHOLD_ID_KEY),
  ]);
}

export async function isLocallySignedIn(): Promise<boolean> {
  const token = await getLocalToken();
  return token !== null;
}
