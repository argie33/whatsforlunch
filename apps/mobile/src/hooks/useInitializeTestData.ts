import { useEffect } from 'react';
import { useDatabase } from '@/db';
import { useAuthIds } from '@/features/auth';
import { initializeTestData } from '@/lib/test-data-init';

const isDev = __DEV__;

/**
 * Hook for explicit test data initialization.
 * Call this from a debug menu or settings screen if you need sample data.
 * Does NOT auto-initialize on app startup anymore—users should add their own data.
 */
export function useInitializeTestData() {
  const db = useDatabase();
  const { householdId, userId } = useAuthIds();

  const initializeTestData_ = async () => {
    if (!isDev || !householdId || !userId) {
      console.warn(
        '[Test Data] Cannot initialize: dev=',
        isDev,
        'hh=',
        householdId,
        'user=',
        userId,
      );
      return;
    }

    try {
      console.log('[Test Data] Initializing test data...');
      await initializeTestData(db, {
        householdId,
        userId,
        createContainers: true,
        createItems: true,
      });
      console.log('[Test Data] ✓ Test data initialized');
    } catch (err) {
      console.error('[Test Data] Failed:', err);
    }
  };

  // Return the function so it can be called explicitly (e.g., from a debug menu)
  return { initializeTestData: initializeTestData_ };
}
