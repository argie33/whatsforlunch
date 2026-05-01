import { ApolloClient, InMemoryCache, HttpLink, ApolloLink } from '@apollo/client';
import { getLocalToken } from './local-auth';

const API_URL = process.env['EXPO_PUBLIC_APPSYNC_URL'] ?? 'http://localhost:4000/graphql';

export async function graphQLRequest<T = any>(
  query: string,
  variables?: Record<string, any>,
): Promise<T> {
  const token = await getLocalToken();
  const headers: HeadersInit = {
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
    throw new Error(`GraphQL request failed: HTTP ${res.status}`);
  }

  const json = await res.json();
  if (json.errors?.length) {
    throw new Error(json.errors[0]?.message ?? 'GraphQL error');
  }

  return json.data as T;
}

// Apollo client with auth middleware
const authLink = new ApolloLink((operation, forward) => {
  getLocalToken().then((token) => {
    operation.setContext(({ headers }: any) => ({
      headers: {
        ...headers,
        Authorization: token ? `Bearer ${token}` : '',
      },
    }));
  });
  return forward(operation);
});

const httpLink = new HttpLink({
  uri: API_URL,
  credentials: 'include',
});

export const apolloClient = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-and-network',
    },
  },
});
