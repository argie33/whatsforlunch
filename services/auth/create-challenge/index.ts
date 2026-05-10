import { CognitoUserPoolTriggerEvent } from 'aws-lambda';
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';
import crypto from 'crypto';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const templatesDir = path.join(__dirname, '..', 'templates');

const HTML_TEMPLATE = readFileSync(path.join(templatesDir, 'magic-link.html'), 'utf-8');
const TEXT_TEMPLATE = readFileSync(path.join(templatesDir, 'magic-link.txt'), 'utf-8');

const dynamodb = new DynamoDBClient({});
const ses = new SESv2Client({});

interface AuthChallenge {
  nonce: string;
  hmac: string;
  email: string;
  ipClass: string;
  uaHash: string;
  createdAt: number;
  expiresAt: number;
}

function generateNonce(): string {
  return crypto.randomBytes(32).toString('hex');
}

function generateHmac(nonce: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(nonce).digest('hex');
}

function getIpClass(ip: string): string {
  // For security, we only store the /16 network (first two octets)
  // This allows some flexibility for mobile users changing networks slightly
  const parts = ip.split('.');
  return parts.slice(0, 2).join('.') + '.0.0';
}

function getUaHash(userAgent: string): string {
  return crypto.createHash('sha256').update(userAgent).digest('hex');
}

export const handler = async (event: CognitoUserPoolTriggerEvent) => {
  console.log('CreateAuthChallenge event:', JSON.stringify(event));

  const email = event.request.userAttributes.email;
  const clientIp = event.request.userContextData?.sourceIp || '0.0.0.0';
  const userAgent = event.request.userContextData?.userAgent || '';

  const nonce = generateNonce();
  const secret = process.env.NONCE_SECRET || '';
  const hmac = generateHmac(nonce, secret);
  const now = Date.now();
  const ttl = Math.floor(now / 1000) + 600; // 10 minutes

  const ipClass = getIpClass(clientIp);
  const uaHash = getUaHash(userAgent);

  // Store challenge metadata in DynamoDB
  const challenge: AuthChallenge = {
    nonce,
    hmac,
    email,
    ipClass,
    uaHash,
    createdAt: now,
    expiresAt: ttl * 1000,
  };

  try {
    await dynamodb.send(
      new PutItemCommand({
        TableName: process.env.AUTH_CHALLENGES_TABLE || '',
        Item: {
          PK: { S: `AUTH_CHALLENGE#${nonce}` },
          SK: { S: email },
          hmac: { S: hmac },
          email: { S: email },
          ipClass: { S: ipClass },
          uaHash: { S: uaHash },
          createdAt: { N: String(now) },
          expiresAt: { N: String(ttl) },
          TTL: { N: String(ttl) }, // DynamoDB TTL
        },
      })
    );

    // Send magic link email via SES
    const magicLinkUrl = `https://whatsfresh.app/auth/verify?token=${nonce}`;
    const htmlBody = HTML_TEMPLATE.replaceAll('{{MAGIC_LINK_URL}}', magicLinkUrl);
    const textBody = TEXT_TEMPLATE.replaceAll('{{MAGIC_LINK_URL}}', magicLinkUrl);

    await ses.send(
      new SendEmailCommand({
        FromEmailAddress: process.env.SES_FROM_EMAIL || 'noreply@whatsfresh.app',
        Destination: {
          ToAddresses: [email],
        },
        Content: {
          Simple: {
            Subject: {
              Data: 'Sign in to WhatsFresh',
              Charset: 'UTF-8',
            },
            Body: {
              Html: {
                Data: htmlBody,
                Charset: 'UTF-8',
              },
              Text: {
                Data: textBody,
                Charset: 'UTF-8',
              },
            },
          },
        },
      })
    );

    // Return public challenge info (don't leak secrets)
    event.response.publicChallengeParameters = {
      destination: 'email',
    };
    event.response.privateChallengeParameters = {
      nonce,
    };
  } catch (error) {
    console.error('Error in CreateAuthChallenge:', error);
    throw error;
  }

  return event;
};
