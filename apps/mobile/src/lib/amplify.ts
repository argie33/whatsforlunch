import { Amplify } from 'aws-amplify';
import { getLocalToken } from './local-auth.js';

const IS_LOCAL = process.env.EXPO_PUBLIC_AUTH_MODE === 'local';
const apiUrl = process.env.EXPO_PUBLIC_APPSYNC_URL ?? '';

if (IS_LOCAL) {
  // Local dev: point at mock server with JWT bearer auth.
  // Cognito is not contacted; auth flows through local-auth.ts instead.
  Amplify.configure({
    API: {
      GraphQL: {
        endpoint: apiUrl,
        defaultAuthMode: 'lambda',
        // 'lambda' auth type passes a custom token; we supply it via customHeaders
      },
    },
  });
} else {
  // Production / staging: real Cognito + AppSync
  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId: process.env.EXPO_PUBLIC_COGNITO_USER_POOL_ID ?? '',
        userPoolClientId: process.env.EXPO_PUBLIC_COGNITO_CLIENT_ID ?? '',
        identityPoolId: process.env.EXPO_PUBLIC_COGNITO_IDENTITY_POOL_ID,
      },
    },
    API: {
      GraphQL: {
        endpoint: apiUrl,
        region: process.env.EXPO_PUBLIC_AWS_REGION ?? 'us-east-1',
        defaultAuthMode: 'userPool',
      },
    },
  });
}

export { IS_LOCAL };

export async function getGraphQLHeaders(): Promise<Record<string, string>> {
  if (IS_LOCAL) {
    const token = await getLocalToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }
  return {};
}
