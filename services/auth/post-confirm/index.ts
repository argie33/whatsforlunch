/**
 * Cognito trigger: PostConfirmation
 * Fires after a new user confirms their sign-up (email link or admin-forced).
 * Creates the user's Profile and default Household in DynamoDB.
 * Uses the single-table design: PK=USER#<id>, SK=PROFILE etc.
 */

import type { PostConfirmationTriggerEvent } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, TransactWriteCommand } from '@aws-sdk/lib-dynamodb';

const ddbClient = new DynamoDBClient({ region: process.env.AWS_REGION ?? 'us-east-1' });
const ddb = DynamoDBDocumentClient.from(ddbClient);

const TABLE = process.env.MAIN_TABLE ?? 'wfl-main-dev';

export const handler = async (event: PostConfirmationTriggerEvent): Promise<PostConfirmationTriggerEvent> => {
  const userId = event.request.userAttributes.sub;
  const email = event.request.userAttributes.email ?? '';
  const displayName = email.split('@')[0] ?? userId;
  const householdId = `hh-${userId}`;
  const now = new Date().toISOString();
  const ts = Date.now();

  try {
    // Transact-write: Profile + Household + HouseholdMember (3 items, ≤ 25 limit)
    await ddb.send(new TransactWriteCommand({
      TransactItems: [
        // ── User Profile ──────────────────────────────────────────────────────
        {
          Put: {
            TableName: TABLE,
            Item: {
              PK: `USER#${userId}`,
              SK: 'PROFILE',
              entityType: 'Profile',
              id: userId,
              email,
              displayName,
              photoUrl: null,
              timeZone: 'America/New_York',
              units: 'imperial',
              locale: 'en-US',
              dietaryPreferences: [],
              cuisinePreferences: [],
              allergies: [],
              defaultHouseholdId: householdId,
              subscriptionTier: 'free',
              aiQuotaUsedToday: 0,
              aiQuotaResetAt: new Date(Date.now() + 86_400_000).toISOString(),
              notificationsEnabled: true,
              snsEndpointArn: null,
              createdAt: now,
              updatedAt: now,
              _version: 1,
              _lastChangedAt: ts,
              // GSI1: user→household lookup
              GSI1PK: `USER#${userId}`,
              GSI1SK: `HOUSEHOLD#${householdId}`,
            },
            ConditionExpression: 'attribute_not_exists(PK)',
          },
        },
        // ── Default Household ─────────────────────────────────────────────────
        {
          Put: {
            TableName: TABLE,
            Item: {
              PK: `HOUSEHOLD#${householdId}`,
              SK: 'META',
              entityType: 'Household',
              id: householdId,
              name: `${displayName}'s Kitchen`,
              ownerId: userId,
              memberCount: 1,
              createdAt: now,
              updatedAt: now,
              _version: 1,
              _lastChangedAt: ts,
            },
            ConditionExpression: 'attribute_not_exists(PK)',
          },
        },
        // ── Household Membership ──────────────────────────────────────────────
        {
          Put: {
            TableName: TABLE,
            Item: {
              PK: `HOUSEHOLD#${householdId}`,
              SK: `MEMBER#${userId}`,
              entityType: 'HouseholdMember',
              userId,
              displayName,
              role: 'owner',
              joinedAt: now,
              // GSI1: user→household membership lookup
              GSI1PK: `USER#${userId}`,
              GSI1SK: `HOUSEHOLD#${householdId}`,
            },
            ConditionExpression: 'attribute_not_exists(PK)',
          },
        },
      ],
    }));

    console.log(`[post-confirm] Created profile + household for user ${userId}`);
  } catch (err) {
    // Conditional failure = user already exists (duplicate trigger invocation).
    // Safe to ignore; profile is present.
    const errMsg = String((err as Error).message ?? '');
    if (errMsg.includes('ConditionalCheckFailed')) {
      console.log(`[post-confirm] Profile already exists for ${userId} — skipping`);
    } else {
      // Log but don't throw — the user is already confirmed in Cognito.
      // They can retry profile init on next sign-in.
      console.error('[post-confirm] Error creating profile:', err);
    }
  }

  return event;
};
