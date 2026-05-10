import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

export async function handler(event) {
  const userId = event.identity?.claims?.sub;

  if (!userId) {
    throw new Error('Authentication required');
  }

  try {
    const result = await docClient.send(
      new QueryCommand({
        TableName: process.env.MAIN_TABLE || 'wfl-main-prod',
        KeyConditionExpression: 'PK = :pk AND SK = :sk',
        ExpressionAttributeValues: {
          ':pk': `USER#${userId}`,
          ':sk': 'PROFILE',
        },
      }),
    );

    if (!result.Items || result.Items.length === 0) {
      throw new Error('Profile not found');
    }

    const profile = result.Items[0];
    return mapProfileToGraphQL(profile);
  } catch (error) {
    console.error('Error getting profile:', error);
    throw error;
  }
}

function mapProfileToGraphQL(p) {
  return {
    id: p.id,
    email: p.email,
    displayName: p.displayName,
    photoUrl: p.photoUrl,
    timeZone: p.timeZone,
    units: p.units,
    locale: p.locale,
    dietaryPreferences: p.dietaryPreferences,
    cuisinePreferences: p.cuisinePreferences,
    allergies: p.allergies,
    defaultHouseholdId: p.defaultHouseholdId,
    homeLocation: p.homeLocation,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    _version: p._version,
    _lastChangedAt: p._lastChangedAt,
  };
}
