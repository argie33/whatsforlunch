import { useState, useEffect } from 'react';
import { useDatabase } from '@/db';
import type { Household } from '@/db/models/Household';
import { IS_MOCK } from './authService';
import { useCurrentUser } from './useCurrentUser';

const MOCK_HOUSEHOLD_ID = 'household_placeholder';

export function useHouseholdId(): string | null {
  const db = useDatabase();
  const { status } = useCurrentUser();
  const [householdId, setHouseholdId] = useState<string | null>(null);

  useEffect(() => {
    if (status !== 'authenticated') {
      setHouseholdId(null);
      return;
    }

    if (IS_MOCK) {
      // Ensure the placeholder household row exists for local dev
      db.get<Household>('households')
        .query()
        .fetch()
        .then(async (rows) => {
          if (rows.length === 0) {
            await db.write(async () => {
              await db.get<Household>('households').create((h: any) => {
                h.cloudId = MOCK_HOUSEHOLD_ID;
                h.name = 'My Kitchen';
                h.ownerId = 'local-user-001';
                h.memberCount = 1;
                h.version = 1;
                h.lastChangedAt = Date.now();
              });
            });
          }
          setHouseholdId(MOCK_HOUSEHOLD_ID);
        })
        .catch(() => setHouseholdId(MOCK_HOUSEHOLD_ID));
      return;
    }

    const sub = db
      .get<Household>('households')
      .query()
      .observe()
      .subscribe({
        next: (rows) => {
          const active = rows.find((h) => !h.deletedAt);
          setHouseholdId(active?.cloudId ?? null);
        },
        error: () => setHouseholdId(null),
      });
    return () => sub.unsubscribe();
  }, [db, status]);

  return householdId;
}
