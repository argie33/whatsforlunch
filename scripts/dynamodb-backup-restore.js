/**
 * DynamoDB Backup & Restore Utility
 * Provides tools for backing up and restoring DynamoDB tables
 *
 * Usage:
 * node dynamodb-backup-restore.js backup --table WFL-Main-dev --output backup.json
 * node dynamodb-backup-restore.js restore --table WFL-Main-dev --input backup.json
 * node dynamodb-backup-restore.js list-backups
 */

const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');
const { createReadStream, createWriteStream } = require('fs');
const readline = require('readline');

// ============================================
// Configuration
// ============================================

const dynamodb = new AWS.DynamoDB.DocumentClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

const backup = new AWS.Backup({
  region: process.env.AWS_REGION || 'us-east-1',
});

const BACKUP_DIR = path.join(__dirname, '..', 'backups');

// ============================================
// Backup Functions
// ============================================

/**
 * Create backup of DynamoDB table
 * @param {string} tableName - Table to backup
 * @param {Object} options - Backup options
 * @returns {Promise<Object>} Backup metadata
 */
async function backupTable(tableName, options = {}) {
  const { output, limit = null, filterExpression = null } = options;

  console.log(`[backup] Starting backup of ${tableName}`);

  const outputPath = output || path.join(BACKUP_DIR, `${tableName}-${Date.now()}.json`);

  // Create backups directory if needed
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  const writeStream = createWriteStream(outputPath);
  let itemCount = 0;
  let scanCount = 0;
  let dataSize = 0;

  // Write header
  writeStream.write('{"table":"' + tableName + '","items":[');
  let firstItem = true;

  // Scan table
  let params = {
    TableName: tableName,
  };

  if (filterExpression) {
    params.FilterExpression = filterExpression;
  }

  return new Promise((resolve, reject) => {
    const scanRecursive = async () => {
      try {
        const result = await dynamodb.scan(params).promise();

        scanCount++;
        result.Items.forEach((item) => {
          const itemJson = JSON.stringify(item);
          dataSize += itemJson.length;

          if (!firstItem) {
            writeStream.write(',');
          }
          writeStream.write(itemJson);
          firstItem = false;
          itemCount++;

          if (limit && itemCount >= limit) {
            throw new Error('Limit reached');
          }
        });

        // Progress logging
        if (itemCount % 1000 === 0) {
          console.log(`[backup] Progress: ${itemCount} items (${dataSize} bytes)`);
        }

        // Continue scanning if more items
        if (result.LastEvaluatedKey) {
          params.ExclusiveStartKey = result.LastEvaluatedKey;
          await scanRecursive();
        } else {
          // Scan complete
          writeStream.write(']');

          // Write footer with metadata
          const metadata = {
            timestamp: new Date().toISOString(),
            itemCount,
            dataSize,
            scans: scanCount,
          };

          writeStream.write(',"metadata":' + JSON.stringify(metadata) + '}');
          writeStream.end();

          writeStream.on('finish', () => {
            console.log(`[backup] Backup complete: ${outputPath} (${itemCount} items)`);
            resolve({
              path: outputPath,
              table: tableName,
              itemCount,
              dataSize,
              timestamp: new Date().toISOString(),
            });
          });
        }
      } catch (error) {
        if (error.message === 'Limit reached') {
          writeStream.write(']');
          const metadata = {
            timestamp: new Date().toISOString(),
            itemCount,
            dataSize,
            scans: scanCount,
            limited: true,
          };
          writeStream.write(',"metadata":' + JSON.stringify(metadata) + '}');
          writeStream.end();

          writeStream.on('finish', () => {
            console.log(`[backup] Backup limited to ${itemCount} items: ${outputPath}`);
            resolve({
              path: outputPath,
              table: tableName,
              itemCount,
              dataSize,
              limited: true,
            });
          });
        } else {
          reject(error);
        }
      }
    };

    scanRecursive();
  });
}

// ============================================
// Restore Functions
// ============================================

/**
 * Restore table from backup
 * @param {string} tableName - Table to restore to
 * @param {string} backupFile - Path to backup file
 * @param {Object} options - Restore options
 * @returns {Promise<Object>} Restore result
 */
async function restoreTable(tableName, backupFile, options = {}) {
  const { batchSize = 25, dryRun = false } = options;

  if (!fs.existsSync(backupFile)) {
    throw new Error(`Backup file not found: ${backupFile}`);
  }

  console.log(`[restore] Starting restore of ${tableName} from ${backupFile}`);

  if (dryRun) {
    console.log('[restore] DRY RUN - no data will be written');
  }

  return new Promise(async (resolve, reject) => {
    let itemCount = 0;
    let batchCount = 0;
    let errorCount = 0;
    const batch = [];

    const fileStream = createReadStream(backupFile);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });

    let inItemsArray = false;

    rl.on('line', async (line) => {
      // Parse JSON items from backup
      if (line.includes('"items":[')) {
        inItemsArray = true;
        return;
      }

      if (inItemsArray && line.includes(',"metadata"')) {
        inItemsArray = false;
        return;
      }

      if (inItemsArray && (line.startsWith('{') || line.startsWith(','))) {
        try {
          const itemJson = line.replace(/^,/, ''); // Remove leading comma
          if (itemJson.trim().length > 0) {
            const item = JSON.parse(itemJson);
            batch.push(item);

            if (batch.length >= batchSize) {
              rl.pause();
              await writeBatch(tableName, batch, dryRun);
              batchCount++;
              itemCount += batch.length;

              if (itemCount % 1000 === 0) {
                console.log(`[restore] Progress: ${itemCount} items`);
              }

              batch.length = 0;
              rl.resume();
            }
          }
        } catch (error) {
          errorCount++;
          console.error(`[restore] Parse error: ${error.message}`);
        }
      }
    });

    rl.on('close', async () => {
      // Write remaining batch
      if (batch.length > 0) {
        await writeBatch(tableName, batch, dryRun);
        itemCount += batch.length;
      }

      console.log(`[restore] Restore complete: ${itemCount} items (${errorCount} errors)`);
      resolve({
        table: tableName,
        itemsRestored: itemCount,
        errors: errorCount,
        timestamp: new Date().toISOString(),
      });
    });

    rl.on('error', reject);
  });
}

