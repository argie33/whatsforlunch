/**
 * Lambda: export-data
 * Triggered by AppSync mutation `requestDataExport`.
 * Exports all household data (items, containers, shopping list) to S3
 * and returns a pre-signed URL valid for 24 hours.
 *
 * Environment variables:
 *   MAIN_TABLE      — DynamoDB table name
 *   EXPORT_BUCKET   — S3 bucket for exports
 *   URL_TTL_SECONDS — pre-signed URL TTL (default: 86400)
 *   AWS_REGION      — AWS region
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Logger } from '@aws-lambda-powertools/logger';

const logger = new Logger({ serviceName: 'export-data' });

const ddbClient = new DynamoDBClient({ region: process.env.AWS_REGION ?? 'us-east-1' });
const ddb = DynamoDBDocumentClient.from(ddbClient);
const s3 = new S3Client({ region: process.env.AWS_REGION ?? 'us-east-1' });

const TABLE = process.env.MAIN_TABLE ?? 'wfl-main-dev';
const EXPORT_BUCKET = process.env.EXPORT_BUCKET ?? 'wfl-exports-dev';
const URL_TTL_SECONDS = Number(process.env.URL_TTL_SECONDS ?? '86400');

export interface ExportDataEvent {
  userId: string;
  householdIds: string[];
}

interface ExportPayload {
  exportedAt: string;
  userId: string;
  households: HouseholdExport[];
}

interface HouseholdExport {
  householdId: string;
  items: Record<string, unknown>[];
  containers: Record<string, unknown>[];
  shoppingList: Record<string, unknown>[];
  members: Record<string, unknown>[];
}

async function queryAll(pk: string, skPrefix: string): Promise<Record<string, unknown>[]> {
  const results: Record<string, unknown>[] = [];
  let lastKey: Record<string, unknown> | undefined;

  do {
    const result = await ddb.send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: { ':pk': pk, ':sk': skPrefix },
      ExclusiveStartKey: lastKey,
    }));
    results.push(...(result.Items ?? []) as Record<string, unknown>[]);
    lastKey = result.LastEvaluatedKey as Record<string, unknown> | undefined;
  } while (lastKey);

  return results;
}

function stripInternalKeys(item: Record<string, unknown>): Record<string, unknown> {
  const { PK, SK, GSI1PK, GSI1SK, GSI2PK, GSI2SK, entityType, ...rest } = item;
  void PK; void SK; void GSI1PK; void GSI1SK; void GSI2PK; void GSI2SK; void entityType;
  return rest;
}

async function exportHousehold(householdId: string): Promise<HouseholdExport> {
  const [rawItems, rawContainers, rawShoppingList, rawMembers] = await Promise.all([
    queryAll(`HOUSEHOLD#${householdId}`, 'ITEM#'),
    queryAll(`HOUSEHOLD#${householdId}`, 'CONTAINER#'),
    queryAll(`HOUSEHOLD#${householdId}`, 'SHOPPING#'),
    queryAll(`HOUSEHOLD#${householdId}`, 'MEMBER#'),
  ]);

  return {
    householdId,
    items: rawItems
      .filter((r) => !r['deletedAt'])
      .map(stripInternalKeys),
    containers: rawContainers
      .filter((r) => !r['deletedAt'])
      .map(stripInternalKeys),
    shoppingList: rawShoppingList.map(stripInternalKeys),
    members: rawMembers.map(stripInternalKeys),
  };
}

export const handler = async (event: ExportDataEvent): Promise<{ url: string; expiresAt: string }> => {
  const { userId, householdIds } = event;
  logger.info('export-data: starting', { userId, householdCount: householdIds.length });

  const households = await Promise.all(householdIds.map(exportHousehold));

  const payload: ExportPayload = {
    exportedAt: new Date().toISOString(),
    userId,
    households,
  };

  const totalItems = households.reduce((n, h) => n + h.items.length, 0);
  logger.info('export-data: collected data', { totalItems });

  const key = `exports/${userId}/${Date.now()}.json`;
  await s3.send(new PutObjectCommand({
    Bucket: EXPORT_BUCKET,
    Key: key,
    Body: JSON.stringify(payload, null, 2),
    ContentType: 'application/json',
    ServerSideEncryption: 'aws:kms',
    Metadata: { userId, exportedAt: payload.exportedAt },
  }));

  const url = await getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: EXPORT_BUCKET, Key: key }),
    { expiresIn: URL_TTL_SECONDS },
  );

  const expiresAt = new Date(Date.now() + URL_TTL_SECONDS * 1000).toISOString();
  logger.info('export-data: done', { key, expiresAt });

  return { url, expiresAt };
};
