import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';

export const TABLE = process.env['TABLE_NAME'] ?? 'wfl-main-dev';

const raw = new DynamoDB({
  region: process.env['AWS_REGION'] ?? 'us-east-1',
  endpoint: process.env['DYNAMODB_ENDPOINT'] ?? 'http://localhost:8000',
  credentials: {
    accessKeyId: process.env['AWS_ACCESS_KEY_ID'] ?? 'test',
    secretAccessKey: process.env['AWS_SECRET_ACCESS_KEY'] ?? 'test',
  },
});

export const ddb = DynamoDBDocumentClient.from(raw, {
  marshallOptions: { removeUndefinedValues: true },
});

export const nowIso = () => new Date().toISOString();
export const nowMs = () => Date.now();

export function buildAttrs(attrs: Record<string, unknown>): Record<string, unknown> {
  const ts = nowIso();
  const ms = nowMs();
  return {
    ...attrs,
    createdAt: attrs['createdAt'] ?? ts,
    updatedAt: ts,
    _version: attrs['_version'] ?? 1,
    _lastChangedAt: ms,
  };
}

export async function getItem(pk: string, sk: string): Promise<Record<string, unknown> | null> {
  const res = await ddb.send(new GetCommand({ TableName: TABLE, Key: { PK: pk, SK: sk } }));
  return (res.Item as Record<string, unknown>) ?? null;
}

export async function putItem(item: Record<string, unknown>): Promise<void> {
  await ddb.send(new PutCommand({ TableName: TABLE, Item: item }));
}

export async function updateAttrs(
  pk: string,
  sk: string,
  fields: Record<string, unknown>,
): Promise<Record<string, unknown> | null> {
  const ts = nowIso();
  const ms = nowMs();
  const allFields = { ...fields, updatedAt: ts, _lastChangedAt: ms };

  const names: Record<string, string> = {};
  const values: Record<string, unknown> = {};
  const parts: string[] = [];

  Object.entries(allFields).forEach(([k, v], i) => {
    const n = `#f${i}`;
    const vk = `:v${i}`;
    names[n] = k;
    values[vk] = v;
    parts.push(`${n} = ${vk}`);
  });

  const res = await ddb.send(new UpdateCommand({
    TableName: TABLE,
    Key: { PK: pk, SK: sk },
    UpdateExpression: `SET ${parts.join(', ')}`,
    ExpressionAttributeNames: names,
    ExpressionAttributeValues: values,
    ReturnValues: 'ALL_NEW',
  }));

  return (res.Attributes as Record<string, unknown>) ?? null;
}

export async function queryAll(
  keyCondition: string,
  attributeValues: Record<string, unknown>,
  filterExpression?: string,
  indexName?: string,
): Promise<Record<string, unknown>[]> {
  const results: Record<string, unknown>[] = [];
  let lastKey: Record<string, unknown> | undefined;

  do {
    const res = await ddb.send(new QueryCommand({
      TableName: TABLE,
      IndexName: indexName,
      KeyConditionExpression: keyCondition,
      ExpressionAttributeValues: attributeValues,
      FilterExpression: filterExpression,
      ExclusiveStartKey: lastKey,
    }));
    results.push(...((res.Items ?? []) as Record<string, unknown>[]));
    lastKey = res.LastEvaluatedKey as Record<string, unknown> | undefined;
  } while (lastKey);

  return results;
}

export { uuidv4 as uuid };