/**
 * Write batch of items
 */
async function writeBatch(tableName, items, dryRun = false) {
  if (dryRun) {
    return; // Skip actual write in dry-run mode
  }

  const requests = items.map((item) => ({
    PutRequest: {
      Item: item,
    },
  }));

  const params = {
    RequestItems: {
      [tableName]: requests,
    },
  };

  try {
    await dynamodb.batchWrite(params).promise();
  } catch (error) {
    console.error(`[restore] Batch write error: ${error.message}`);
    throw error;
  }
}

// ============================================
// List Backups
// ============================================

/**
 * List all backups
 * @returns {Array} List of backups
 */
function listBackups() {
  if (!fs.existsSync(BACKUP_DIR)) {
    console.log('No backups found');
    return [];
  }

  const files = fs.readdirSync(BACKUP_DIR);
  const backups = [];

  files.forEach((file) => {
    const filePath = path.join(BACKUP_DIR, file);
    const stats = fs.statSync(filePath);

    backups.push({
      name: file,
      size: (stats.size / 1024 / 1024).toFixed(2) + ' MB',
      date: stats.mtime.toISOString(),
      path: filePath,
    });
  });

  return backups.sort((a, b) => b.date.localeCompare(a.date));
}

// ============================================
// Delete Backups
// ============================================

/**
 * Delete old backups
 * @param {number} daysOld - Delete backups older than this many days
 */
function deleteOldBackups(daysOld = 7) {
  const backups = listBackups();
  const cutoff = Date.now() - daysOld * 24 * 60 * 60 * 1000;
  let deletedCount = 0;

  backups.forEach((backup) => {
    const backupDate = new Date(backup.date).getTime();
    if (backupDate < cutoff) {
      try {
        fs.unlinkSync(backup.path);
        console.log(`[cleanup] Deleted ${backup.name}`);
        deletedCount++;
      } catch (error) {
        console.error(`[cleanup] Failed to delete ${backup.name}: ${error.message}`);
      }
    }
  });

  console.log(`[cleanup] Deleted ${deletedCount} old backups`);
}

// ============================================
// CLI
// ============================================

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const tableName = args[2]; // After --table flag
  const inputFile = args[2]; // After --input or --output flag

  try {
    switch (command) {
      case 'backup': {
        const outputIdx = args.indexOf('--output');
        const output = outputIdx !== -1 ? args[outputIdx + 1] : null;

        const tableIdx = args.indexOf('--table');
        if (tableIdx === -1) {
          throw new Error('Missing --table parameter');
        }

        const result = await backupTable(args[tableIdx + 1], { output });
        console.log('\nBackup Result:');
        console.log(JSON.stringify(result, null, 2));
        break;
      }

      case 'restore': {
        const inputIdx = args.indexOf('--input');
        const tableIdx = args.indexOf('--table');

        if (inputIdx === -1 || tableIdx === -1) {
          throw new Error('Missing --input or --table parameter');
        }

        const dryRun = args.includes('--dry-run');
        const result = await restoreTable(args[tableIdx + 1], args[inputIdx + 1], {
          dryRun,
        });
        console.log('\nRestore Result:');
        console.log(JSON.stringify(result, null, 2));
        break;
      }

      case 'list-backups': {
        const backups = listBackups();
        console.log('\nAvailable Backups:');
        console.log('==================');
        backups.forEach((b) => {
          console.log(`${b.name}`);
          console.log(`  Size: ${b.size}`);
          console.log(`  Date: ${b.date}`);
          console.log('');
        });
        break;
      }

      case 'cleanup': {
        const daysIdx = args.indexOf('--days');
        const days = daysIdx !== -1 ? parseInt(args[daysIdx + 1]) : 7;
        deleteOldBackups(days);
        break;
      }

      default:
        console.log(`
DynamoDB Backup & Restore Utility

Usage:
  node dynamodb-backup-restore.js backup --table <table> [--output <path>]
  node dynamodb-backup-restore.js restore --table <table> --input <path> [--dry-run]
  node dynamodb-backup-restore.js list-backups
  node dynamodb-backup-restore.js cleanup [--days 7]

Examples:
  # Backup table
  node dynamodb-backup-restore.js backup --table WFL-Main-dev

  # Restore with dry-run
  node dynamodb-backup-restore.js restore --table WFL-Main-dev --input backup.json --dry-run

  # Cleanup backups older than 30 days
  node dynamodb-backup-restore.js cleanup --days 30
        `);
        break;
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

// ============================================
// Exports
// ============================================

module.exports = {
  backupTable,
  restoreTable,
  listBackups,
  deleteOldBackups,
};
