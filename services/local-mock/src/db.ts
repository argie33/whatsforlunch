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
import * as mockDb from './db-mock.js';

const TABLE = process.env.TABLE_NAME ?? 'wfl-main-dev';
const USE_MOCK =
  process.env.USE_MOCK_DB === 'true' || process.env.DYNAMODB_ENDPOINT?.includes('localhost:8000');

let db: DynamoDBDocumentClient | null = null;

// Lazy initialize real DB, fall back to mock if unavailable
async function getDb() {
  if (USE_MOCK || !db) {
    return null; // Use mock
  }
  if (!db) {
    const raw = new DynamoDBClient({
      endpoint: process.env.DYNAMODB_ENDPOINT ?? 'http://localhost:8000',
      region: process.env.DYNAMODB_REGION ?? 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? 'test',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? 'test',
      },
    });
    db = DynamoDBDocumentClient.from(raw, {
      marshallOptions: { removeUndefinedValues: true },
    });
  }
  return db;
}

export const TABLE_NAME = TABLE;

export async function put(item: Record<string, unknown>) {
  try {
    const database = await getDb();
    if (database) {
      await database.send(new PutCommand({ TableName: TABLE, Item: item }));
    } else {
      await mockDb.put(item);
    }
  } catch (error) {
    console.log('[db] DynamoDB unavailable, using mock storage');
    await mockDb.put(item);
  }
}

export async function get(pk: string, sk: string) {
  try {
    const database = await getDb();
    if (database) {
      const res = await database.send(
        new GetCommand({ TableName: TABLE, Key: { PK: pk, SK: sk } }),
      );
      return res.Item ?? null;
    } else {
      return await mockDb.get(pk, sk);
    }
  } catch (error) {
    console.log('[db] DynamoDB unavailable, using mock storage');
    return await mockDb.get(pk, sk);
  }
}

export async function query(pk: string, skPrefix?: string) {
  try {
    const database = await getDb();
    if (database) {
      const params = {
        TableName: TABLE,
        KeyConditionExpression: skPrefix ? 'PK = :pk AND begins_with(SK, :skp)' : 'PK = :pk',
        ExpressionAttributeValues: skPrefix ? { ':pk': pk, ':skp': skPrefix } : { ':pk': pk },
      };
      const res = await database.send(new QueryCommand(params));
      return res.Items ?? [];
    } else {
      return await mockDb.query(pk, skPrefix);
    }
  } catch (error) {
    console.log('[db] DynamoDB unavailable, using mock storage');
    return await mockDb.query(pk, skPrefix);
  }
}

export async function scanByEntityType(entityType: string) {
  try {
    const database = await getDb();
    if (database) {
      const res = await database.send(
        new ScanCommand({
          TableName: TABLE,
          FilterExpression: 'entityType = :et',
          ExpressionAttributeValues: { ':et': entityType },
        }),
      );
      return res.Items ?? [];
    } else {
      return await mockDb.scanByEntityType(entityType);
    }
  } catch (error) {
    console.log('[db] DynamoDB unavailable, using mock storage');
    return await mockDb.scanByEntityType(entityType);
  }
}

export async function remove(pk: string, sk: string) {
  try {
    const database = await getDb();
    if (database) {
      await database.send(new DeleteCommand({ TableName: TABLE, Key: { PK: pk, SK: sk } }));
    } else {
      await mockDb.remove(pk, sk);
    }
  } catch (error) {
    console.log('[db] DynamoDB unavailable, using mock storage');
    await mockDb.remove(pk, sk);
  }
}
