/**
 * Shim for `aws-amplify/api` (v6-style modular import) on top of installed
 * aws-amplify v5. In local-dev mode, callers always branch through
 * `executeGraphQL` from `@/lib/graphql-client`, so the AWS-mode `client.graphql`
 * path is never executed. This shim exists so Metro can resolve the import
 * at bundle time.
 */

import { graphQLRequest } from './graphql-client';

export interface GraphQLOptions {
  query: string;
  variables?: Record<string, unknown>;
  authMode?: string;
}

export interface GraphQLResult<T = unknown> {
  data: T;
  errors?: { message: string }[];
}

export interface GraphQLClient {
  graphql<T = unknown>(options: GraphQLOptions): Promise<GraphQLResult<T>>;
}

export function generateClient(): GraphQLClient {
  return {
    async graphql<T = unknown>(options: GraphQLOptions): Promise<GraphQLResult<T>> {
      const data = await graphQLRequest<T>(options.query, options.variables);
      return { data };
    },
  };
}
