import { Amplify } from 'aws-amplify';
import Constants from 'expo-constants';

const awsConfig = {
  Auth: {
    region: process.env.EXPO_PUBLIC_AWS_REGION || 'us-east-1',
    userPoolId: process.env.EXPO_PUBLIC_COGNITO_USER_POOL_ID,
    userPoolWebClientId: process.env.EXPO_PUBLIC_COGNITO_CLIENT_ID,
    identityPoolId: process.env.EXPO_PUBLIC_COGNITO_IDENTITY_POOL_ID,
  },
  API: {
    graphql_endpoint: process.env.EXPO_PUBLIC_APPSYNC_URL,
    graphql_headers: async () => ({
      'Content-Type': 'application/json',
    }),
  },
};

Amplify.configure(awsConfig);
