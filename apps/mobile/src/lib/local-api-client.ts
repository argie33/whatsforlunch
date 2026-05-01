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

// Queries and mutations for local testing
export const LIST_ITEMS_QUERY = `
  query ListItems($householdId: ID!) {
    listItems(householdId: $householdId) {
      id
      foodName
      storageLocation
      expiryAt
      category
      status
    }
  }
`;

export const CREATE_ITEM_MUTATION = `
  mutation CreateItem($input: CreateItemInput!) {
    createItem(input: $input) {
      id
      foodName
      storageLocation
      expiryAt
      category
    }
  }
`;

export const DELETE_ITEM_MUTATION = `
  mutation DeleteItem($householdId: ID!, $id: ID!) {
    deleteItem(householdId: $householdId, id: $id)
  }
`;

export async function getItemsFromAPI(householdId: string) {
  const data = await localGraphQLQuery<{ listItems: any[] }>(LIST_ITEMS_QUERY, { householdId });
  return data?.listItems ?? [];
}

export async function createItemOnAPI(input: {
  householdId: string;
  foodName: string;
  category: string;
  storageLocation: string;
  expiryAt: string;
}) {
  const data = await localGraphQLQuery<{ createItem: any }>(CREATE_ITEM_MUTATION, { input });
  return data?.createItem ?? null;
}

export async function deleteItemFromAPI(householdId: string, id: string) {
  const data = await localGraphQLQuery<{ deleteItem: boolean }>(DELETE_ITEM_MUTATION, {
    householdId,
    id,
  });
  return data?.deleteItem ?? false;
}
