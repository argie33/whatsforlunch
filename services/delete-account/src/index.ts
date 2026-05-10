/**
 * Lambda: delete-account
 * Triggered by AppSync mutation `deleteAccount` or Step Function.
 * Soft-deletes all user data, then schedules hard purge after retention window.
 *
 * Environment variables:
 *   MAIN_TABLE      — DynamoDB table name
 *   USER_POOL_ID    — Cognito User Pool ID
 *   PURGE_DELAY_DAYS — days before hard delete (default: 30)
 *   AWS_REGION      — AWS region
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  QueryCommand,
  UpdateCommand,
  BatchWriteCommand,
} from '@aws-sdk/lib-dynamodb';
import {
  CognitoIdentityProviderClient,
  AdminDisableUserCommand,
  AdminDeleteUserCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { Logger } from '@aws-lambda-powertools/logger';

const logger = new Logger({ serviceName: 'delete-account' });

const ddbClient = new DynamoDBClient({ region: process.env.AWS_REGION ?? 'us-east-1' });
const ddb = DynamoDBDocumentClient.from(ddbClient);
const cognito = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION ?? 'us-east-1' });

const TABLE = process.env.MAIN_TABLE ?? 'wfl-main-dev';
const USER_POOL_ID = process.env.USER_POOL_ID ?? '';
const PURGE_DELAY_DAYS = Number(process.env.PURGE_DELAY_DAYS ?? '30');

export interface DeleteAccountEvent {
  userId: string;
  householdIds: string[];
  purge?: boolean; // true = hard delete (called by Step Function after retention window)
}

async function softDeleteItems(householdId: string, deletedAt: string): Promise<number> {
  let deleted = 0;
  let lastKey: Record<string, unknown> | undefined;

  do {
    const result = await ddb.send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `HOUSEHOLD#${householdId}`,
        ':sk': 'ITEM#',
        ':notDeleted': 'deleted',
      },
      FilterExpression: '#st <> :notDeleted',
      ExpressionAttributeNames: { '#st': 'status' },
      ExclusiveStartKey: lastKey,
      ProjectionExpression: 'PK, SK',
    }));

    const items = result.Items ?? [];
    for (let i = 0; i < items.length; i += 25) {
      const batch = items.slice(i, i + 25);
      await Promise.all(batch.map((item) =>
        ddb.send(new UpdateCommand({
          TableName: TABLE,
          Key: { PK: item['PK'], SK: item['SK'] },
          UpdateExpression: 'SET #st = :deleted, deletedAt = :ts, updatedAt = :ts',
          ExpressionAttributeNames: { '#st': 'status' },
          ExpressionAttributeValues: { ':deleted': 'deleted', ':ts': deletedAt },
        })),
      ));
      deleted += batch.length;
    }

    lastKey = result.LastEvaluatedKey as Record<string, unknown> | undefined;
  } while (lastKey);

  return deleted;
}

async function softDeleteHouseholdData(householdId: string, deletedAt: string): Promise<void> {
  // Mark household record as deleted
  await ddb.send(new UpdateCommand({
    TableName: TABLE,
    Key: { PK: `HOUSEHOLD#${householdId}`, SK: 'META' },
    UpdateExpression: 'SET deletedAt = :ts, updatedAt = :ts',
    ExpressionAttributeValues: { ':ts': deletedAt },
  }));
}

async function softDeleteProfile(userId: string, deletedAt: string): Promise<void> {
  await ddb.send(new UpdateCommand({
    TableName: TABLE,
    Key: { PK: `USER#${userId}`, SK: 'PROFILE' },
    UpdateExpression: 'SET deletedAt = :ts, updatedAt = :ts, #st = :deleted',
    ExpressionAttributeNames: { '#st': 'status' },
    ExpressionAttributeValues: { ':ts': deletedAt, ':deleted': 'deleted' },
  }));
}

async function hardPurgeUserData(userId: string, householdIds: string[]): Promise<void> {
  // Collect all PKs/SKs for this user's data and batch-delete them
  const keysToDelete: Array<{ PK: string; SK: string }> = [];

  // Profile + household memberships
  const userResult = await ddb.send(new QueryCommand({
    TableName: TABLE,
    KeyConditionExpression: 'PK = :pk',
    ExpressionAttributeValues: { ':pk': `USER#${userId}` },
    ProjectionExpression: 'PK, SK',
  }));
  for (const item of userResult.Items ?? []) {
    keysToDelete.push({ PK: item['PK'] as string, SK: item['SK'] as string });
  }

  // All household data (items, containers, memberships)
  for (const householdId of householdIds) {
    let lastKey: Record<string, unknown> | undefined;
    do {
      const result = await ddb.send(new QueryCommand({
        TableName: TABLE,
        KeyConditionExpression: 'PK = :pk',
        ExpressionAttributeValues: { ':pk': `HOUSEHOLD#${householdId}` },
        ProjectionExpression: 'PK, SK',
        ExclusiveStartKey: lastKey,
      }));
      for (const item of result.Items ?? []) {
        keysToDelete.push({ PK: item['PK'] as string, SK: item['SK'] as string });
      }
      lastKey = result.LastEvaluatedKey as Record<string, unknown> | undefined;
    } while (lastKey);
  }

  // Batch-write deletions (25 per batch)
  for (let i = 0; i < keysToDelete.length; i += 25) {
    const batch = keysToDelete.slice(i, i + 25);
    await ddb.send(new BatchWriteCommand({
      RequestItems: {
        [TABLE]: batch.map((key) => ({
          DeleteRequest: { Key: key },
        })),
      },
    }));
  }

  logger.info('Hard purge complete', { userId, itemsDeleted: keysToDelete.length });
}

export const handler = async (event: DeleteAccountEvent): Promise<{ success: boolean; itemsSoftDeleted: number }> => {
  const { userId, householdIds, purge = false } = event;
  logger.info('delete-account: starting', { userId, purge });

  if (purge) {
    // Hard purge — called by Step Function after retention window
    await hardPurgeUserData(userId, householdIds);
    if (USER_POOL_ID) {
      try {
        await cognito.send(new AdminDeleteUserCommand({ UserPoolId: USER_POOL_ID, Username: userId }));
      } catch (err) {
        logger.warn('Cognito user already deleted or not found', { userId, err });
      }
    }
    return { success: true, itemsSoftDeleted: 0 };
  }

  // Soft delete phase
  const deletedAt = new Date().toISOString();
  const purgeAt = new Date(Date.now() + PURGE_DELAY_DAYS * 86_400_000).toISOString();

  // Disable Cognito user immediately so they can't sign in
  if (USER_POOL_ID) {
    try {
      await cognito.send(new AdminDisableUserCommand({ UserPoolId: USER_POOL_ID, Username: userId }));
    } catch (err) {
      logger.warn('Could not disable Cognito user', { userId, err });
    }
  }

  let totalItems = 0;
  for (const householdId of householdIds) {
    const count = await softDeleteItems(householdId, deletedAt);
    await softDeleteHouseholdData(householdId, deletedAt);
    totalItems += count;
    logger.info('Household soft-deleted', { householdId, items: count });
  }

  await softDeleteProfile(userId, deletedAt);

  // Record purge marker so Step Function knows when to run hard delete
  await ddb.send(new UpdateCommand({
    TableName: TABLE,
    Key: { PK: `USER#${userId}`, SK: 'PROFILE' },
    UpdateExpression: 'SET purgeAt = :purgeAt',
    ExpressionAttributeValues: { ':purgeAt': purgeAt },
  }));

  logger.info('delete-account: soft-delete complete', { userId, totalItems, purgeAt });
  return { success: true, itemsSoftDeleted: totalItems };
};
