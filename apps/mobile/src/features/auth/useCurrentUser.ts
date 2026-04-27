import { useState, useEffect } from 'react';
import { getCurrentUser, type AuthUser } from './authService';

type State =
  | { status: 'loading' }
  | { status: 'authenticated'; user: AuthUser }
  | { status: 'unauthenticated' };

export function useCurrentUser(): State {
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    getCurrentUser().then(user => {
      if (cancelled) return;
      setState(user ? { status: 'authenticated', user } : { status: 'unauthenticated' });
    });
    return () => { cancelled = true; };
  }, []);

  return state;
}
