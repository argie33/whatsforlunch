import { Amplify } from 'aws-amplify';
import { getLocalToken } from './local-auth';

const IS_LOCAL = process.env.EXPO_PUBLIC_AUTH_MODE === 'local';
const IS_MOCK = IS_LOCAL || process.env.EXPO_PUBLIC_AUTH_MODE === 'mock';
const apiUrl = process.env.EXPO_PUBLIC_APPSYNC_URL ?? '';

if (IS_LOCAL) {
  // Local dev: point at local API server, inject JWT via custom headers.
  // Cognito is not used; auth flows through local-auth.ts / authService.ts.
  Amplify.configure(
    {
      API: {
        GraphQL: {
          endpoint: apiUrl,
          region: 'us-east-1',
          defaultAuthMode: 'none',
        },
      },
    },
    {
      API: {
        GraphQL: {
          headers: async () => {
            const token = await getLocalToken();
            return token ? { Authorization: `Bearer ${token}` } : {};
          },
        },
      },
    },
  );
} else if (IS_MOCK) {
  Amplify.configure({
    API: {
      GraphQL: {
        endpoint: apiUrl,
        region: 'us-east-1',
        defaultAuthMode: 'none',
      },
    },
  });
} else {
  // Production / staging: real Cognito + AppSync with OAuth for social sign-in
  const region = process.env.EXPO_PUBLIC_AWS_REGION ?? 'us-east-1';
  const cognitoDomain = process.env.EXPO_PUBLIC_COGNITO_DOMAIN ?? '';

  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId: process.env.EXPO_PUBLIC_COGNITO_USER_POOL_ID ?? '',
        userPoolClientId: process.env.EXPO_PUBLIC_COGNITO_CLIENT_ID ?? '',
        identityPoolId: process.env.EXPO_PUBLIC_COGNITO_IDENTITY_POOL_ID,
        loginWith: {
          oauth: {
            domain: cognitoDomain,
            scopes: ['email', 'openid', 'profile'],
            // Deep-link URI scheme so Amplify can redirect back after OAuth
            redirectSignIn: ['wfl://auth/callback'],
            redirectSignOut: ['wfl://auth/signout'],
            responseType: 'code',
          },
        },
      },
    },
    API: {
      GraphQL: {
        endpoint: apiUrl,
        region,
        defaultAuthMode: 'userPool',
      },
    },
  });
}

export { IS_LOCAL, IS_MOCK };

export async function getGraphQLHeaders(): Promise<Record<string, string>> {
  if (IS_LOCAL) {
    const token = await getLocalToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }
  return {};
}
