// Cognito configuration and types

export interface CognitoConfig {
  userPoolId: string;
  clientId: string;
  region: string;
  identityPoolId?: string;
}

export interface AuthTokens {
  accessToken: string;
  idToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthChallenge {
  challengeName: string;
  session: string;
  parameters?: {
    destination?: string;
    [key: string]: any;
  };
}

export interface InitiateAuthResponse {
  challengeName?: string;
  session?: string;
  authenticationResult?: {
    accessToken: string;
    idToken: string;
    refreshToken: string;
    expiresIn: number;
  };
  [key: string]: any;
}

// Cognito custom auth flow
export const CUSTOM_AUTH_FLOW = 'ALLOW_CUSTOM_AUTH_USER_PASSWORD_AUTH';

// Token TTLs (should match backend config)
export const TOKEN_TTLS = {
  accessToken: 60 * 60 * 1000, // 60 minutes
  idToken: 60 * 60 * 1000, // 60 minutes
  refreshToken: 30 * 24 * 60 * 60 * 1000, // 30 days
};
