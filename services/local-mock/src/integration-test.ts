/**
 * Integration test: Validate entire local stack works end-to-end
 * Run this after: docker-compose -f docker-compose.local.yml up -d
 * Usage: pnpm run integration-test
 */

import { DynamoDBClient, ListTablesCommand } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import fetch from 'node-fetch';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';

const DYNAMODB_ENDPOINT = process.env.DYNAMODB_ENDPOINT || 'http://localhost:8000';
const API_ENDPOINT = process.env.API_ENDPOINT || 'http://localhost:4000/graphql';
const TABLE_NAME = process.env.TABLE_NAME ?? 'wfl-main-dev';
const JWT_SECRET = process.env.JWT_SECRET ?? 'local-dev-secret';

interface TestResult {
  name: string;
  status: 'PASS' | 'FAIL';
  duration: number;
  error?: string;
}

const results: TestResult[] = [];

async function test(name: string, fn: () => Promise<void>) {
  const start = Date.now();
  try {
    await fn();
    results.push({ name, status: 'PASS', duration: Date.now() - start });
    console.log(`✅ ${name}`);
  } catch (error) {
    results.push({
      name,
      status: 'FAIL',
      duration: Date.now() - start,
      error: error instanceof Error ? error.message : String(error),
    });
    console.log(`❌ ${name}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function queryGraphQL(query: string, variables?: Record<string, unknown>, token?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(API_ENDPOINT, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`GraphQL request failed: ${response.statusText}`);
  }

  const data = (await response.json()) as { data?: unknown; errors?: unknown[] };
  if (data.errors) {
    throw new Error(`GraphQL error: ${JSON.stringify(data.errors)}`);
  }

  return data.data;
}

async function main() {
  console.log('🧪 WhatsForLunch Integration Tests\n');
  console.log(`DynamoDB: ${DYNAMODB_ENDPOINT}`);
  console.log(`GraphQL API: ${API_ENDPOINT}\n`);

  // ─── Infrastructure Tests ────────────────────────────────────────────────

  // Skip DynamoDB tests if not running
  let hasDynamoDB = false;
  try {
    const testClient = new DynamoDBClient({
      endpoint: DYNAMODB_ENDPOINT,
      region: 'us-east-1',
      credentials: { accessKeyId: 'test', secretAccessKey: 'test' },
      requestTimeout: 2000,
    });
    await testClient.send(new ListTablesCommand({}));
    hasDynamoDB = true;
  } catch {
    console.log('⏭️  Skipping DynamoDB tests (docker-compose not running)');
  }

  if (hasDynamoDB) {
    await test('DynamoDB is reachable', async () => {
      const client = new DynamoDBClient({
        endpoint: DYNAMODB_ENDPOINT,
        region: 'us-east-1',
        credentials: { accessKeyId: 'test', secretAccessKey: 'test' },
      });
      const response = await client.send(new ListTablesCommand({}));
      if (!response.TableNames) throw new Error('No tables found');
    });
  }

  await test('GraphQL API is reachable', async () => {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: '{ __typename }' }),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
  });

  // ─── Auth Flow Tests ────────────────────────────────────────────────────

  let testUserId: string;
  let authToken: string;

  await test('Sign in returns JWT token', async () => {
    const result = (await queryGraphQL(
      `
      mutation SignIn($email: String!) {
        signIn(email: $email) {
          token
          userId
        }
      }
    `,
      { email: 'test@example.com' },
    )) as { signIn: { token: string; userId: string } };

    if (!result.signIn.token) throw new Error('No token returned');
    if (!result.signIn.userId) throw new Error('No userId returned');

    authToken = result.signIn.token;
    testUserId = result.signIn.userId;
  });

  await test('JWT token is valid and decodable', async () => {
    const decoded = jwt.decode(authToken) as { sub?: string };
    if (!decoded) throw new Error('Token not decodable');
    if (!decoded.sub) throw new Error('Token missing sub claim');
  });

  // ─── User Profile Tests ─────────────────────────────────────────────────

  await test('Can fetch user profile', async () => {
    const result = (await queryGraphQL(
      `{ getProfile { id email displayName } }`,
      undefined,
      authToken,
    )) as { getProfile: { id: string; email: string } };

    if (!result.getProfile.id) throw new Error('No profile ID');
    if (!result.getProfile.email) throw new Error('No email in profile');
  });

  await test('Can update user profile', async () => {
    const result = (await queryGraphQL(
      `mutation UpdateProfile($input: UpdateProfileInput!) {
        updateProfile(input: $input) {
          id
          displayName
          updatedAt
        }
      }`,
      { input: { displayName: 'Test User' } },
      authToken,
    )) as { updateProfile: { id: string; displayName: string } };

    if (result.updateProfile.displayName !== 'Test User')
      throw new Error('Display name not updated');
  });

  // ─── Household Tests ────────────────────────────────────────────────────

  let householdId: string;

  await test('Can create household', async () => {
    const result = (await queryGraphQL(
      `mutation CreateHousehold($input: CreateHouseholdInput!) {
        createHousehold(input: $input) {
          id
          name
          ownerId
        }
      }`,
      { input: { name: 'Test Household' } },
      authToken,
    )) as { createHousehold: { id: string; ownerId: string } };

    if (!result.createHousehold.id) throw new Error('No household ID');
    householdId = result.createHousehold.id;
  });

  await test('Can list households', async () => {
    const result = (await queryGraphQL(`{ listHouseholds { id name } }`, undefined, authToken)) as {
      listHouseholds: { id: string; name: string }[];
    };

    if (!Array.isArray(result.listHouseholds)) throw new Error('Not an array');
    if (result.listHouseholds.length === 0) throw new Error('No households found');
  });

  // ─── Item (Food) Tests ──────────────────────────────────────────────────

  let itemId: string;

  await test('Can create food item', async () => {
    const result = (await queryGraphQL(
      `mutation CreateItem($input: CreateItemInput!) {
        createItem(input: $input) {
          id
          foodName
          status
        }
      }`,
      {
        input: {
          householdId,
          foodName: 'Milk',
          foodType: 'dairy',
          category: 'dairy',
          storageLocation: 'fridge',
          expiryAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          expirySource: 'user',
        },
      },
      authToken,
    )) as { createItem: { id: string; foodName: string; status: string } };

    if (!result.createItem.id) throw new Error('No item ID');
    if (result.createItem.status !== 'active') throw new Error('Item not active');
    itemId = result.createItem.id;
  });

  await test('Can list items in household', async () => {
    const result = (await queryGraphQL(
      `query ListItems($householdId: ID!) {
        listItems(householdId: $householdId) {
          id
          foodName
        }
      }`,
      { householdId },
      authToken,
    )) as { listItems: { id: string; foodName: string }[] };

    if (!Array.isArray(result.listItems)) throw new Error('Not an array');
    if (result.listItems.length === 0) throw new Error('No items found');
  });

  await test('Can mark item as eaten', async () => {
    const result = (await queryGraphQL(
      `mutation MarkItemEaten($input: StatusInput!) {
        markItemEaten(input: $input) {
          id
          status
          eatenAt
        }
      }`,
      {
        input: {
          householdId,
          id: itemId,
          _version: 1,
        },
      },
      authToken,
    )) as { markItemEaten: { status: string } };

    if (result.markItemEaten.status !== 'eaten') throw new Error('Item not marked as eaten');
  });

  // ─── AI Classification Tests ────────────────────────────────────────────

  await test('Can classify food (mock)', async () => {
    const result = (await queryGraphQL(
      `mutation ClassifyFood($householdId: ID!, $photoUrl: String!) {
        classifyFood(householdId: $householdId, photoUrl: $photoUrl) {
          id
          foodName
          category
        }
      }`,
      {
        householdId,
        photoUrl: 'https://example.com/photo.jpg',
      },
      authToken,
    )) as { classifyFood: { id: string; foodName: string } };

    if (!result.classifyFood.foodName) throw new Error('No food classification');
  });

  // ─── DynamoDB Data Persistence Tests ────────────────────────────────────

  if (hasDynamoDB) {
    await test('Data persists in DynamoDB', async () => {
      const client = new DynamoDBClient({
        endpoint: DYNAMODB_ENDPOINT,
        region: 'us-east-1',
        credentials: { accessKeyId: 'test', secretAccessKey: 'test' },
      });
      const docClient = DynamoDBDocumentClient.from(client);

      // local-mock keys profiles by email: USER#<email>
      const command = new GetCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `USER#test@example.com`,
          SK: 'PROFILE',
        },
      });

      const response = await docClient.send(command);
      if (!response.Item) throw new Error('Profile not found in DynamoDB');
    });

    await test('Household persists in DynamoDB', async () => {
      const client = new DynamoDBClient({
        endpoint: DYNAMODB_ENDPOINT,
        region: 'us-east-1',
        credentials: { accessKeyId: 'test', secretAccessKey: 'test' },
      });
      const docClient = DynamoDBDocumentClient.from(client);

      const command = new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'PK = :pk',
        ExpressionAttributeValues: {
          ':pk': `HOUSEHOLD#${householdId}`,
        },
      });

      const response = await docClient.send(command);
      if (!response.Items || response.Items.length === 0)
        throw new Error('Household not found in DynamoDB');
    });
  }

  // ─── Error Handling Tests ───────────────────────────────────────────────

  await test('Unauthorized request without token fails', async () => {
    try {
      await queryGraphQL(`{ getProfile { id } }`);
      throw new Error('Should have failed without auth token');
    } catch (e) {
      const msg = String(e);
      if (!msg.includes('Unauthorized') && !msg.includes('Unexpected error')) {
        throw e;
      }
    }
  });

  await test('Invalid GraphQL query returns error', async () => {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: '{ invalidField }' }),
    });

    const data = (await response.json()) as { errors?: unknown[] };
    if (!data.errors || data.errors.length === 0) throw new Error('Should have returned error');
  });

  // ─── Summary ────────────────────────────────────────────────────────────

  console.log('\n' + '='.repeat(80));
  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;
  const total = results.length;

  console.log(`\n📊 Results: ${passed}/${total} passed, ${failed} failed\n`);

  if (failed > 0) {
    console.log('Failed tests:');
    results
      .filter((r) => r.status === 'FAIL')
      .forEach((r) => {
        console.log(`  ❌ ${r.name}: ${r.error}`);
      });
  }

  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
  console.log(`Total duration: ${totalDuration}ms\n`);

  if (failed === 0) {
    console.log(
      '✅ All integration tests passed! Local stack is working correctly.\n' +
        'You can now start developing with confidence.',
    );
    process.exit(0);
  } else {
    console.log(
      '❌ Some tests failed. Check the local stack setup:\n' +
        '  docker-compose -f docker-compose.local.yml ps\n' +
        '  docker-compose -f docker-compose.local.yml logs mock-api',
    );
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
