import type { LocalUser } from './auth.js';
import { get, query } from './db.js';

/**
 * SECURITY: Authorization checks to prevent cross-household data access
 *
 * Every household-scoped operation MUST verify that the user is a member
 * of that household before proceeding. This is critical to prevent users
 * from accessing other households' data with a valid JWT token.
 */

export async function verifyHouseholdMembership(
  user: LocalUser,
  householdId: string,
): Promise<boolean> {
  try {
    const member = await get(`HOUSEHOLD#${householdId}`, `MEMBER#${user.id}`);
    return !!member;
  } catch {
    return false;
  }
}

export async function verifyHouseholdOwnership(
  user: LocalUser,
  householdId: string,
): Promise<boolean> {
  try {
    const household = await get(`HOUSEHOLD#${householdId}`, 'META');
    return household?.ownerId === user.id;
  } catch {
    return false;
  }
}

export async function verifyHouseholdOwnerOrAdmin(
  user: LocalUser,
  householdId: string,
): Promise<boolean> {
  try {
    const member = await get(`HOUSEHOLD#${householdId}`, `MEMBER#${user.id}`);
    if (!member) return false;
    return member.role === 'owner' || member.role === 'admin';
  } catch {
    return false;
  }
}

export async function requireHouseholdMembership(
  user: LocalUser,
  householdId: string,
): Promise<void> {
  const isMember = await verifyHouseholdMembership(user, householdId);
  if (!isMember) {
    throw new Error('Unauthorized: you are not a member of this household');
  }
}

export async function requireHouseholdOwnership(
  user: LocalUser,
  householdId: string,
): Promise<void> {
  const isOwner = await verifyHouseholdOwnership(user, householdId);
  if (!isOwner) {
    throw new Error('Unauthorized: you do not own this household');
  }
}

export async function requireHouseholdAdmin(user: LocalUser, householdId: string): Promise<void> {
  const isAdmin = await verifyHouseholdOwnerOrAdmin(user, householdId);
  if (!isAdmin) {
    throw new Error('Unauthorized: you do not have admin rights in this household');
  }
}
