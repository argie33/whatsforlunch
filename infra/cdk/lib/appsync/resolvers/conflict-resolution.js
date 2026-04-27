// Conflict Resolution Helpers
// Handle version conflicts and concurrent modifications

const { ddb, TABLE_NAME, getCurrentTimestamp } = require('./utils');

/**
 * Conflict resolution strategies for concurrent updates
 */
const ConflictStrategy = {
  FAIL: 'fail', // Throw error (default)
  OVERWRITE: 'overwrite', // Client wins (last write wins)
  MERGE: 'merge', // Merge changes (field-level)
  ABORT: 'abort', // Retry with exponential backoff
};

/**
 * Detect version conflict
 */
function detectConflict(clientVersion, serverVersion) {
  return clientVersion !== serverVersion;
}

/**
 * Resolve conflict using merge strategy
 * Combines client and server changes at field level
 */
async function resolveConflictMerge(pk, sk, clientChanges, expectedVersion) {
  // Get current server state
  const current = await ddb
    .get({
      TableName: TABLE_NAME,
      Key: { PK: pk, SK: sk },
    })
    .promise();

  if (!current.Item) {
    throw new Error('Item not found');
  }

  const server = current.Item;

  if (server._version !== expectedVersion) {
    // Version mismatch - need to fetch more recent version
    return {
      resolved: false,
      conflict: true,
      currentVersion: server._version,
      changes: clientChanges,
      serverData: server,
    };
  }

  // Merge strategy: client fields override server fields
  const merged = {
    ...server,
    ...clientChanges,
    _version: server._version + 1,
    _lastChangedAt: Date.now(),
    updatedAt: getCurrentTimestamp(),
  };

  return {
    resolved: true,
    conflict: false,
    merged,
  };
}

/**
 * Resolve conflict using field-level merge
 * Only overwrite fields that changed on client side
 */
async function resolveConflictFieldMerge(pk, sk, clientChanges, expectedVersion, fieldsToMerge = []) {
  const current = await ddb
    .get({
      TableName: TABLE_NAME,
      Key: { PK: pk, SK: sk },
    })
    .promise();

  if (!current.Item) {
    throw new Error('Item not found');
  }

  const server = current.Item;

  if (server._version !== expectedVersion) {
    return {
      resolved: false,
      conflict: true,
      currentVersion: server._version,
    };
  }

  // Only merge specified fields
  const merged = { ...server };

  for (const field of fieldsToMerge) {
    if (clientChanges.hasOwnProperty(field)) {
      merged[field] = clientChanges[field];
    }
  }

  merged._version = server._version + 1;
  merged._lastChangedAt = Date.now();
  merged.updatedAt = getCurrentTimestamp();

  return {
    resolved: true,
    conflict: false,
    merged,
  };
}

/**
 * Three-way merge (old, client, server)
 * For complex conflict scenarios
 */
async function threeWayMerge(pk, sk, oldVersion, clientChanges, expectedVersion) {
  const current = await ddb
    .get({
      TableName: TABLE_NAME,
      Key: { PK: pk, SK: sk },
    })
    .promise();

  if (!current.Item) {
    throw new Error('Item not found');
  }

  const server = current.Item;

  if (server._version !== expectedVersion) {
    return {
      resolved: false,
      conflict: true,
      conflictingFields: [],
    };
  }

  // Fetch old version from events if available
  const conflictingFields = [];
  const merged = { ...server };

  // Detect which fields changed on client vs server
  for (const key in clientChanges) {
    if (server[key] !== undefined && server[key] !== oldVersion?.[key]) {
      // Both sides changed this field - conflict
      conflictingFields.push({
        field: key,
        clientValue: clientChanges[key],
        serverValue: server[key],
        oldValue: oldVersion?.[key],
      });
      // Client wins
      merged[key] = clientChanges[key];
    } else {
      // Only client changed, or no conflict
      merged[key] = clientChanges[key];
    }
  }

  if (conflictingFields.length > 0) {
    return {
      resolved: true,
      conflict: true,
      conflictingFields,
      merged,
      strategy: 'client-wins',
    };
  }

  merged._version = server._version + 1;
  merged._lastChangedAt = Date.now();
  merged.updatedAt = getCurrentTimestamp();

  return {
    resolved: true,
    conflict: false,
    merged,
  };
}

/**
 * Abort and retry with exponential backoff
 * Returns retry parameters
 */
function getRetryParameters(attemptNumber = 1) {
  const maxAttempts = 5;
  const baseDelay = 100; // ms
  const maxDelay = 10000; // ms

  if (attemptNumber >= maxAttempts) {
    return {
      shouldRetry: false,
      error: 'Max retry attempts exceeded',
    };
  }

  // Exponential backoff with jitter
  const delay = Math.min(baseDelay * Math.pow(2, attemptNumber - 1), maxDelay);
  const jitter = Math.random() * delay * 0.1;

  return {
    shouldRetry: true,
    attemptNumber: attemptNumber + 1,
    delay: Math.floor(delay + jitter),
  };
}

/**
 * Log conflict for analysis and monitoring
 */
async function logConflict(pk, sk, clientVersion, serverVersion, strategy, resolution) {
  const conflictLog = {
    PK: pk,
    SK: `CONFLICT#${Date.now()}#${Math.random()}`,
    entityType: 'ConflictLog',
    clientVersion,
    serverVersion,
    strategy,
    resolution,
    timestamp: getCurrentTimestamp(),
    _version: 1,
    _lastChangedAt: Date.now(),
  };

  try {
    await ddb
      .put({
        TableName: TABLE_NAME,
        Item: conflictLog,
      })
      .promise();
  } catch (error) {
    console.error('Failed to log conflict:', error);
  }
}

/**
 * Create conflict resolution directive for GraphQL
 * Returns directive that automatically handles common conflicts
 */
function createConflictDirective(resolveStrategy = ConflictStrategy.FAIL) {
  return {
    type: 'directive',
    name: '@conflictResolution',
    arguments: {
      strategy: resolveStrategy,
      fieldsToMerge: [],
    },
  };
}

module.exports = {
  ConflictStrategy,
  detectConflict,
  resolveConflictMerge,
  resolveConflictFieldMerge,
  threeWayMerge,
  getRetryParameters,
  logConflict,
  createConflictDirective,
};
