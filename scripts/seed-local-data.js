#!/usr/bin/env node
/**
 * Seed local DynamoDB with test data
 * Run: node scripts/seed-local-data.js
 */

const { DynamoDB } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');
const { v4: uuid } = require('uuid');

const TABLE_NAME = 'WFL-Main-dev';
const ENDPOINT = process.env.DYNAMODB_ENDPOINT || 'http://localhost:8000';

const client = new DynamoDB({
  endpoint: ENDPOINT,
  region: 'us-west-2',
  credentials: {
    accessKeyId: 'test',
    secretAccessKey: 'test',
  },
});

const ddb = DynamoDBDocumentClient.from(client);

function getCurrentTimestamp() {
  return new Date().toISOString();
}

async function seed() {
  console.log(`Seeding data to ${TABLE_NAME}...`);

  // Test users
  const userId1 = uuid();
  const userId2 = uuid();
  const householdId = uuid();
  const containerId = uuid();
  const itemId1 = uuid();
  const itemId2 = uuid();
  const shoppingItemId = uuid();

  const items = [
    // User 1 Profile
    {
      PK: `USER#${userId1}`,
      SK: 'PROFILE',
      id: userId1,
      entityType: 'Profile',
      email: 'alice@example.com',
      displayName: 'Alice',
      photoUrl: null,
      timeZone: 'America/Los_Angeles',
      units: 'imperial',
      locale: 'en-US',
      dietaryPreferences: ['vegetarian'],
      cuisinePreferences: ['italian', 'asian'],
      allergies: [],
      defaultHouseholdId: householdId,
      createdAt: getCurrentTimestamp(),
      updatedAt: getCurrentTimestamp(),
      _version: 1,
      _lastChangedAt: Date.now(),
    },

    // User 2 Profile
    {
      PK: `USER#${userId2}`,
      SK: 'PROFILE',
      id: userId2,
      entityType: 'Profile',
      email: 'bob@example.com',
      displayName: 'Bob',
      photoUrl: null,
      timeZone: 'America/New_York',
      units: 'metric',
      locale: 'en-US',
      dietaryPreferences: [],
      cuisinePreferences: ['mexican', 'bbq'],
      allergies: ['nuts'],
      defaultHouseholdId: householdId,
      createdAt: getCurrentTimestamp(),
      updatedAt: getCurrentTimestamp(),
      _version: 1,
      _lastChangedAt: Date.now(),
    },

    // Household
    {
      PK: `HOUSEHOLD#${householdId}`,
      SK: 'METADATA',
      id: householdId,
      entityType: 'Household',
      name: 'Shared House',
      imageUrl: null,
      ownerId: userId1,
      createdAt: getCurrentTimestamp(),
      updatedAt: getCurrentTimestamp(),
      _version: 1,
      _lastChangedAt: Date.now(),
    },

    // Household Member 1 (Owner)
    {
      PK: `HOUSEHOLD#${householdId}`,
      SK: `MEMBER#${userId1}`,
      id: uuid(),
      entityType: 'HouseholdMember',
      householdId,
      userId: userId1,
      role: 'owner',
      joinedAt: getCurrentTimestamp(),
      updatedAt: getCurrentTimestamp(),
      _version: 1,
      _lastChangedAt: Date.now(),
      GSI1PK: `USER#${userId1}`,
      GSI1SK: `HOUSEHOLD#${householdId}`,
    },

    // Household Member 2
    {
      PK: `HOUSEHOLD#${householdId}`,
      SK: `MEMBER#${userId2}`,
      id: uuid(),
      entityType: 'HouseholdMember',
      householdId,
      userId: userId2,
      role: 'member',
      joinedAt: getCurrentTimestamp(),
      updatedAt: getCurrentTimestamp(),
      _version: 1,
      _lastChangedAt: Date.now(),
      GSI1PK: `USER#${userId2}`,
      GSI1SK: `HOUSEHOLD#${householdId}`,
    },

    // Container
    {
      PK: `HOUSEHOLD#${householdId}`,
      SK: `CONTAINER#${containerId}`,
      id: containerId,
      entityType: 'Container',
      householdId,
      qrToken: 'QR_ABC123_DEF456',
      nickname: 'Fridge Top',
      imageUrl: null,
      claimedAt: getCurrentTimestamp(),
      claimedBy: userId1,
      archivedAt: null,
      createdAt: getCurrentTimestamp(),
      updatedAt: getCurrentTimestamp(),
      _version: 1,
      _lastChangedAt: Date.now(),
      GSI4PK: 'QR_TOKEN#QR_ABC123_DEF456',
      GSI4SK: 'CONTAINER',
    },

    // Item 1 (expires soon)
    {
      PK: `HOUSEHOLD#${householdId}`,
      SK: `ITEM#${itemId1}`,
      id: itemId1,
      entityType: 'Item',
      householdId,
      containerId,
      foodType: 'cooked_chicken',
      quantity: 2,
      quantityUnit: 'portions',
      status: 'active',
      expiryAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
      storageLocation: 'fridge',
      purchasedAt: getCurrentTimestamp(),
      notes: 'Leftover from dinner',
      barcode: null,
      photoUrl: null,
      createdByUserId: userId1,
      createdAt: getCurrentTimestamp(),
      updatedAt: getCurrentTimestamp(),
      _version: 1,
      _lastChangedAt: Date.now(),
      GSI2PK: `EXPIRING#${householdId}`,
      GSI2SK: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      GSI3PK: `USER#${userId1}`,
      GSI3SK: `ITEM#${itemId1}`,
    },

    // Item 2 (expires in a week)
    {
      PK: `HOUSEHOLD#${householdId}`,
      SK: `ITEM#${itemId2}`,
      id: itemId2,
      entityType: 'Item',
      householdId,
      containerId,
      foodType: 'fresh_milk',
      quantity: 1,
      quantityUnit: 'liter',
      status: 'active',
      expiryAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // In a week
      storageLocation: 'fridge',
      purchasedAt: getCurrentTimestamp(),
      notes: null,
      barcode: '1234567890123',
      photoUrl: null,
      createdByUserId: userId2,
      createdAt: getCurrentTimestamp(),
      updatedAt: getCurrentTimestamp(),
      _version: 1,
      _lastChangedAt: Date.now(),
      GSI2PK: `EXPIRING#${householdId}`,
      GSI2SK: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      GSI3PK: `USER#${userId2}`,
      GSI3SK: `ITEM#${itemId2}`,
    },

    // Shopping List Item
    {
      PK: `HOUSEHOLD#${householdId}`,
      SK: `SHOP#${shoppingItemId}`,
      id: shoppingItemId,
      entityType: 'ShoppingListItem',
      householdId,
      name: 'Greek Yogurt',
      quantity: '2',
      category: 'dairy',
      notes: 'Full fat preferred',
      addedByUserId: userId1,
      purchasedAt: null,
      purchasedByUserId: null,
      autoSuggested: false,
      linkedFoodType: 'yogurt',
      createdAt: getCurrentTimestamp(),
      updatedAt: getCurrentTimestamp(),
      _version: 1,
      _lastChangedAt: Date.now(),
    },

    // Food Rules (sample)
    {
      PK: 'FOODRULES#SYSTEM',
      SK: 'cooked_chicken',
      foodType: 'cooked_chicken',
      entityType: 'FoodRule',
      fridgeDaysSafe: 3,
      freezerDaysSafe: 120,
      pantryDaysSafe: 0,
      counterHoursSafe: 2,
      description: 'Cooked chicken',
      category: 'protein',
      createdAt: getCurrentTimestamp(),
      _version: 1,
      _lastChangedAt: Date.now(),
    },

    {
      PK: 'FOODRULES#SYSTEM',
      SK: 'fresh_milk',
      foodType: 'fresh_milk',
      entityType: 'FoodRule',
      fridgeDaysSafe: 7,
      freezerDaysSafe: 180,
      pantryDaysSafe: 0,
      counterHoursSafe: 2,
      description: 'Fresh milk',
      category: 'dairy',
      createdAt: getCurrentTimestamp(),
      _version: 1,
      _lastChangedAt: Date.now(),
    },
  ];

  let count = 0;
  for (const item of items) {
    try {
      await ddb.send(
        new PutCommand({
          TableName: TABLE_NAME,
          Item: item,
        })
      );
      count++;
      console.log(`✓ Inserted ${item.entityType}: ${item.id || item.SK}`);
    } catch (error) {
      console.error(`✗ Failed to insert ${item.entityType}:`, error.message);
    }
  }

  console.log(`\nSeeded ${count}/${items.length} items`);
  console.log('\nTest user credentials:');
  console.log(`  Alice: ${userId1}`);
  console.log(`  Bob: ${userId2}`);
  console.log(`  Household: ${householdId}`);
  console.log(`  Container: ${containerId}`);
}

seed().catch((error) => {
  console.error('Seeding failed:', error);
  process.exit(1);
});
