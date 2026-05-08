// Simple client-side state management for the app
// In a real app, this would be Redux, Zustand, or similar

export interface Item {
  id: string;
  name: string;
  emoji: string;
  status: 'fresh' | 'soon' | 'urgent' | 'expired';
  days: number;
  container: string;
  purchased: string;
  expires: string;
  quantity: number;
  notes?: string;
}

export interface Container {
  id: string;
  name: string;
  emoji: string;
  items: number;
  temp?: string;
  status: 'optimal' | 'warm' | 'cold';
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

export interface AppState {
  user: User | null;
  items: Item[];
  containers: Container[];
  loading: boolean;
  error: string | null;
  toast: { message: string; type: 'success' | 'error' | 'info' | 'warning' } | null;
}

// Default state
const defaultState: AppState = {
  user: null,
  items: [],
  containers: [],
  loading: false,
  error: null,
  toast: null,
};

// Global state (in browser)
if (typeof window !== 'undefined') {
  (window as any).__appState = (window as any).__appState || defaultState;
}

export function getState(): AppState {
  if (typeof window !== 'undefined') {
    return (window as any).__appState || defaultState;
  }
  return defaultState;
}

export function setState(updates: Partial<AppState>) {
  if (typeof window !== 'undefined') {
    (window as any).__appState = { ...getState(), ...updates };
    // Dispatch custom event for reactive updates
    window.dispatchEvent(new CustomEvent('statechange', { detail: getState() }));
  }
}

export function setLoading(loading: boolean) {
  setState({ loading });
}

export function setError(error: string | null) {
  setState({ error });
}

export function showToast(
  message: string,
  type: 'success' | 'error' | 'info' | 'warning' = 'info',
) {
  setState({ toast: { message, type } });
  setTimeout(() => {
    setState({ toast: null });
  }, 3000);
}

export function addItem(item: Item) {
  const state = getState();
  setState({ items: [...state.items, item] });
  showToast(`${item.name} added successfully`, 'success');
}

export function removeItem(id: string) {
  const state = getState();
  setState({ items: state.items.filter((i) => i.id !== id) });
  showToast('Item deleted', 'success');
}

export function updateItem(id: string, updates: Partial<Item>) {
  const state = getState();
  setState({
    items: state.items.map((i) => (i.id === id ? { ...i, ...updates } : i)),
  });
}

export function setUser(user: User | null) {
  setState({ user });
}

export function onStateChange(callback: (state: AppState) => void) {
  if (typeof window !== 'undefined') {
    window.addEventListener('statechange', (e: any) => {
      callback(e.detail);
    });
  }
}
