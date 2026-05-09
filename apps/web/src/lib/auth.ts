// Auth utilities for web app
const TOKEN_KEY = 'wfl_auth_token';
const USER_KEY = 'wfl_user';

export interface User {
  id: string;
  email: string;
  displayName?: string;
}

export interface AuthState {
  token: string | null;
  user: User | null;
  isLoading: boolean;
  error: string | null;
}

let authState: AuthState = {
  token: null,
  user: null,
  isLoading: false,
  error: null,
};

// Listeners for auth changes
const listeners: Set<(state: AuthState) => void> = new Set();

function notify() {
  listeners.forEach((fn) => fn(authState));
}

export function subscribe(fn: (state: AuthState) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getAuthState(): AuthState {
  return { ...authState };
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return authState.token || localStorage.getItem(TOKEN_KEY);
}

export function getUser(): User | null {
  if (typeof window === 'undefined') return null;
  return authState.user;
}

function setToken(token: string | null) {
  authState.token = token;
  if (typeof window !== 'undefined') {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  }
}

function setUser(user: User | null) {
  authState.user = user;
  if (typeof window !== 'undefined') {
    if (user) {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(USER_KEY);
    }
  }
}

function setError(error: string | null) {
  authState.error = error;
  notify();
}

function setLoading(loading: boolean) {
  authState.isLoading = loading;
  notify();
}

// Initialize from localStorage
export function initAuth() {
  if (typeof window === 'undefined') return;

  const token = localStorage.getItem(TOKEN_KEY);
  const userJson = localStorage.getItem(USER_KEY);

  if (token) {
    authState.token = token;
    notify();
  }

  if (userJson) {
    try {
      authState.user = JSON.parse(userJson);
    } catch {}
  }
}

export async function login(email: string): Promise<{ token: string; userId: string }> {
  setLoading(true);
  setError(null);

  try {
    const response = await fetch('/api/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `mutation SignIn($email: String!) {
          signIn(email: $email) {
            token
            userId
          }
        }`,
        variables: { email },
      }),
    });

    const result = await response.json();

    if (result.errors) {
      throw new Error(result.errors[0].message || 'Login failed');
    }

    const { token, userId } = result.data.signIn;
    setToken(token);
    setUser({ id: userId, email });
    notify();

    return { token, userId };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Login failed';
    setError(message);
    throw error;
  } finally {
    setLoading(false);
  }
}

export async function logout() {
  setToken(null);
  setUser(null);
  authState.error = null;
  notify();
}

export function isAuthenticated(): boolean {
  return !!getToken();
}
