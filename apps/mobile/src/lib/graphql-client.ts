import { ApolloClient, InMemoryCache, HttpLink, ApolloLink, gql } from '@apollo/client';
import {
  NetworkRetry,
  RequestDeduplicator,
  LocalCache,
  getErrorMessage,
} from './network-resilience';

const API_URL = process.env['EXPO_PUBLIC_APPSYNC_URL'] ?? '';
const AUTH_MODE = process.env['EXPO_PUBLIC_AUTH_MODE'] ?? 'cognito';

// ─── Enhanced GraphQL Request with Retry ──────────────────────────────────────

export async function graphQLRequest<T = any>(
  query: string,
  variables?: Record<string, any>,
  options: {
    enableDeduplication?: boolean;
    enableCache?: boolean;
    cacheTtlMs?: number;
    timeoutMs?: number;
    maxRetries?: number;
  } = {},
): Promise<T> {
  const {
    enableDeduplication = true,
    enableCache = false,
    cacheTtlMs = 5 * 60 * 1000,
    timeoutMs = 10000,
    maxRetries = 3,
  } = options;

  // Create cache key
  const cacheKey = `gql:${query.slice(0, 20)}:${JSON.stringify(variables)}`;

  // Check cache first (if enabled)
  if (enableCache) {
    const cached = LocalCache.getInstance().get<T>(cacheKey);
    if (cached) {
      console.log('[GraphQL] Cache hit');
      return cached;
    }
  }

  // Deduplicate identical requests (if enabled)
  const deduplicator = RequestDeduplicator.getInstance();
  const execute = async (): Promise<T> => {
    return NetworkRetry.withRetry(() => performRequest<T>(query, variables), {
      timeoutMs,
      maxRetries,
      onRetry: (attempt, error) => {
        console.warn(`[GraphQL] Retry ${attempt}/${maxRetries} - ${error.message}`);
      },
    });
  };

  const result = enableDeduplication
    ? await deduplicator.execute(cacheKey, execute)
    : await execute();

  // Cache result (if enabled)
  if (enableCache) {
    LocalCache.getInstance().set(cacheKey, result as any, cacheTtlMs);
  }

  return result;
}

/**
 * Perform a single GraphQL request without retries or caching.
 * Used internally by graphQLRequest().
 */
async function performRequest<T = any>(query: string, variables?: Record<string, any>): Promise<T> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (AUTH_MODE === 'local') {
    const { getLocalToken } = require('./local-auth');
    const token = await getLocalToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
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
    const error = json.errors[0];
    console.error('[GraphQL] Error response:', error);
    throw new Error(error?.message ?? 'GraphQL error');
  }

  return json.data as T;
}

// ─── Apollo Client with Enhanced Auth + Error Handling ────────────────────────

const authLink = new ApolloLink((operation, forward) => {
  return new Promise<any>((resolve) => {
    if (AUTH_MODE === 'local') {
      const { getLocalToken } = require('./local-auth');
      getLocalToken().then((token: string | null) => {
        operation.setContext(({ headers }: any) => ({
          headers: {
            ...headers,
            Authorization: token ? `Bearer ${token}` : '',
          },
        }));
        resolve(forward(operation));
      });
    } else {
      // In Cognito mode, auth is handled by Amplify middleware (not this link)
      resolve(forward(operation));
    }
  }).then((observable) => observable) as any;
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
      errorPolicy: 'all',
    },
  },
});

/**
 * Unified GraphQL mutation/query executor that works with both local and AWS.
 * - For local mode: uses fetch-based graphQLRequest
 * - For AWS mode: uses Apollo client
 */
export async function executeGraphQL<T = any>(
  queryString: string,
  variables?: Record<string, any>,
  options: {
    enableDeduplication?: boolean;
    enableCache?: boolean;
    cacheTtlMs?: number;
    timeoutMs?: number;
    maxRetries?: number;
  } = {},
): Promise<T> {
  if (AUTH_MODE === 'local') {
    // Use fetch-based implementation for local API
    return graphQLRequest<T>(queryString, variables, options);
  }

  // Use Apollo client for AWS/Cognito
  const apolloQuery = gql(queryString);
  try {
    const result = await apolloClient.query({
      query: apolloQuery,
      variables,
      fetchPolicy: 'network-only',
    });
    return result.data as T;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'GraphQL error';
    throw new Error(message);
  }
}
