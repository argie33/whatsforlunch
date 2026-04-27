import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const ENDPOINT = process.env.DYNAMODB_ENDPOINT || 'http://localhost:8000';
const TABLE = process.env.DYNAMODB_TABLE || 'wfl-main-dev';

const raw = new DynamoDBClient({
  region: 'us-east-1',
  credentials: { accessKeyId: 'test', secretAccessKey: 'test' },
  endpoint: ENDPOINT,
});

export const ddb = DynamoDBDocumentClient.from(raw);
export { TABLE };

export function nowIso(): string {
  return new Date().toISOString();
}

export function nowMs(): number {
  return Date.now();
}

// Build common attributes for every new entity
export function buildAttrs(overrides: Record<string, unknown>) {
  const now = nowIso();
  return {
    createdAt: now,
    updatedAt: now,
    _version: 1,
    _lastChangedAt: nowMs(),
    ...overrides,
  };
}

// Generic paginated query helper
export async function queryAll(
  params: Omit<ConstructorParameters<typeof QueryCommand>[0], 'TableName'>,
): Promise<Record<string, unknown>[]> {
  const result = await ddb.send(
    new QueryCommand({ TableName: TABLE, ...params }),
  );
  return (result.Items ?? []) as Record<string, unknown>[];
}

export async function getItem(pk: string, sk: string) {
  const result = await ddb.send(
    new GetCommand({ TableName: TABLE, Key: { PK: pk, SK: sk } }),
  );
  return result.Item ?? null;
}

export async function putItem(item: Record<string, unknown>) {
  await ddb.send(new PutCommand({ TableName: TABLE, Item: item }));
  return item;
}

export async function updateItem(
  pk: string,
  sk: string,
  updates: Record<string, unknown>,
) {
  const keys = Object.keys(updates);
  if (keys.length === 0) return null;

  const sets = keys.map((k) => `#${k} = :${k}`);
  const names: Record<string, string> = {};
  const values: Record<string, unknown> = { ':now': nowIso(), ':ms': nowMs(), ':inc': 1 };

  keys.forEach((k) => {
    names[`#${k}`] = k;
    values[`:${k}`] = updates[k];
  });

  const result = await ddb.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { PK: pk, SK: sk },
      UpdateExpression: `SET ${sets.join(', ')}, #updatedAt = :now, #_lastChangedAt = :ms, #_version = #_version + :inc`,
      ExpressionAttributeNames: { ...names, '#updatedAt': 'updatedAt', '#_lastChangedAt': '_lastChangedAt', '#_version': '_version' },
      ExpressionAttributeValues: values,
      ReturnValues: 'ALL_NEW',
    }),
  );
  return result.Attributes ?? null;
}
