import { useEffect, useState, useCallback } from 'react';
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
    setState((prev) => ({ ...prev, status: 'loading' }));
    getCurrentUser().then((user) => {
      setState((prev) => ({
        ...prev,
        status: user ? 'authenticated' : 'unauthenticated',
        user: user ?? undefined,
      }));
    });
  }, []);

  useEffect(() => {
    setState((prev) => ({ ...prev, refresh: check }));
  }, [check]);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    check();

    import('@aws-amplify/core')
      .then(({ Hub }) => {
        unlisten = Hub.listen('auth', ({ payload }) => {
          if (
            payload.event === 'signedIn' ||
            payload.event === 'signInWithRedirect' ||
            payload.event === 'signedOut' ||
            payload.event === 'tokenRefresh'
          ) {
            check();
          }
        });
      })
      .catch(() => {});

    return () => {
      unlisten?.();
    };
  }, [check]);

  return state;
}
