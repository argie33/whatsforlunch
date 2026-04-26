import { CognitoUserPoolTriggerEvent } from 'aws-lambda';
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { v4 as uuidv4 } from 'uuid';

const dynamodb = new DynamoDBClient({});

export const handler = async (event: CognitoUserPoolTriggerEvent) => {
  console.log('PostConfirmation event:', JSON.stringify(event));

  const userId = event.request.userAttributes.sub;
  const email = event.request.userAttributes.email;
  const now = new Date().toISOString();

  try {
    // Initialize user profile
    await dynamodb.send(
      new PutItemCommand({
        TableName: process.env.PROFILES_TABLE || '',
        Item: {
          PK: { S: `USER#${userId}` },
          SK: { S: 'PROFILE' },
          userId: { S: userId },
          email: { S: email },
          displayName: { S: email.split('@')[0] }, // Default display name
          timeZone: { S: 'UTC' },
          units: { S: 'metric' },
          locale: { S: 'en' },
          dietaryPreferences: { L: [] },
          cuisinePreferences: { L: [] },
          allergies: { L: [] },
          subscriptionTier: { S: 'free' },
          aiQuotaUsedToday: { N: '0' },
          aiQuotaResetAt: { S: now },
          createdAt: { S: now },
          updatedAt: { S: now },
          _version: { N: '1' },
          _lastModifiedAt: { N: String(Date.now()) },
        },
      })
    );

    console.log(`Profile created for user ${userId}`);
  } catch (error) {
    console.error('Error in PostConfirmation:', error);
    // Don't throw — post-confirmation failures shouldn't block signup
    // The user is already confirmed, but they may need to retry profile init
  }

  return event;
};
