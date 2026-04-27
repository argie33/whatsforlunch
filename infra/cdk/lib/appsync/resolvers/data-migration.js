// Data Migration Utilities
// Schema evolution and data transformation helpers

const { ddb, TABLE_NAME, getCurrentTimestamp } = require('./utils');

/**
 * Migration runner for handling schema changes
 */
class MigrationRunner {
  constructor() {
    this.migrations = [];
    this.appliedMigrations = new Set();
  }

  /**
   * Register a new migration
   */
  register(migration) {
    this.migrations.push({
      id: migration.id,
      description: migration.description,
      up: migration.up,
      down: migration.down,
      version: migration.version || 1,
    });
  }

  /**
   * Get pending migrations
   */
  getPending() {
    return this.migrations.filter((m) => !this.appliedMigrations.has(m.id));
  }

  /**
   * Run all pending migrations
   */
  async runPending() {
    const pending = this.getPending();
    const results = [];

    for (const migration of pending) {
      try {
        console.log(`[migration] Running: ${migration.id} - ${migration.description}`);
        await migration.up();
        this.appliedMigrations.add(migration.id);

        results.push({
          id: migration.id,
          status: 'success',
          timestamp: getCurrentTimestamp(),
        });

        console.log(`[migration] Completed: ${migration.id}`);
      } catch (error) {
        results.push({
          id: migration.id,
          status: 'failed',
          error: error.message,
          timestamp: getCurrentTimestamp(),
        });

        console.error(`[migration] Failed: ${migration.id}`, error);

        // Stop on first failure
        break;
      }
    }

    return results;
  }

  /**
   * Rollback last migration
   */
  async rollback() {
    const applied = Array.from(this.appliedMigrations);
    if (applied.length === 0) {
      return { status: 'no-migrations-to-rollback' };
    }

    const lastMigrationId = applied[applied.length - 1];
    const migration = this.migrations.find((m) => m.id === lastMigrationId);

    if (!migration || !migration.down) {
      return {
        status: 'error',
        message: 'Migration not found or does not support rollback',
      };
    }

    try {
      console.log(`[migration] Rolling back: ${lastMigrationId}`);
      await migration.down();
      this.appliedMigrations.delete(lastMigrationId);

      console.log(`[migration] Rollback completed: ${lastMigrationId}`);
      return {
        status: 'success',
        migrationId: lastMigrationId,
      };
    } catch (error) {
      return {
        status: 'error',
        message: error.message,
      };
    }
  }
}

/**
 * Batch migrate items with schema changes
 */
async function batchMigrateItems(householdId, transformFn, batchSize = 25) {
  const results = {
    processed: 0,
    updated: 0,
    failed: 0,
  };

  const queryParams = {
    TableName: TABLE_NAME,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
    ExpressionAttributeValues: {
      ':pk': `HOUSEHOLD#${householdId}`,
      ':sk': 'ITEM#',
    },
  };

  const items = await ddb.query(queryParams).promise();
  const itemBatches = chunkArray(items.Items || [], batchSize);

  for (const batch of itemBatches) {
    const updates = [];

    for (const item of batch) {
      try {
        const transformed = await transformFn(item);

        if (transformed !== item) {
          updates.push(transformed);
          results.updated++;
        }
        results.processed++;
      } catch (error) {
        console.error(`Failed to transform item ${item.id}:`, error);
        results.failed++;
      }
    }

    // Batch write updates
    if (updates.length > 0) {
      const putRequests = updates.map((item) => ({
        PutRequest: {
          Item: {
            ...item,
            _version: item._version + 1,
            _lastChangedAt: Date.now(),
            updatedAt: getCurrentTimestamp(),
          },
        },
      }));

      try {
        await ddb
          .batchWrite({
            RequestItems: {
              [TABLE_NAME]: putRequests,
            },
          })
          .promise();
      } catch (error) {
        console.error('Batch write failed:', error);
      }
    }
  }

  return results;
}

/**
 * Add field to all items of a type
 */
async function addFieldToEntities(entityType, fieldName, defaultValue) {
  const scanParams = {
    TableName: TABLE_NAME,
    FilterExpression: 'entityType = :type',
    ExpressionAttributeValues: {
      ':type': entityType,
    },
  };

  const result = await ddb.scan(scanParams).promise();
  const items = result.Items || [];
  const batchSize = 25;

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const putRequests = batch.map((item) => ({
      PutRequest: {
        Item: {
          ...item,
          [fieldName]: defaultValue,
          _version: item._version + 1,
          _lastChangedAt: Date.now(),
          updatedAt: getCurrentTimestamp(),
        },
      },
    }));

    await ddb
      .batchWrite({
        RequestItems: {
          [TABLE_NAME]: putRequests,
        },
      })
      .promise();
  }

  return {
    entityType,
    fieldAdded: fieldName,
    itemsUpdated: items.length,
  };
}

/**
 * Rename field across all items
 */
async function renameField(entityType, oldFieldName, newFieldName) {
  const scanParams = {
    TableName: TABLE_NAME,
    FilterExpression: 'entityType = :type AND attribute_exists(#field)',
    ExpressionAttributeNames: {
      '#field': oldFieldName,
    },
    ExpressionAttributeValues: {
      ':type': entityType,
    },
  };

  const result = await ddb.scan(scanParams).promise();
  const items = result.Items || [];

  for (const item of items) {
    const updated = {
      ...item,
      [newFieldName]: item[oldFieldName],
      _version: item._version + 1,
      _lastChangedAt: Date.now(),
      updatedAt: getCurrentTimestamp(),
    };

    delete updated[oldFieldName];

    await ddb
      .put({
        TableName: TABLE_NAME,
        Item: updated,
      })
      .promise();
  }

  return {
    entityType,
    oldField: oldFieldName,
    newField: newFieldName,
    itemsUpdated: items.length,
  };
}

/**
 * Example migration for reference
 */
const EXAMPLE_MIGRATIONS = {
  '001_add_archived_at': {
    id: '001_add_archived_at',
    description: 'Add archivedAt field to Container entities',
    version: '1.0.0',
    async up() {
      return addFieldToEntities('Container', 'archivedAt', null);
    },
    async down() {
      // Remove field - implement as needed
      console.log('Rollback: removing archivedAt field');
    },
  },

  '002_add_status_color': {
    id: '002_add_status_color',
    description: 'Add computed statusColor to Item entities',
    version: '1.1.0',
    async up() {
      return addFieldToEntities('Item', 'statusColor', 'green');
    },
    async down() {
      console.log('Rollback: removing statusColor field');
    },
  },

  '003_rename_category_to_foodtype': {
    id: '003_rename_category_to_foodtype',
    description: 'Rename category field to foodType in Item',
    version: '1.2.0',
    async up() {
      return renameField('Item', 'category', 'foodType');
    },
    async down() {
      return renameField('Item', 'foodType', 'category');
    },
  },
};

function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

module.exports = {
  MigrationRunner,
  batchMigrateItems,
  addFieldToEntities,
  renameField,
  EXAMPLE_MIGRATIONS,
};
