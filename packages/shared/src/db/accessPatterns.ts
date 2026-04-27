/**
 * DynamoDB Access Patterns
 * Helper functions for querying the single-table DynamoDB design
 *
 * Key structure:
 * - Main table: wfl-main-{env}
 * - PK (partition key): Entity type + ID (e.g., USER#userId, HOUSEHOLD#householdId)
 * - SK (sort key): Entity type + ID (e.g., PROFILE, MEMBER#userId)
 * - 4 GSIs for common queries
 */

export interface DynamoDBKey {
  PK: string;
  SK: string;
}

/**
 * Profile Access Patterns
 */
export const profileKey = (userId: string): DynamoDBKey => ({
  PK: `USER#${userId}`,
  SK: 'PROFILE',
});

/**
 * Household Access Patterns
 */
export const householdMetaKey = (householdId: string): DynamoDBKey => ({
  PK: `HOUSEHOLD#${householdId}`,
  SK: 'META',
});

export const householdMemberKey = (householdId: string, userId: string): DynamoDBKey => ({
  PK: `HOUSEHOLD#${householdId}`,
  SK: `MEMBER#${userId}`,
});

/**
 * GSI1: User → all their households
 * Query with GSI1PK = USER#{userId}
 * Returns all HouseholdMember records where user is a member
 */
export const gsi1UserHouseholds = (userId: string) => ({
  GSI1PK: `USER#${userId}`,
  // GSI1SK varies: PROFILE | HOUSEHOLD#{id}
});

/**
 * Container Access Patterns
 */
export const containerKey = (householdId: string, containerId: string): DynamoDBKey => ({
  PK: `HOUSEHOLD#${householdId}`,
  SK: `CONTAINER#${containerId}`,
});

/**
 * GSI4: Lookup container by QR token
 * Query with GSI4PK = QR_TOKEN#{token}
 */
export const gsi4ContainerByQr = (qrToken: string) => ({
  GSI4PK: `QR_TOKEN#${qrToken}`,
  // GSI4SK = CONTAINER
});

/**
 * Item Access Patterns
 */
export const itemKey = (householdId: string, itemId: string): DynamoDBKey => ({
  PK: `HOUSEHOLD#${householdId}`,
  SK: `ITEM#${itemId}`,
});

/**
 * GSI2: Items expiring soon (sparse index)
 * Query with GSI2PK = EXPIRING#{householdId}, GSI2SK between now and future date
 * Only populated for active items within 14 days of expiry
 */
export const gsi2ExpiringItems = (householdId: string) => ({
  GSI2PK: `EXPIRING#${householdId}`,
  // GSI2SK = expiryAt timestamp (ISO 8601)
  // Query for GSI2SK BETWEEN now AND (now + 14 days)
});

/**
 * GSI3: Per-user items across all households
 * Query with GSI3PK = USER_ITEMS#{userId}
 * Returns items sorted by storedAt descending
 */
export const gsi3UserItems = (userId: string) => ({
  GSI3PK: `USER_ITEMS#${userId}`,
  // GSI3SK = storedAt timestamp
});

/**
 * GSI4: Barcode lookup
 * Query with GSI4PK = BARCODE#{barcode}
 * Returns all items with that barcode (deduplication)
 */
export const gsi4ItemsByBarcode = (barcode: string) => ({
  GSI4PK: `BARCODE#${barcode}`,
  // GSI4SK = ITEM#{itemId}
});

/**
 * Household Invite Access Patterns
 */
export const householdInviteKey = (householdId: string, inviteId: string): DynamoDBKey => ({
  PK: `HOUSEHOLD#${householdId}`,
  SK: `INVITE#${inviteId}`,
});

/**
 * GSI4: Lookup invite by token
 * Query with GSI4PK = INVITE_TOKEN#{token}
 */
export const gsi4InviteByToken = (token: string) => ({
  GSI4PK: `INVITE_TOKEN#${token}`,
  // GSI4SK = INVITE
});

/**
 * Item Event (audit log)
 */
export const itemEventKey = (householdId: string, itemId: string, timestamp: string): DynamoDBKey => ({
  PK: `HOUSEHOLD#${householdId}`,
  SK: `EVENT#${itemId}#${timestamp}`,
});

/**
 * AI Classification (audit trail)
 */
export const aiClassificationKey = (householdId: string, itemId: string, timestamp: string): DynamoDBKey => ({
  PK: `HOUSEHOLD#${householdId}`,
  SK: `AI#${itemId}#${timestamp}`,
});

/**
 * OCR Job
 */
export const ocrJobKey = (householdId: string, jobId: string): DynamoDBKey => ({
  PK: `HOUSEHOLD#${householdId}`,
  SK: `OCR#${jobId}`,
});

/**
 * Food Rules (global, not per-household)
 */
export const foodRuleKey = (foodType: string): DynamoDBKey => ({
  PK: 'RULES',
  SK: `FOOD#${foodType}`,
});

/**
 * Shopping List Item
 */
export const shoppingListItemKey = (householdId: string, itemId: string): DynamoDBKey => ({
  PK: `HOUSEHOLD#${householdId}`,
  SK: `SHOP#${itemId}`,
});

/**
 * Recipe
 */
export const recipeKey = (householdId: string, recipeId: string): DynamoDBKey => ({
  PK: `HOUSEHOLD#${householdId}`,
  SK: `RECIPE#${recipeId}`,
});

/**
 * Device (push notification targets)
 */
export const deviceKey = (userId: string, deviceId: string): DynamoDBKey => ({
  PK: `USER#${userId}`,
  SK: `DEVICE#${deviceId}`,
});

/**
 * Rate Limit Counter (sparse, temporary)
 */
export const rateLimitKey = (userId: string, windowStart: number): DynamoDBKey => ({
  PK: `RATELIMIT#${userId}`,
  SK: `WINDOW#${windowStart}`,
});

/**
 * Notification Log
 */
export const notificationLogKey = (userId: string, timestamp: string, id: string): DynamoDBKey => ({
  PK: `USER#${userId}`,
  SK: `NOTIF#${timestamp}#${id}`,
});

/**
 * Common entity types
 */
export enum EntityType {
  PROFILE = 'Profile',
  HOUSEHOLD = 'Household',
  HOUSEHOLD_MEMBER = 'HouseholdMember',
  HOUSEHOLD_INVITE = 'HouseholdInvite',
  CONTAINER = 'Container',
  ITEM = 'Item',
  FOOD_RULE = 'FoodRule',
  ITEM_EVENT = 'ItemEvent',
  AI_CLASSIFICATION = 'AiClassification',
  OCR_JOB = 'OcrJob',
  DEVICE = 'Device',
  NOTIFICATION_LOG = 'NotificationLog',
  SHOPPING_LIST_ITEM = 'ShoppingListItem',
  RECIPE = 'Recipe',
}

/**
 * GSI Partition Keys (for querying)
 */
export const gsi1pk = (userId: string) => `USER#${userId}`;
export const gsi2pk = (householdId: string) => `EXPIRING#${householdId}`;
export const gsi3pk = (userId: string) => `USER_ITEMS#${userId}`;
export const gsi4pkQrToken = (token: string) => `QR_TOKEN#${token}`;
export const gsi4pkBarcode = (barcode: string) => `BARCODE#${barcode}`;
export const gsi4pkInviteToken = (token: string) => `INVITE_TOKEN#${token}`;
