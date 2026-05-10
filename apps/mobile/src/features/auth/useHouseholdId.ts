import { useState, useEffect } from 'react';
import { useDatabase } from '@/db';
import type { Household } from '@/db/models/Household';
import { useCurrentUser } from './useCurrentUser';
import { getLocalHouseholdId } from '@/lib/local-auth';

export function useHouseholdId(): string | null {
  const db = useDatabase();
  const { status } = useCurrentUser();
  const [householdId, setHouseholdId] = useState<string | null>(null);

  useEffect(() => {
    if (status !== 'authenticated') {
      setHouseholdId(null);
      return;
    }

    let sub: any = null;
    const isLocalApi = process.env.EXPO_PUBLIC_AUTH_MODE === 'local';
    if (isLocalApi) {
      getLocalHouseholdId()
        .then((id) => {
          if (id) setHouseholdId(id);
        })
        .catch(() => {
          sub = db
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
        });
    } else {
      sub = db
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
    }

    return () => {
      if (sub) sub.unsubscribe();
    };
  }, [db, status]);

  return householdId;
}
