# Local Testing Guide

This document explains how to set up and test WhatsFresh locally without deploying to AWS.

## Prerequisites

- Node.js 20.18+ (`mise install` or `nvm use`)
- pnpm 9+ (`npm install -g pnpm@9`)
- Docker (for local DynamoDB)

## Setup

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Start Local DynamoDB

Use DynamoDB Local for testing:

```bash
# Option A: Docker (recommended)
docker run -d --name dynamodb \
  -p 8000:8000 \
  amazon/dynamodb-local

# Option B: Download JAR and run locally
# See: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DynamoDBLocal.DownloadingAndRunning.html
```

DynamoDB Local will run on `http://localhost:8000`.

### 3. Create Tables

Run the seeding script (TODO: create):

```bash
npm run db:seed:local
```

Or manually create tables via AWS CLI:

```bash
# Set up AWS CLI to use local DynamoDB
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export AWS_DEFAULT_REGION=us-west-2

# Create main table with GSIs
aws dynamodb create-table \
  --table-name WFL-Main-dev \
  --attribute-definitions \
    AttributeName=PK,AttributeType=S \
    AttributeName=SK,AttributeType=S \
    AttributeName=GSI1PK,AttributeType=S \
    AttributeName=GSI1SK,AttributeType=S \
  --key-schema AttributeName=PK,KeyType=HASH AttributeName=SK,KeyType=RANGE \
  --global-secondary-indexes \
    IndexName=GSI1,Keys=[{AttributeName=GSI1PK,KeyType=HASH},{AttributeName=GSI1SK,KeyType=RANGE}],Projection={ProjectionType=ALL},ProvisionedThroughput={ReadCapacityUnits=5,WriteCapacityUnits=5} \
  --billing-mode PAY_PER_REQUEST \
  --endpoint-url http://localhost:8000
```

## Testing Resolvers Locally

### Unit Tests

Test resolvers without DynamoDB:

```bash
npm run test:resolvers --workspace=@wfl/services
```

Example test:

```typescript
import { queryMe } from './resolvers/Query.me';
import { createMockEvent, createMockProfile } from '@wfl/services/test-helpers';

test('Query.me returns user profile', async () => {
  const userId = 'user-123';
  const event = createMockEvent({}, userId);
  
  // Mock DynamoDB response
  const mockDdb = {
    get: jest.fn().mockResolvedValue({ Item: createMockProfile({ id: userId }) }),
  };

  const result = await queryMe(event);
  expect(result.id).toBe(userId);
});
```

### Integration Tests (with Local DynamoDB)

Test resolvers against real local DynamoDB:

```bash
npm run test:integration --workspace=@wfl/services
```

Example:

```typescript
import { createItem } from './resolvers/Mutation.createItem';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

let ddb: DynamoDBDocumentClient;

beforeAll(async () => {
  // Connect to local DynamoDB
  ddb = DynamoDBDocumentClient.from(
    new DynamoDB({ endpoint: 'http://localhost:8000', ... })
  );
  
  // Create test table
  await setupTestTable(ddb);
});

test('createItem creates item in local DynamoDB', async () => {
  const event = createMockEvent({
    input: {
      householdId: 'hh-123',
      foodType: 'cooked_chicken',
      ...
    },
  });

  const result = await createItem(event);
  expect(result.id).toBeDefined();
  expect(result.foodType).toBe('cooked_chicken');
});

afterAll(async () => {
  await teardownTestTable(ddb);
});
```

## Testing GraphQL Queries & Mutations

### Apollo Test Client (when AppSync is up locally)

```typescript
import { ApolloClient, gql } from '@apollo/client';

const client = new ApolloClient({
  uri: 'http://localhost:4000/graphql', // local AppSync mock
  // ...
});

test('Query.me works', async () => {
  const result = await client.query({
    query: gql`
      query Me {
        me {
          id
          email
          displayName
        }
      }
    `,
  });

  expect(result.data.me.email).toBeDefined();
});
```

