// DynamoDB single-table access patterns
// Follows the Rick Houlihan / Alex DeBrie pattern for single-table design

export const DynamoDB = {
  // Profile access patterns
  Profile: {
    // PK: USER#{userId}#PROFILE, SK: PROFILE
    pk: (userId: string) => `USER#${userId}`,
    sk: () => 'PROFILE',
    gsi1pk: (userId: string) => `USER#${userId}`,
    gsi1sk: () => 'PROFILE',
  },

  // Household access patterns
  Household: {
    // PK: HOUSEHOLD#{householdId}, SK: META
    pk: (householdId: string) => `HOUSEHOLD#${householdId}`,
    sk: () => 'META',
  },

  // HouseholdMember access patterns
  HouseholdMember: {
    // PK: HOUSEHOLD#{householdId}, SK: MEMBER#{userId}
    pk: (householdId: string) => `HOUSEHOLD#${householdId}`,
    sk: (userId: string) => `MEMBER#${userId}`,
    gsi1pk: (userId: string) => `USER#${userId}`,
    gsi1sk: (householdId: string) => `HOUSEHOLD#${householdId}`,
  },

  // HouseholdInvite access patterns
  HouseholdInvite: {
    // PK: HOUSEHOLD#{householdId}, SK: INVITE#{inviteId}
    pk: (householdId: string) => `HOUSEHOLD#${householdId}`,
    sk: (inviteId: string) => `INVITE#${inviteId}`,
    gsi4pk: (token: string) => `INVITE_TOKEN#${token}`,
    gsi4sk: () => 'INVITE',
  },

  // Container access patterns
  Container: {
    // PK: HOUSEHOLD#{householdId}, SK: CONTAINER#{containerId}
    pk: (householdId: string) => `HOUSEHOLD#${householdId}`,
    sk: (containerId: string) => `CONTAINER#${containerId}`,
    gsi4pk: (qrToken: string) => `QR_TOKEN#${qrToken}`,
    gsi4sk: () => 'CONTAINER',
  },

  // Item access patterns
  Item: {
    // PK: HOUSEHOLD#{householdId}, SK: ITEM#{itemId}
    pk: (householdId: string) => `HOUSEHOLD#${householdId}`,
    sk: (itemId: string) => `ITEM#${itemId}`,
    // GSI2: expiring soon index
    gsi2pk: (householdId: string) => `EXPIRING#${householdId}`,
    gsi2sk: (expiryAt: string) => expiryAt, // ISO 8601 for sorting
    // GSI3: user items across households
    gsi3pk: (userId: string) => `USER_ITEMS#${userId}`,
    gsi3sk: (storedAt: string) => storedAt, // ISO 8601 for sorting
    // GSI4: barcode lookup
    gsi4pk: (barcode: string) => `BARCODE#${barcode}`,
    gsi4sk: (itemId: string) => `ITEM#${itemId}`,
  },

  // FoodRule access patterns
  FoodRule: {
    // PK: RULES, SK: FOOD#{foodType}
    pk: () => 'RULES',
    sk: (foodType: string) => `FOOD#${foodType}`,
  },

  // ItemEvent access patterns (audit log)
  ItemEvent: {
    // PK: HOUSEHOLD#{householdId}, SK: EVENT#{itemId}#{timestamp}
    pk: (householdId: string) => `HOUSEHOLD#${householdId}`,
    sk: (itemId: string, timestamp: string) => `EVENT#${itemId}#${timestamp}`,
  },

  // AiClassification access patterns
  AiClassification: {
    // PK: HOUSEHOLD#{householdId}, SK: AI#{itemId}#{timestamp}
    pk: (householdId: string) => `HOUSEHOLD#${householdId}`,
    sk: (itemId: string, timestamp: string) => `AI#${itemId}#${timestamp}`,
  },

  // OcrJob access patterns
  OcrJob: {
    // PK: HOUSEHOLD#{householdId}, SK: OCR#{jobId}
    pk: (householdId: string) => `HOUSEHOLD#${householdId}`,
    sk: (jobId: string) => `OCR#${jobId}`,
  },

  // Device access patterns
  Device: {
    // PK: USER#{userId}, SK: DEVICE#{deviceId}
    pk: (userId: string) => `USER#${userId}`,
    sk: (deviceId: string) => `DEVICE#${deviceId}`,
  },

  // NotificationLog access patterns
  NotificationLog: {
    // PK: USER#{userId}, SK: NOTIF#{timestamp}#{id}
    pk: (userId: string) => `USER#${userId}`,
    sk: (timestamp: string, id: string) => `NOTIF#${timestamp}#${id}`,
  },

  // ShoppingListItem access patterns
  ShoppingListItem: {
    // PK: HOUSEHOLD#{householdId}, SK: SHOP#{itemId}
    pk: (householdId: string) => `HOUSEHOLD#${householdId}`,
    sk: (itemId: string) => `SHOP#${itemId}`,
  },
};

// Query builder helpers
export const QueryPatterns = {
  // Get user's households (via GSI1)
  getUserHouseholds: (userId: string) => ({
    gsi: 'GSI1',
    pk: `USER#${userId}`,
    sk: { beginsWith: 'HOUSEHOLD#' },
  }),

  // Get household members (query household partition)
  getHouseholdMembers: (householdId: string) => ({
    pk: `HOUSEHOLD#${householdId}`,
    sk: { beginsWith: 'MEMBER#' },
  }),

  // Get items expiring soon (via GSI2, sparse index)
  getExpiringItems: (householdId: string, daysAhead: number = 14) => ({
    gsi: 'GSI2',
    pk: `EXPIRING#${householdId}`,
    sk: { between: [new Date().toISOString(), addDays(new Date(), daysAhead).toISOString()] },
  }),

  // Get user's items across all households (via GSI3)
  getUserItems: (userId: string, limit: number = 100) => ({
    gsi: 'GSI3',
    pk: `USER_ITEMS#${userId}`,
    sk: { beginsWith: '' }, // all items
    limit,
  }),

  // Lookup container by QR token (via GSI4)
  getContainerByQrToken: (qrToken: string) => ({
    gsi: 'GSI4',
    pk: `QR_TOKEN#${qrToken}`,
    sk: 'CONTAINER',
  }),

  // Lookup item by barcode (via GSI4)
  getItemByBarcode: (barcode: string) => ({
    gsi: 'GSI4',
    pk: `BARCODE#${barcode}`,
    sk: { beginsWith: 'ITEM#' },
  }),

  // Get container history (all items in a container)
  getContainerItems: (householdId: string, containerId: string) => ({
    pk: `HOUSEHOLD#${householdId}`,
    sk: { beginsWith: `ITEM#` },
    filter: { containerId },
  }),

  // Get household items
  getHouseholdItems: (householdId: string) => ({
    pk: `HOUSEHOLD#${householdId}`,
    sk: { beginsWith: 'ITEM#' },
  }),

  // Get item events (audit trail)
  getItemEvents: (householdId: string, itemId: string) => ({
    pk: `HOUSEHOLD#${householdId}`,
    sk: { beginsWith: `EVENT#${itemId}#` },
  }),
};

// Utility
function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}
