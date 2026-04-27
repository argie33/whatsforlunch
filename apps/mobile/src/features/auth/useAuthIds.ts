import { useCurrentUser } from './useCurrentUser';
import { useHouseholdId } from './useHouseholdId';

export interface AuthIds {
  householdId: string;
  userId: string;
}

// Returns stable IDs for WatermelonDB queries.
// Falls back to placeholder values so W6 screens work without real auth.
export function useAuthIds(): AuthIds {
  const { user } = useCurrentUser();
  const householdId = useHouseholdId();
  return {
    householdId: householdId ?? 'household_placeholder',
    userId: user?.userId ?? 'user_placeholder',
  };
}
