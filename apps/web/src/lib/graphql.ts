import { getToken } from './auth';

const GRAPHQL_ENDPOINT = '/api/graphql';

export interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

export async function gql<T = any>(query: string, variables?: Record<string, any>): Promise<T> {
  const token = getToken();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, variables }),
  });

  const result: GraphQLResponse<T> = await response.json();

  if (result.errors) {
    const message = result.errors[0].message || 'GraphQL error';
    throw new Error(message);
  }

  if (!result.data) {
    throw new Error('No data returned from GraphQL');
  }

  return result.data;
}

// Common queries (matched to actual backend schema)
export const queries = {
  getProfile: `query {
    getProfile {
      id
      email
      displayName
      timeZone
      subscriptionTier
    }
  }`,

  listHouseholds: `query {
    listHouseholds {
      id
      name
      memberCount
    }
  }`,

  listItems: `query ListItems($householdId: UUID!) {
    listItems(householdId: $householdId) {
      id
      householdId
      foodName
      category
      storageLocation
      expiryAt
      storedAt
      status
      photoUrl
      quantityText
      quantityValue
      quantityUnit
      notes
      priceUsd
      tossedAt
    }
  }`,

  getItem: `query GetItem($id: UUID!, $householdId: UUID!) {
    getItem(id: $id, householdId: $householdId) {
      id
      foodName
      category
      storageLocation
      expiryAt
      storedAt
      status
      notes
      quantityText
    }
  }`,

  listContainers: `query ListContainers($householdId: UUID!) {
    listContainers(householdId: $householdId) {
      id
      nickname
      imageUrl
      claimedAt
    }
  }`,

  listShoppingItems: `query ListShoppingItems($householdId: UUID!) {
    listShoppingItems(householdId: $householdId) {
      id
      name
      quantity
      category
      purchasedAt
    }
  }`,

  getRecommendations: `query GetRecommendations($householdId: UUID!) {
    getRecommendations(householdId: $householdId) {
      id
      name
      ingredients
    }
  }`,

  getHouseholdAnalytics: `query GetAnalytics($householdId: UUID!) {
    getHouseholdAnalytics(householdId: $householdId) {
      totalItems
      wastedItems
      wastedValue
      categoriesBreakdown {
        category
        count
      }
    }
  }`,

  listHouseholdMembers: `query ListMembers($householdId: UUID!) {
    listHouseholdMembers(householdId: $householdId) {
      userId
      displayName
      role
      joinedAt
    }
  }`,
};

export const mutations = {
  createItem: `mutation CreateItem($input: CreateItemInput!) {
    createItem(input: $input) {
      id
      foodName
      category
      status
      expiryAt
    }
  }`,

  updateItem: `mutation UpdateItem($input: UpdateItemInput!) {
    updateItem(input: $input) {
      id
      foodName
      expiryAt
      status
    }
  }`,

  deleteItem: `mutation DeleteItem($id: UUID!, $householdId: UUID!) {
    deleteItem(id: $id, householdId: $householdId)
  }`,

  markItemEaten: `mutation MarkItemEaten($id: UUID!, $householdId: UUID!) {
    markItemEaten(id: $id, householdId: $householdId) {
      id
      status
    }
  }`,
};
