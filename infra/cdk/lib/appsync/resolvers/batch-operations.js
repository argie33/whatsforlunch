// Batch Operations Helper
// Efficient bulk operations using DynamoDB batch write/query

const { ddb, TABLE_NAME } = require('./utils');
const { logItemEvent } = require('./event-logger');

/**
 * Batch delete items (soft delete)
 * Returns count of deleted items
 */
async function batchSoftDeleteItems(householdId, itemIds, userId) {
  const timestamp = new Date().toISOString();
  const chunks = chunkArray(itemIds, 25); // DynamoDB batch limit
  let deletedCount = 0;

  for (const chunk of chunks) {
    const params = {
      RequestItems: {
        [TABLE_NAME]: chunk.map((itemId) => ({
          UpdateRequest: {
            Key: {
              PK: `HOUSEHOLD#${householdId}`,
              SK: `ITEM#${itemId}`,
            },
            UpdateExpression: 'SET #deletedAt = :ts, #updatedAt = :ts, #version = #version + :inc',
            ExpressionAttributeNames: {
              '#deletedAt': 'deletedAt',
              '#updatedAt': 'updatedAt',
              '#version': '_version',
            },
            ExpressionAttributeValues: {
              ':ts': timestamp,
              ':inc': 1,
            },
          },
        })),
      },
    };

    try {
      await ddb.batchWrite(params).promise();
      deletedCount += chunk.length;
    } catch (error) {
      console.error('Batch soft delete error:', error);
    }
  }

  return deletedCount;
}

/**
 * Batch update item status
 * Returns count of updated items
 */
async function batchUpdateItemStatus(householdId, itemIds, newStatus, userId) {
  const timestamp = new Date().toISOString();
  const chunks = chunkArray(itemIds, 25);
  let updatedCount = 0;

  for (const chunk of chunks) {
    const params = {
      RequestItems: {
        [TABLE_NAME]: chunk.map((itemId) => ({
          UpdateRequest: {
            Key: {
              PK: `HOUSEHOLD#${householdId}`,
              SK: `ITEM#${itemId}`,
            },
            UpdateExpression: 'SET #status = :status, #updatedAt = :ts, #version = #version + :inc',
            ExpressionAttributeNames: {
              '#status': 'status',
              '#updatedAt': 'updatedAt',
              '#version': '_version',
            },
            ExpressionAttributeValues: {
              ':status': newStatus,
              ':ts': timestamp,
              ':inc': 1,
            },
          },
        })),
      },
    };

    try {
      await ddb.batchWrite(params).promise();
      updatedCount += chunk.length;

      // Log events for each item
      for (const itemId of chunk) {
        try {
          await logItemEvent(householdId, itemId, `marked${capitalize(newStatus)}`, {
            changedBy: userId,
          });
        } catch (error) {
          console.error(`Failed to log event for item ${itemId}:`, error);
        }
      }
    } catch (error) {
      console.error('Batch status update error:', error);
    }
  }

  return updatedCount;
}

/**
 * Batch create items
 * Efficient creation of multiple items (e.g., from receipt scanner)
 */
async function batchCreateItems(householdId, items, userId) {
  const timestamp = new Date().toISOString();
  const created = [];
  const chunks = chunkArray(items, 25);

  for (const chunk of chunks) {
    const params = {
      RequestItems: {
        [TABLE_NAME]: chunk.map((item) => ({
          PutRequest: {
            Item: {
              PK: `HOUSEHOLD#${householdId}`,
              SK: `ITEM#${item.id}`,
              id: item.id,
              entityType: 'Item',
              householdId,
              containerId: item.containerId || null,
              foodType: item.foodType,
              quantity: item.quantity,
              quantityUnit: item.quantityUnit,
              status: 'active',
              expiryAt: item.expiryAt,
              storageLocation: item.storageLocation,
              purchasedAt: item.purchasedAt,
              notes: item.notes || null,
              barcode: item.barcode || null,
              photoUrl: item.photoUrl || null,
              createdByUserId: userId,
              createdAt: timestamp,
              updatedAt: timestamp,
              _version: 1,
              _lastChangedAt: Date.now(),
              // GSI keys
              GSI2PK: `EXPIRING#${householdId}`,
              GSI2SK: item.expiryAt,
              GSI3PK: `USER#${userId}`,
              GSI3SK: `ITEM#${item.id}`,
              GSI4PK: item.barcode ? `BARCODE#${item.barcode}` : null,
              GSI4SK: 'ITEM',
            },
          },
        })),
      },
    };

    try {
      await ddb.batchWrite(params).promise();
      created.push(...chunk);
    } catch (error) {
      console.error('Batch create error:', error);
    }
  }

  return created;
}

/**
 * Batch query items by IDs
 * Efficient retrieval of multiple items
 */
async function batchGetItems(householdId, itemIds) {
  const chunks = chunkArray(itemIds, 100); // DynamoDB batch get limit
  const items = [];

  for (const chunk of chunks) {
    const params = {
      RequestItems: {
        [TABLE_NAME]: {
          Keys: chunk.map((itemId) => ({
            PK: `HOUSEHOLD#${householdId}`,
            SK: `ITEM#${itemId}`,
          })),
        },
      },
    };

    const result = await ddb.batchGet(params).promise();
    if (result.Responses && result.Responses[TABLE_NAME]) {
      items.push(...result.Responses[TABLE_NAME]);
    }
  }

  return items.filter((item) => !item.deletedAt);
}

/**
 * Batch transfer items to a container
 */
async function batchTransferItems(householdId, itemIds, toContainerId, userId) {
  const timestamp = new Date().toISOString();
  const chunks = chunkArray(itemIds, 25);
  let transferredCount = 0;

  for (const chunk of chunks) {
    const params = {
      RequestItems: {
        [TABLE_NAME]: chunk.map((itemId) => ({
          UpdateRequest: {
            Key: {
              PK: `HOUSEHOLD#${householdId}`,
              SK: `ITEM#${itemId}`,
            },
            UpdateExpression:
              'SET #containerId = :containerId, #updatedAt = :ts, #version = #version + :inc',
            ExpressionAttributeNames: {
              '#containerId': 'containerId',
              '#updatedAt': 'updatedAt',
              '#version': '_version',
            },
            ExpressionAttributeValues: {
              ':containerId': toContainerId,
              ':ts': timestamp,
              ':inc': 1,
            },
          },
        })),
      },
    };

    try {
      await ddb.batchWrite(params).promise();
      transferredCount += chunk.length;
    } catch (error) {
      console.error('Batch transfer error:', error);
    }
  }

  return transferredCount;
}

// Helper function
function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

module.exports = {
  batchSoftDeleteItems,
  batchUpdateItemStatus,
  batchCreateItems,
  batchGetItems,
  batchTransferItems,
};
