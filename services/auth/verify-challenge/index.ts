import { CognitoUserPoolTriggerEvent } from 'aws-lambda';
import { DynamoDBClient, GetItemCommand, DeleteItemCommand } from '@aws-sdk/client-dynamodb';
import crypto from 'crypto';

const dynamodb = new DynamoDBClient({});

function verifyHmac(nonce: string, storedHmac: string, secret: string): boolean {
  const computedHmac = crypto.createHmac('sha256', secret).update(nonce).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(storedHmac), Buffer.from(computedHmac));
}

function getIpClass(ip: string): string {
  const parts = ip.split('.');
  return parts.slice(0, 2).join('.') + '.0.0';
}

function getUaHash(userAgent: string): string {
  return crypto.createHash('sha256').update(userAgent).digest('hex');
}

export const handler = async (event: CognitoUserPoolTriggerEvent) => {
  console.log('VerifyAuthChallengeResponse event:', JSON.stringify(event));

  const token = event.request.challengeAnswer;
  const email = event.request.userAttributes.email;
  const clientIp = event.request.userContextData?.sourceIp || '0.0.0.0';
  const userAgent = event.request.userContextData?.userAgent || '';

  const ipClass = getIpClass(clientIp);
  const uaHash = getUaHash(userAgent);
  const secret = process.env.NONCE_SECRET || '';
  const now = Date.now();

  try {
    // Retrieve the challenge from DynamoDB
    const result = await dynamodb.send(
      new GetItemCommand({
        TableName: process.env.AUTH_CHALLENGES_TABLE || '',
        Key: {
          PK: { S: `AUTH_CHALLENGE#${token}` },
          SK: { S: email },
        },
      })
    );

    if (!result.Item) {
      throw new Error('Challenge not found or expired');
    }

    const challenge = result.Item;
    const storedHmac = challenge.hmac?.S || '';
    const storedIpClass = challenge.ipClass?.S || '';
    const storedUaHash = challenge.uaHash?.S || '';
    const expiresAt = parseInt(challenge.expiresAt?.N || '0');

    // Validate expiration
    if (now > expiresAt * 1000) {
      throw new Error('Challenge expired');
    }

    // Verify HMAC
    if (!verifyHmac(token, storedHmac, secret)) {
      throw new Error('Invalid token HMAC');
    }

    // Verify IP class (allow some variance for mobile users)
    if (ipClass !== storedIpClass) {
      console.warn(`IP class mismatch: ${ipClass} vs ${storedIpClass}`);
      // In production, you might want to require additional verification here
      // For now, we'll allow it but log it
    }

    // Verify user agent (log if different but don't fail)
    if (uaHash !== storedUaHash) {
      console.warn('User agent changed');
      // Optionally send a security alert email in production
    }

    // Delete the challenge (single-use)
    await dynamodb.send(
      new DeleteItemCommand({
        TableName: process.env.AUTH_CHALLENGES_TABLE || '',
        Key: {
          PK: { S: `AUTH_CHALLENGE#${token}` },
          SK: { S: email },
        },
      })
    );

    event.response.answerCorrect = true;
  } catch (error) {
    console.error('Error verifying challenge:', error);
    event.response.answerCorrect = false;
  }

  return event;
};
