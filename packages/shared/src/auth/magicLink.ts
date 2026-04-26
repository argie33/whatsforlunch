// Client-side magic link utilities for mobile app

export interface MagicLinkVerificationRequest {
  token: string;
  email: string;
}

export async function verifyMagicLink(token: string): Promise<void> {
  // This will be called by the mobile app after universal link opens
  // The token is passed to RespondToAuthChallenge
  if (!token || token.length === 0) {
    throw new Error('Invalid magic link token');
  }
}

export function extractTokenFromDeepLink(url: string): string | null {
  try {
    const urlObj = new URL(url);
    return urlObj.searchParams.get('token');
  } catch {
    return null;
  }
}
