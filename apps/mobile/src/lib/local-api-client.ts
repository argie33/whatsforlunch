/**
 * Simple GraphQL client for local dev API
 * Used when EXPO_PUBLIC_AUTH_MODE=local
 */
import { getLocalToken } from './local-auth';

const API_URL = process.env['EXPO_PUBLIC_APPSYNC_URL'] ?? 'http://localhost:4000/graphql';

export async function localGraphQLQuery<T = any>(
  query: string,
  variables?: Record<string, any>,
): Promise<T | null> {
  try {
    const token = await getLocalToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(API_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query, variables }),
    });

    if (!res.ok) {
      console.error(`[LocalAPI] HTTP ${res.status}`);
      return null;
    }

    const json = await res.json();
    if (json.errors?.length) {
      console.error('[LocalAPI]', json.errors[0]?.message);
      return null;
    }

    return json.data as T;
  } catch (e) {
    console.error('[LocalAPI] Request failed:', e);
    return null;
  }
}

// Simple queries for local testing
export const LIST_ITEMS_QUERY = `
  query ListItems($householdId: ID!) {
    listItems(householdId: $householdId) {
      id
      foodName
      storageLocation
      expiryAt
      category
    }
  }
`;

export async function getItemsFromAPI(householdId: string) {
  const data = await localGraphQLQuery<{ listItems: any[] }>(LIST_ITEMS_QUERY, { householdId });
  return data?.listItems ?? [];
}
