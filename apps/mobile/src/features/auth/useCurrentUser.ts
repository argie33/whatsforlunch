import { useEffect, useState } from 'react';
import { getCurrentUser, AuthUser } from './authService';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

export interface CurrentUser {
  status: AuthStatus;
  user?: AuthUser;
}

export function useCurrentUser(): CurrentUser {
  const [state, setState] = useState<CurrentUser>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    getCurrentUser().then((user) => {
      if (!cancelled) {
        setState(user ? { status: 'authenticated', user } : { status: 'unauthenticated' });
      }
    });
    return () => { cancelled = true; };
  }, []);

  return state;
}
