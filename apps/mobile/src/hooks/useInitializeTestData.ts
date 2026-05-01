import { useEffect } from 'react';
import { useDatabase } from '@/db';
import { useAuthIds } from '@/features/auth';
import { initializeTestData } from '@/lib/test-data-init';

const isDev = __DEV__;

export function useInitializeTestData() {
  const db = useDatabase();
  const { householdId, userId } = useAuthIds();

  useEffect(() => {
    if (!isDev || !householdId || !userId) return;

    const initializeDevData = async () => {
      try {
        console.log('[Test Data] Initializing test data on app startup');
        await initializeTestData(db, {
          householdId,
          userId,
          createContainers: true,
          createItems: true,
        });
      } catch (err) {
        console.error('[Test Data] Failed to initialize test data:', err);
      }
    };

    initializeDevData();
  }, [db, householdId, userId]);
}
