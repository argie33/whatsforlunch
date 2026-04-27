#!/usr/bin/env node

/**
 * Local DynamoDB Table Setup
 * Creates all necessary tables matching the production schema
 * Uses AWS SDK with local endpoint
 */

import { DynamoDB } from '@aws-sdk/client-dynamodb';

const dynamodb = new DynamoDB({
  region: 'us-east-1',
  credentials: {
    accessKeyId: 'test',
    secretAccessKey: 'test',
  },
  endpoint: process.env.AWS_ENDPOINT || 'http://localhost:8000',
});

async function createTable(params: any) {
  try {
    console.log(`Creating table: ${params.TableName}...`);
    await dynamodb.createTable(params);
    console.log(`✅ Table ${params.TableName} created successfully`);
  } catch (error: any) {
    if (error.name === 'ResourceInUseException') {
      console.log(`⚠️  Table ${params.TableName} already exists`);
    } else {
      console.error(`❌ Error creating ${params.TableName}:`, error.message);
      throw error;
    }
  }
}

async function setupTables() {
  console.log('🚀 Setting up local DynamoDB tables...\n');

  // Main table with GSIs
  await createTable({
    TableName: 'wfl-main-dev',
    AttributeDefinitions: [
      { AttributeName: 'PK', AttributeType: 'S' },
      { AttributeName: 'SK', AttributeType: 'S' },
      { AttributeName: 'GSI1PK', AttributeType: 'S' },
      { AttributeName: 'GSI1SK', AttributeType: 'S' },
      { AttributeName: 'GSI2PK', AttributeType: 'S' },
      { AttributeName: 'GSI2SK', AttributeType: 'S' },
      { AttributeName: 'GSI3PK', AttributeType: 'S' },
      { AttributeName: 'GSI3SK', AttributeType: 'S' },
      { AttributeName: 'GSI4PK', AttributeType: 'S' },
      { AttributeName: 'GSI4SK', AttributeType: 'S' },
    ],
    KeySchema: [
      { AttributeName: 'PK', KeyType: 'HASH' },
      { AttributeName: 'SK', KeyType: 'RANGE' },
    ],
    BillingMode: 'PAY_PER_REQUEST',
    StreamSpecification: {
      StreamViewType: 'NEW_AND_OLD_IMAGES',
    },
    GlobalSecondaryIndexes: [
      {
        IndexName: 'GSI1',
        KeySchema: [
          { AttributeName: 'GSI1PK', KeyType: 'HASH' },
          { AttributeName: 'GSI1SK', KeyType: 'RANGE' },
        ],
        Projection: { ProjectionType: 'ALL' },
      },
      {
        IndexName: 'GSI2',
        KeySchema: [
          { AttributeName: 'GSI2PK', KeyType: 'HASH' },
          { AttributeName: 'GSI2SK', KeyType: 'RANGE' },
        ],
        Projection: { ProjectionType: 'ALL' },
      },
      {
        IndexName: 'GSI3',
        KeySchema: [
          { AttributeName: 'GSI3PK', KeyType: 'HASH' },
          { AttributeName: 'GSI3SK', KeyType: 'RANGE' },
        ],
        Projection: { ProjectionType: 'ALL' },
      },
      {
        IndexName: 'GSI4',
        KeySchema: [
          { AttributeName: 'GSI4PK', KeyType: 'HASH' },
          { AttributeName: 'GSI4SK', KeyType: 'RANGE' },
        ],
        Projection: { ProjectionType: 'ALL' },
      },
    ],
    TTL: {
      AttributeName: 'expiresAt',
      Enabled: true,
    },
  });

  // Auth challenges table
  await createTable({
    TableName: 'wfl-auth-challenges-dev',
    AttributeDefinitions: [
      { AttributeName: 'PK', AttributeType: 'S' },
      { AttributeName: 'SK', AttributeType: 'S' },
    ],
    KeySchema: [
      { AttributeName: 'PK', KeyType: 'HASH' },
      { AttributeName: 'SK', KeyType: 'RANGE' },
    ],
    BillingMode: 'PAY_PER_REQUEST',
    TTL: {
      AttributeName: 'TTL',
      Enabled: true,
    },
  });

  console.log('\n✅ All tables created successfully!');
  console.log('\nYou can now:');
  console.log('  1. Start the local backend:  npm run dev');
  console.log('  2. Start the mobile app:     cd apps/mobile && npm start');
  console.log('  3. View DynamoDB data:       http://localhost:8001');
}

setupTables().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
