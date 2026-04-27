import jwt from 'jsonwebtoken';
import { v4 as uuid } from 'uuid';
import { put, get } from './db.js';

const SECRET = process.env.JWT_SECRET ?? 'local-dev-secret';
const TOKEN_TTL = 60 * 60 * 24 * 7; // 7 days

export interface LocalUser {
  id: string;
  email: string;
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
