import { useCurrentUser } from './useCurrentUser';
import { useHouseholdId } from './useHouseholdId';

export interface AuthIds {
  householdId: string | null;
  userId: string | null;
}

export function useAuthIds(): AuthIds {
  const { user } = useCurrentUser();
  const householdId = useHouseholdId();
  return {
    householdId,
    userId: user?.userId ?? null,
  };
}
