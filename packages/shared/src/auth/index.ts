// Public auth API

export * from './cognito';
export * from './magicLink';
export * from './socialSignIn';

export interface SignInRequest {
  email: string;
}

export interface AuthVerificationRequest {
  token: string;
}

export interface Profile {
  id: string;
  email: string;
  displayName: string;
  photoUrl?: string;
  timeZone: string;
  units: string;
  locale: string;
  dietaryPreferences: string[];
  cuisinePreferences: string[];
  allergies: string[];
  subscriptionTier: 'free' | 'premium' | 'family';
  aiQuotaUsedToday: number;
  aiQuotaResetAt: string;
  createdAt: string;
  updatedAt: string;
}
