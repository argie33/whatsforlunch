// Social Sign-In helper functions for Apple and Google

import { CognitoConfig } from './cognito';

export interface AppleSignInResponse {
  identityToken: string;
  userIdentifier: string;
  user?: {
    name?: {
      firstName?: string;
      lastName?: string;
    };
    email?: string;
  };
}

export interface GoogleSignInResponse {
  idToken: string;
  user: {
    id: string;
    email?: string;
    name?: string;
    photoUrl?: string;
  };
}

/**
 * Exchange Apple Sign-In token for AWS Cognito credentials
 * Called from mobile app after Apple authentication
 */
export async function signInWithApple(
  response: AppleSignInResponse,
  config: CognitoConfig
): Promise<void> {
  // Mobile app will implement the actual token exchange using
  // AWS Amplify Auth.signIn() with provider: 'apple'
  // This function is a placeholder for client-side logic

  if (!response.identityToken) {
    throw new Error('Apple Sign-In failed: no identity token');
  }

  // The identityToken is passed to Cognito via federated identity
  // AWS handles the JWT validation and user creation/linking
}

/**
 * Exchange Google Sign-In token for AWS Cognito credentials
 * Called from mobile app after Google authentication
 */
export async function signInWithGoogle(
  response: GoogleSignInResponse,
  config: CognitoConfig
): Promise<void> {
  // Mobile app will implement the actual token exchange using
  // AWS Amplify Auth.signIn() with provider: 'google'
  // This function is a placeholder for client-side logic

  if (!response.idToken) {
    throw new Error('Google Sign-In failed: no ID token');
  }

  // The idToken is passed to Cognito via federated identity
  // AWS handles the JWT validation and user creation/linking
}

/**
 * Re-authenticate with Apple if needed (Apple invalidates tokens after 60 days)
 */
export function handleAppleReAuthentication(error: any): boolean {
  // Check if error indicates Apple token has expired or been revoked
  // This is a platform-specific concern handled by the mobile app
  return error?.code === 'APPLE_TOKEN_EXPIRED' || error?.message?.includes('apple');
}

/**
 * Helper to extract user info from Apple Sign-In response
 */
export function getAppleUserInfo(response: AppleSignInResponse) {
  return {
    email: response.user?.email,
    displayName: [response.user?.name?.firstName, response.user?.name?.lastName]
      .filter(Boolean)
      .join(' '),
  };
}

/**
 * Helper to extract user info from Google Sign-In response
 */
export function getGoogleUserInfo(response: GoogleSignInResponse) {
  return {
    email: response.user.email,
    displayName: response.user.name,
    photoUrl: response.user.photoUrl,
  };
}
