import jwt from 'jsonwebtoken';
import { v4 as uuid } from 'uuid';
import { put, get } from './db.js';

// SECURITY: Require explicit JWT secret in production, fail loudly if not set
const SECRET =
  process.env.JWT_SECRET ??
  (() => {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('CRITICAL: JWT_SECRET environment variable must be set in production');
    }
    console.warn(
      '[SECURITY] Using default JWT_SECRET for development only. Set JWT_SECRET env var for production.',
    );
    return 'dev-only-insecure-secret-change-in-prod';
  })();

// SECURITY: Short token TTL reduces window for token theft/misuse
const TOKEN_TTL = 60 * 60; // 1 hour (down from 7 days)
const REFRESH_TOKEN_TTL = 60 * 60 * 24 * 30; // 30 days for refresh tokens (separate concern)

export interface LocalUser {
  id: string;
  email: string;
}

// SECURITY: Basic email validation to prevent injection and invalid data
function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  if (email.length > 254) return false; // RFC 5321
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function signToken(user: LocalUser): string {
  return jwt.sign({ sub: user.id, email: user.email }, SECRET, { expiresIn: TOKEN_TTL });
}

export function verifyToken(token: string): LocalUser | null {
  try {
    const payload = jwt.verify(token, SECRET) as { sub: string; email: string };
    return { id: payload.sub, email: payload.email };
  } catch {
    return null;
  }
}

export function extractUser(authHeader?: string): LocalUser | null {
  if (!authHeader?.startsWith('Bearer ')) return null;
  return verifyToken(authHeader.slice(7));
}

export async function signInWithEmail(email: string): Promise<{ token: string; userId: string }> {
  // SECURITY: Validate email format to prevent injection and invalid data
  if (!isValidEmail(email)) {
    throw new Error('Invalid email format');
  }

  // Find or create user profile
  const profilePK = `USER#${email}`;
  let profile = await get(profilePK, 'PROFILE');

  if (!profile) {
    const userId = uuid();
    const now = new Date().toISOString();
    profile = {
      PK: profilePK,
      SK: 'PROFILE',
      id: userId,
      email,
      entityType: 'Profile',
      displayName: email.split('@')[0],
      timeZone: 'America/New_York',
      units: 'imperial',
      locale: 'en-US',
      dietaryPreferences: [],
      cuisinePreferences: [],
      allergies: [],
      subscriptionTier: 'free',
      aiQuotaUsedToday: 0,
      aiQuotaResetAt: now,
      createdAt: now,
      updatedAt: now,
      _version: 1,
      _lastChangedAt: Date.now(),
    };

    // Also create a default household
    const householdId = uuid();
    const household = {
      PK: `HOUSEHOLD#${householdId}`,
      SK: 'META',
      id: householdId,
      entityType: 'Household',
      name: 'My Home',
      ownerId: userId,
      memberCount: 1,
      createdAt: now,
      updatedAt: now,
      _version: 1,
      _lastChangedAt: Date.now(),
    };

    profile.defaultHouseholdId = householdId;

    // Member entry
    const member = {
      PK: `HOUSEHOLD#${householdId}`,
      SK: `MEMBER#${userId}`,
      entityType: 'HouseholdMember',
      userId,
      householdId,
      role: 'owner',
      displayName: profile.displayName,
      joinedAt: now,
    };

    await Promise.all([put(profile), put(household), put(member)]);
    console.log(`[local-mock] Created new user: ${email} (id: ${userId})`);
  }

  const token = signToken({ id: profile.id as string, email });
  return { token, userId: profile.id as string };
}
