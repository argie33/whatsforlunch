#!/usr/bin/env node

/**
 * Seed Local DynamoDB with Test Data
 * Creates sample households, items, and users for local development
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

const TABLE_NAME = 'wfl-main-dev';

interface Item {
  PK: { S: string };
  SK: { S: string };
  [key: string]: any;
}

async function putItem(item: Item) {
  try {
    await dynamodb.putItem({
      TableName: TABLE_NAME,
      Item: item,
    });
  } catch (error: any) {
    console.error('Error putting item:', error.message);
    throw error;
  }
}

async function seedData() {
  console.log('🌱 Seeding local DynamoDB with test data...\n');

  const now = new Date().toISOString();
  const userId = 'user-dev-001';
  const householdId = 'household-dev-001';

  // 1. Create user profile
  console.log('Creating user profile...');
  await putItem({
    PK: { S: `USER#${userId}` },
    SK: { S: 'PROFILE' },
    entityType: { S: 'Profile' },
    email: { S: 'dev@example.com' },
    displayName: { S: 'Dev User' },
    timezone: { S: 'UTC' },
    units: { S: 'metric' },
    locale: { S: 'en-US' },
    createdAt: { S: now },
    _version: { N: '1' },
    GSI1PK: { S: `USER#${userId}` },
    GSI1SK: { S: 'PROFILE' },
  });

  // 2. Create household
  console.log('Creating household...');
  await putItem({
    PK: { S: `HOUSEHOLD#${householdId}` },
    SK: { S: 'META' },
    entityType: { S: 'Household' },
    name: { S: 'Dev Kitchen' },
    ownerId: { S: userId },
    createdAt: { S: now },
    _version: { N: '1' },
  });

  // 3. Add user to household as owner
  console.log('Adding user to household...');
  await putItem({
    PK: { S: `HOUSEHOLD#${householdId}` },
    SK: { S: `MEMBER#${userId}` },
    entityType: { S: 'HouseholdMember' },
    role: { S: 'owner' },
    joinedAt: { S: now },
    GSI1PK: { S: `USER#${userId}` },
    GSI1SK: { S: `HOUSEHOLD#${householdId}` },
  });

  // 4. Create sample items
  console.log('Creating sample items...');
  const sampleItems = [
    {
      name: 'Cooked Chicken Breast',
      type: 'protein',
      daysExpiry: 3,
      location: 'fridge',
    },
    {
      name: 'Greek Yogurt',
      type: 'dairy',
      daysExpiry: 10,
      location: 'fridge',
    },
    {
      name: 'Leftover Pasta',
      type: 'prepared',
      daysExpiry: 4,
      location: 'fridge',
    },
    {
      name: 'Frozen Berries',
      type: 'produce',
      daysExpiry: 180,
      location: 'freezer',
    },
    {
      name: 'Olive Oil',
      type: 'condiment',
      daysExpiry: null,
      location: 'pantry',
    },
    {
      name: 'Brown Rice',
      type: 'grain',
      daysExpiry: null,
      location: 'pantry',
    },
    {
      name: 'Milk',
      type: 'dairy',
      daysExpiry: 7,
      location: 'fridge',
    },
    {
      name: 'Tomato Sauce',
      type: 'sauce',
      daysExpiry: 45,
      location: 'pantry',
    },
    {
      name: 'Salmon Fillet',
      type: 'protein',
      daysExpiry: 2,
      location: 'fridge',
    },
    {
      name: 'Spinach',
      type: 'produce',
      daysExpiry: 5,
      location: 'fridge',
    },
  ];

  for (const sampleItem of sampleItems) {
    const itemId = `item-dev-${Math.random().toString(36).substr(2, 9)}`;
    const expiryDate = sampleItem.daysExpiry
      ? new Date(Date.now() + sampleItem.daysExpiry * 24 * 60 * 60 * 1000).toISOString()
      : null;

    await putItem({
      PK: { S: `HOUSEHOLD#${householdId}` },
      SK: { S: `ITEM#${itemId}` },
      entityType: { S: 'Item' },
      foodName: { S: sampleItem.name },
      foodType: { S: sampleItem.type },
      category: { S: sampleItem.type },
      storageLocation: { S: sampleItem.location },
      status: { S: 'active' },
      ...(expiryDate && { expiryAt: { S: expiryDate } }),
      storedAt: { S: now },
      createdBy: { S: userId },
      createdAt: { S: now },
      _version: { N: '1' },
      _lastChangedAt: { N: Date.now().toString() },
      ...(expiryDate && {
        GSI2PK: { S: `EXPIRING#${householdId}` },
        GSI2SK: { S: expiryDate },
      }),
      GSI3PK: { S: `USER_ITEMS#${userId}` },
      GSI3SK: { S: now },
    });

    console.log(`  ✓ ${sampleItem.name}`);
  }

  console.log('\n✅ Seeding complete!');
  console.log('\nSample data created:');
  console.log(`  User: ${userId} (dev@example.com)`);
  console.log(`  Household: ${householdId} (Dev Kitchen)`);
  console.log(`  Items: 10 sample food items`);
  console.log('\nYou can now start the mobile app and see this data locally.');
}

seedData().catch((error) => {
  console.error('Seeding failed:', error);
  process.exit(1);
});
