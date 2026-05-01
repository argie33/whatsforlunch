import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  QueryCommand,
  ScanCommand,
  UpdateCommand,
  DeleteCommand,
} from '@aws-sdk/lib-dynamodb';

const TABLE = process.env.TABLE_NAME ?? 'wfl-main-dev';

const raw = new DynamoDBClient({
  endpoint: process.env.DYNAMODB_ENDPOINT ?? 'http://localhost:8000',
  region: process.env.DYNAMODB_REGION ?? 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? 'test',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? 'test',
  },
});

export const db = DynamoDBDocumentClient.from(raw, {
  marshallOptions: { removeUndefinedValues: true },
});

export const TABLE_NAME = TABLE;

export async function put(item: Record<string, unknown>) {
  await db.send(new PutCommand({ TableName: TABLE, Item: item }));
}

export async function get(pk: string, sk: string) {
  const res = await db.send(new GetCommand({ TableName: TABLE, Key: { PK: pk, SK: sk } }));
  return res.Item ?? null;
}

export async function query(pk: string, skPrefix?: string) {
  const params = {
    TableName: TABLE,
    KeyConditionExpression: skPrefix ? 'PK = :pk AND begins_with(SK, :skp)' : 'PK = :pk',
    ExpressionAttributeValues: skPrefix ? { ':pk': pk, ':skp': skPrefix } : { ':pk': pk },
  };
  const res = await db.send(new QueryCommand(params));
  return res.Items ?? [];
}

export async function scanByEntityType(entityType: string) {
  const res = await db.send(
    new ScanCommand({
      TableName: TABLE,
      FilterExpression: 'entityType = :et',
      ExpressionAttributeValues: { ':et': entityType },
    }),
  );
  return res.Items ?? [];
}

export async function remove(pk: string, sk: string) {
  await db.send(new DeleteCommand({ TableName: TABLE, Key: { PK: pk, SK: sk } }));
}