## Testing the Mobile App Locally

### Metro Dev Server (RN)

```bash
cd apps/mobile
npx expo start
```

Then:
- Press `i` to open iOS simulator
- Press `a` to open Android emulator
- Press `j` to open debugger

### Point to Local Backend

In `apps/mobile/.env.local`:

```
EXPO_PUBLIC_API_URL=http://localhost:4000/graphql
EXPO_PUBLIC_WS_URL=ws://localhost:4000/graphql
```

### Test Flows Manually

1. Open app in simulator
2. Create a test account (local Cognito mock)
3. Add an item via scanner
4. Check that it appears in dashboard
5. Mark as eaten
6. Verify status change

## Type Generation from Schema

Generate TypeScript types from GraphQL schema:

```bash
pnpm run codegen --workspace=@wfl/mobile
```

This generates types in `apps/mobile/src/generated/graphql.ts` used by Apollo Client.

## Schema Validation Locally

Validate GraphQL schema without deploying:

```bash
npx graphql-core-count-schema infra/cdk/lib/appsync/schema.graphql
```

Lint schema:

```bash
npx graphql-inspector inspect infra/cdk/lib/appsync/schema.graphql
```

## Debugging

### DynamoDB Local Dashboard

View and query local DynamoDB:

```bash
# Install DynamoDB GUI
npm install -g dynamodb-admin

# Set endpoint
export DYNAMODB_ENDPOINT=http://localhost:8000

# Open browser
dynamodb-admin
```

### Resolver Debugging

Add console logs to resolvers:

```javascript
console.log('Event:', JSON.stringify(event, null, 2));
console.log('Context:', context.identity.claims);
```

Logs appear in Jest test output or Lambda CloudWatch.

### Network Mocking

Mock network calls in tests:

```typescript
import { rest } from 'msw';
import { setupServer } from 'msw/node';

const server = setupServer(
  rest.post('http://localhost:4000/graphql', (req, res, ctx) => {
    return res(ctx.json({ data: { me: { id: 'user-123' } } }));
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

## CI/CD Local Preview

Run the same checks CI will run:

```bash
# Type checking
pnpm typecheck

# Linting
pnpm lint

# Tests
pnpm test

# Build
pnpm build
```

All should pass before pushing.

## Troubleshooting

### DynamoDB Connection Refused

```bash
# Check if DynamoDB Local is running
docker ps | grep dynamodb

# If not, restart
docker restart dynamodb
```

### Type Generation Fails

```bash
# Ensure schema is valid
npx graphql-core-count-schema infra/cdk/lib/appsync/schema.graphql

# Regenerate types
rm -rf apps/mobile/src/generated
pnpm run codegen --workspace=@wfl/mobile
```

### Tests Timeout

```bash
# Increase Jest timeout for integration tests
jest --testTimeout=10000

# Or in jest.config.js
testTimeout: 10000
```

## What's Testable Locally

✅ **Already testable:**
- Resolver unit tests (mocked DynamoDB)
- Resolver integration tests (local DynamoDB)
- Schema validation
- Type generation
- Mobile app in simulator
- GraphQL queries against mock server

⏳ **Needs AWS (Phase B+):**
- Cognito auth flow (use mock provider locally)
- S3 photo upload (use localstack)
- Lambda invocation (use SAM local)
- AppSync real-time subscriptions (possible locally with mock)

## Next Steps

1. Run `pnpm install` to install all deps
2. Start DynamoDB Local: `docker run -d -p 8000:8000 amazon/dynamodb-local`
3. Seed test data: `npm run db:seed:local`
4. Run resolver tests: `pnpm test`
5. Start mobile app: `cd apps/mobile && npx expo start`
6. Test manually in simulator

---

For AWS-specific testing (post-Phase A), see [docs/14_LOCAL_DEV.md](14_LOCAL_DEV.md).
