// Query Helpers
// Complex query building, filtering, and aggregation utilities

const { ddb, TABLE_NAME } = require('./utils');

/**
 * Get household stats (used in dashboard)
 */
async function getHouseholdStats(householdId) {
  const itemsResult = await ddb
    .query({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `HOUSEHOLD#${householdId}`,
        ':sk': 'ITEM#',
      },
    })
    .promise();

  const items = itemsResult.Items || [];
  const now = Date.now();

  const stats = {
    totalItems: 0,
    activeItems: 0,
    expiringToday: 0,
    expiringThisWeek: 0,
    frozen: 0,
    eaten: 0,
    tossed: 0,
  };

  for (const item of items) {
    if (item.deletedAt) continue;

    stats.totalItems++;

    if (item.status === 'active') {
      stats.activeItems++;

      const expiryMs = new Date(item.expiryAt).getTime();
      const hoursUntil = (expiryMs - now) / (1000 * 60 * 60);

      if (hoursUntil <= 24 && hoursUntil > 0) {
        stats.expiringToday++;
      } else if (hoursUntil <= 168) {
        stats.expiringThisWeek++;
      }
    } else if (item.status === 'frozen') {
      stats.frozen++;
    } else if (item.status === 'eaten') {
      stats.eaten++;
    } else if (item.status === 'tossed') {
      stats.tossed++;
    }
  }

  return stats;
}

/**
 * Get items by storage location
 */
async function getItemsByStorageLocation(householdId, location) {
  const result = await ddb
    .query({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `HOUSEHOLD#${householdId}`,
        ':sk': 'ITEM#',
      },
      FilterExpression:
        '#location = :location AND #status = :status AND attribute_not_exists(#deletedAt)',
      ExpressionAttributeNames: {
        '#location': 'storageLocation',
        '#status': 'status',
        '#deletedAt': 'deletedAt',
      },
      ExpressionAttributeValues: {
        ':location': location,
        ':status': 'active',
      },
    })
    .promise();

  return result.Items || [];
}

/**
 * Get items by category
 */
async function getItemsByCategory(householdId, category) {
  const result = await ddb
    .query({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `HOUSEHOLD#${householdId}`,
        ':sk': 'ITEM#',
      },
      FilterExpression:
        '#category = :category AND #status = :status AND attribute_not_exists(#deletedAt)',
      ExpressionAttributeNames: {
        '#category': 'category',
        '#status': 'status',
        '#deletedAt': 'deletedAt',
      },
      ExpressionAttributeValues: {
        ':category': category,
        ':status': 'active',
      },
    })
    .promise();

  return result.Items || [];
}

/**
 * Get wastage stats for a household
 */
async function getWastageStats(householdId, daysBack = 30) {
  const result = await ddb
    .query({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `HOUSEHOLD#${householdId}`,
        ':sk': 'ITEM#',
      },
    })
    .promise();

  const items = result.Items || [];
  const cutoffDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);

  const stats = {
    totalTossed: 0,
    itemsTossedCount: 0,
    categories: {},
    byUser: {},
  };

  for (const item of items) {
    if (item.status === 'tossed' && new Date(item.updatedAt) > cutoffDate) {
      stats.totalTossed++;
      stats.itemsTossedCount++;

      // Track by category
      const category = item.category || 'unknown';
      if (!stats.categories[category]) {
        stats.categories[category] = 0;
      }
      stats.categories[category]++;

      // Track by user
      const userId = item.createdByUserId || 'unknown';
      if (!stats.byUser[userId]) {
        stats.byUser[userId] = 0;
      }
      stats.byUser[userId]++;
    }
  }

  return stats;
}

/**
 * Get items expiring by date range
 */
async function getItemsExpiringByDate(householdId, startDate, endDate) {
  const result = await ddb
    .query({
      TableName: TABLE_NAME,
      IndexName: 'GSI2',
      KeyConditionExpression: 'GSI2PK = :pk AND GSI2SK BETWEEN :start AND :end',
      ExpressionAttributeValues: {
        ':pk': `EXPIRING#${householdId}`,
        ':start': startDate.toISOString(),
        ':end': endDate.toISOString(),
      },
      FilterExpression: '#status = :active AND attribute_not_exists(#deletedAt)',
      ExpressionAttributeNames: {
        '#status': 'status',
        '#deletedAt': 'deletedAt',
      },
      ExpressionAttributeValues: {
        ':active': 'active',
      },
    })
    .promise();

  return result.Items || [];
}

/**
 * Get items by barcode
 */
async function getItemByBarcode(barcode) {
  const result = await ddb
    .query({
      TableName: TABLE_NAME,
      IndexName: 'GSI4',
      KeyConditionExpression: 'GSI4PK = :pk AND GSI4SK = :sk',
      ExpressionAttributeValues: {
        ':pk': `BARCODE#${barcode}`,
        ':sk': 'ITEM',
      },
      FilterExpression: 'attribute_not_exists(#deletedAt)',
      ExpressionAttributeNames: {
        '#deletedAt': 'deletedAt',
      },
    })
    .promise();

  return result.Items?.[0] || null;
}

/**
 * Get container usage stats
 */
async function getContainerStats(householdId, containerId) {
  const result = await ddb
    .query({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `HOUSEHOLD#${householdId}`,
        ':sk': 'ITEM#',
      },
      FilterExpression: '#containerId = :containerId AND attribute_not_exists(#deletedAt)',
      ExpressionAttributeNames: {
        '#containerId': 'containerId',
        '#deletedAt': 'deletedAt',
      },
      ExpressionAttributeValues: {
        ':containerId': containerId,
      },
    })
    .promise();

  const items = result.Items || [];

  return {
    totalItems: items.length,
    activeItems: items.filter((i) => i.status === 'active').length,
    frozenItems: items.filter((i) => i.status === 'frozen').length,
    expiringItems: items.filter((i) => {
      const expiryMs = new Date(i.expiryAt).getTime();
      const hoursUntil = (expiryMs - Date.now()) / (1000 * 60 * 60);
      return i.status === 'active' && hoursUntil <= 168;
    }).length,
  };
}

/**
 * Search across multiple fields
 */
async function searchItems(householdId, searchTerm) {
  const lower = searchTerm.toLowerCase();

  const result = await ddb
    .query({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `HOUSEHOLD#${householdId}`,
        ':sk': 'ITEM#',
      },
    })
    .promise();

  const items = result.Items || [];

  return items.filter(
    (item) =>
      !item.deletedAt &&
      (item.foodType?.toLowerCase().includes(lower) ||
        item.notes?.toLowerCase().includes(lower) ||
        item.barcode?.includes(lower))
  );
}

module.exports = {
  getHouseholdStats,
  getItemsByStorageLocation,
  getItemsByCategory,
  getWastageStats,
  getItemsExpiringByDate,
  getItemByBarcode,
  getContainerStats,
  searchItems,
};
