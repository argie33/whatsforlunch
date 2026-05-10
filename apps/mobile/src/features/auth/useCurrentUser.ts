import { useEffect, useState, useCallback } from 'react';
import { Platform } from 'react-native';
import { getCurrentUser, type AuthUser } from './authService';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

export interface CurrentUser {
  status: AuthStatus;
  user?: AuthUser;
  refresh: () => void;
}

export function useCurrentUser(): CurrentUser {
  const [state, setState] = useState<CurrentUser>({
    status: 'loading',
    refresh: () => {},
  });

  const check = useCallback(() => {
    console.log('[useCurrentUser.check] Starting auth check...');
    setState((prev) => ({ ...prev, status: 'loading' }));
    getCurrentUser()
      .then((user) => {
        console.log('[useCurrentUser.check] Got user:', user ? `${user.email}` : 'null');
        setState((prev) => ({
          ...prev,
          status: user ? 'authenticated' : 'unauthenticated',
          user: user ?? undefined,
        }));
      })
      .catch((err) => {
        console.error('[useCurrentUser.check] Error:', err);
        setState((prev) => ({
          ...prev,
          status: 'unauthenticated',
          user: undefined,
        }));
      });
  }, []);

  useEffect(() => {
    setState((prev) => ({ ...prev, refresh: check }));
  }, [check]);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    check();

    // Only listen to Amplify events on native platforms
    if (Platform.OS !== 'web') {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, global-require
        const { Hub } = require('@aws-amplify/core') as any;
        unlisten = Hub.listen('auth', ({ payload }: any) => {
          if (
            payload.event === 'signedIn' ||
            payload.event === 'signInWithRedirect' ||
            payload.event === 'signedOut' ||
            payload.event === 'tokenRefresh'
          ) {
            check();
          }
        });
      } catch {
        // Amplify not available
      }
    }

    return () => {
      unlisten?.();
    };
  }, [check]);

  return state;
}
