import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

async function checkHouseholdMembership(userId, householdId) {
  try {
    const result = await docClient.send(
      new GetCommand({
        TableName: process.env.MAIN_TABLE || 'wfl-main-prod',
        Key: {
          PK: `HOUSEHOLD#${householdId}`,
          SK: `MEMBER#${userId}`,
        },
      }),
    );
    return !!result.Item;
  } catch (err) {
    console.error('[Auth] Membership check failed:', err.message);
    return false;
  }
}

async function findContainerByQrToken(qrToken) {
  try {
    const result = await docClient.send(
      new QueryCommand({
        TableName: process.env.MAIN_TABLE || 'wfl-main-prod',
        IndexName: 'GSI4',
        KeyConditionExpression: 'GSI4PK = :pk',
        ExpressionAttributeValues: {
          ':pk': `QR_TOKEN#${qrToken}`,
        },
      }),
    );
    return result.Items?.[0] || null;
  } catch (err) {
    console.error('[ClaimContainer] Query error:', err.message);
    return null;
  }
}

export async function handler(event) {
  const { householdId, qrToken } = event.arguments.input;
  const userId = event.identity?.claims?.sub;

  if (!householdId || !qrToken || !userId) {
    throw new Error('householdId, qrToken, and authentication are required');
  }

  try {
    // Authorization: verify user is member of household
    const isMember = await checkHouseholdMembership(userId, householdId);
    if (!isMember) {
      throw new Error('User is not a member of this household');
    }

    // Find container by QR token
    const container = await findContainerByQrToken(qrToken);
    if (!container) {
      throw new Error('Container not found with provided QR token');
    }

    // Check if already claimed to a household
    if (container.claimedAt && container.householdId && container.householdId !== householdId) {
      throw new Error('Container is already claimed to another household');
    }

    // Claim the container
    const now = new Date().toISOString();
    const updatedContainer = await docClient.send(
      new UpdateCommand({
        TableName: process.env.MAIN_TABLE || 'wfl-main-prod',
        Key: {
          PK: container.PK,
          SK: container.SK,
        },
        UpdateExpression: 'SET householdId = :hid, claimedAt = :now, claimedBy = :uid, #v = #v + :inc, updatedAt = :now',
        ExpressionAttributeNames: {
          '#v': '_version',
        },
        ExpressionAttributeValues: {
          ':hid': householdId,
          ':now': now,
          ':uid': userId,
          ':inc': 1,
        },
        ReturnValues: 'ALL_NEW',
      }),
    );

    console.log(`[Mutation.claimContainer] Claimed container ${container.id} for household ${householdId}`);

    return mapContainerToGraphQL(updatedContainer.Attributes);
  } catch (error) {
    console.error('[Mutation.claimContainer] Error:', error.message);
    throw error;
  }
}

function mapContainerToGraphQL(container) {
  return {
    id: container.id,
    householdId: container.householdId,
    qrToken: container.qrToken,
    nickname: container.nickname,
    imageUrl: container.imageUrl,
    claimedAt: container.claimedAt,
    claimedBy: container.claimedBy,
    archivedAt: container.archivedAt,
    createdAt: container.createdAt,
    updatedAt: container.updatedAt,
    _version: container._version,
    _lastChangedAt: container._lastChangedAt,
  };
}
