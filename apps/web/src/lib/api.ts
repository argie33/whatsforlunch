import { setLoading, setError, showToast, getState, setState } from './store';
import type { Item, Container, User } from './store';

const API_BASE = '/api';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

async function apiCall<T>(method: string, endpoint: string, body?: any): Promise<T> {
  try {
    setLoading(true);
    setError(null);

    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${API_BASE}${endpoint}`, options);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `API error: ${response.status}`);
    }

    const result: ApiResponse<T> = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Unknown error occurred');
    }

    return result.data as T;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An error occurred';
    setError(message);
    showToast(message, 'error');
    throw error;
  } finally {
    setLoading(false);
  }
}

export async function fetchItems(): Promise<Item[]> {
  return apiCall<Item[]>('GET', '/items');
}

export async function createItem(item: Omit<Item, 'id'>): Promise<Item> {
  const newItem = await apiCall<Item>('POST', '/items', item);
  const state = getState();
  setState({ items: [...state.items, newItem] });
  showToast(`${newItem.name} added successfully`, 'success');
  return newItem;
}

export async function updateItemApi(id: string, updates: Partial<Item>): Promise<Item> {
  const updated = await apiCall<Item>('PUT', `/items/${id}`, updates);
  const state = getState();
  setState({
    items: state.items.map((i) => (i.id === id ? updated : i)),
  });
  showToast('Item updated', 'success');
  return updated;
}

export async function deleteItem(id: string): Promise<void> {
  await apiCall<void>('DELETE', `/items/${id}`);
  const state = getState();
  setState({ items: state.items.filter((i) => i.id !== id) });
  showToast('Item deleted', 'success');
}

export async function fetchContainers(): Promise<Container[]> {
  return apiCall<Container[]>('GET', '/containers');
}

export async function createContainer(container: Omit<Container, 'id'>): Promise<Container> {
  const newContainer = await apiCall<Container>('POST', '/containers', container);
  const state = getState();
  setState({ containers: [...state.containers, newContainer] });
  showToast(`${newContainer.name} added successfully`, 'success');
  return newContainer;
}

export async function updateContainerApi(
  id: string,
  updates: Partial<Container>,
): Promise<Container> {
  const updated = await apiCall<Container>('PUT', `/containers/${id}`, updates);
  const state = getState();
  setState({
    containers: state.containers.map((c) => (c.id === id ? updated : c)),
  });
  showToast('Container updated', 'success');
  return updated;
}

export async function deleteContainer(id: string): Promise<void> {
  await apiCall<void>('DELETE', `/containers/${id}`);
  const state = getState();
  setState({ containers: state.containers.filter((c) => c.id !== id) });
  showToast('Container deleted', 'success');
}

export async function fetchUser(): Promise<User> {
  return apiCall<User>('GET', '/user');
}

export async function updateUserApi(updates: Partial<User>): Promise<User> {
  const updated = await apiCall<User>('PUT', '/user', updates);
  setState({ user: updated });
  showToast('Profile updated', 'success');
  return updated;
}

export async function uploadImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);

  try {
    setLoading(true);
    const response = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Upload failed');
    }

    const result = await response.json();
    return result.url || result.path;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Upload failed';
    setError(message);
    showToast(message, 'error');
    throw error;
  } finally {
    setLoading(false);
  }
}

export async function recognizeFood(imageUrl: string): Promise<any> {
  return apiCall('POST', '/ai/recognize', { imageUrl });
}

export async function getRecipes(query?: string): Promise<any[]> {
  const endpoint = query ? `/recipes?q=${encodeURIComponent(query)}` : '/recipes';
  return apiCall('GET', endpoint);
}

export async function getRecipe(id: string): Promise<any> {
  return apiCall('GET', `/recipes/${id}`);
}

export async function getAnalytics(): Promise<any> {
  return apiCall('GET', '/analytics');
}

export async function getAchievements(): Promise<any[]> {
  return apiCall('GET', '/achievements');
}
