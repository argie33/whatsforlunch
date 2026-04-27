// Request Deduplication
// Prevent duplicate operations from retries

const crypto = require('crypto');
const { ddb, TABLE_NAME, getCurrentTimestamp } = require('./utils');

/**
 * Idempotency key generator
 * Creates unique key from request parameters
 */
function generateIdempotencyKey(userId, operation, params) {
  const data = JSON.stringify({ userId, operation, params });
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Idempotent request handler
 * Ensures request is only processed once
 */
class IdempotencyManager {
  /**
   * Store request result for future identical requests
   */
  async storeResult(idempotencyKey, result, ttlSeconds = 86400) {
    const entry = {
      PK: 'IDEMPOTENCY#REQUEST',
      SK: idempotencyKey,
      entityType: 'IdempotencyEntry',
      result: JSON.stringify(result),
      idempotencyKey,
      timestamp: getCurrentTimestamp(),
      expiresAt: new Date(Date.now() + ttlSeconds * 1000).toISOString(),
      _version: 1,
      _lastChangedAt: Date.now(),
    };

    try {
      await ddb
        .put({
          TableName: TABLE_NAME,
          Item: entry,
          ConditionExpression: 'attribute_not_exists(SK)', // Only store if not exists
        })
        .promise();

      return { stored: true };
    } catch (error) {
      if (error.code === 'ConditionalCheckFailedException') {
        // Already exists
        return { stored: false, alreadyExists: true };
      }
      throw error;
    }
  }

  /**
   * Check if request already exists and return cached result
   */
  async getResult(idempotencyKey) {
    try {
      const result = await ddb
        .get({
          TableName: TABLE_NAME,
          Key: {
            PK: 'IDEMPOTENCY#REQUEST',
            SK: idempotencyKey,
          },
        })
        .promise();

      if (result.Item) {
        return {
          exists: true,
          result: JSON.parse(result.Item.result),
          timestamp: result.Item.timestamp,
        };
      }

      return { exists: false };
    } catch (error) {
      console.error('Error checking idempotency:', error);
      return { exists: false, error: error.message };
    }
  }

  /**
   * Handle request with idempotency
   */
  async executeIdempotent(idempotencyKey, operation, ttlSeconds = 86400) {
    // Check if we've already processed this
    const cached = await this.getResult(idempotencyKey);
    if (cached.exists) {
      console.log(`[deduplication] Cache hit for key ${idempotencyKey}`);
      return {
        result: cached.result,
        cached: true,
        timestamp: cached.timestamp,
      };
    }

    // Execute operation
    console.log(`[deduplication] Processing new request ${idempotencyKey}`);
    const result = await operation();

    // Store result for future identical requests
    await this.storeResult(idempotencyKey, result, ttlSeconds);

    return {
      result,
      cached: false,
      timestamp: getCurrentTimestamp(),
    };
  }

  /**
   * Clear expired entries (manual cleanup)
   */
  async cleanupExpired() {
    const now = new Date().toISOString();

    // Query all idempotency entries
    const result = await ddb
      .query({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'PK = :pk',
        ExpressionAttributeValues: {
          ':pk': 'IDEMPOTENCY#REQUEST',
        },
      })
      .promise();

    let deleted = 0;

    for (const item of result.Items || []) {
      if (item.expiresAt && item.expiresAt < now) {
        await ddb
          .delete({
            TableName: TABLE_NAME,
            Key: {
              PK: item.PK,
              SK: item.SK,
            },
          })
          .promise();

        deleted++;
      }
    }

    console.log(`[deduplication] Cleaned up ${deleted} expired entries`);
    return { deleted };
  }
}

/**
 * In-memory deduplication (for high-frequency requests)
 * Fast but not persistent across Lambda restarts
 */
class MemoryDeduplicator {
  constructor(ttlSeconds = 300) {
    this.cache = new Map();
    this.ttl = ttlSeconds * 1000;
  }

  /**
   * Get cached result
   */
  get(key) {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.result;
  }

  /**
   * Store result
   */
  set(key, result) {
    this.cache.set(key, {
      result,
      timestamp: Date.now(),
    });
  }

  /**
   * Execute with deduplication
   */
  async execute(key, operation) {
    const cached = this.get(key);

    if (cached !== null) {
      console.log(`[deduplication] Memory cache hit for key ${key}`);
      return { result: cached, cached: true };
    }

    console.log(`[deduplication] Executing operation for key ${key}`);
    const result = await operation();

    this.set(key, result);

    return { result, cached: false };
  }

  /**
   * Clear cache
   */
  clear() {
    this.cache.clear();
  }

  /**
   * Get cache stats
   */
  stats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

/**
 * Hybrid deduplicator: memory cache + DynamoDB fallback
 */
class HybridDeduplicator {
  constructor(ttlSeconds = 300) {
    this.memory = new MemoryDeduplicator(ttlSeconds);
    this.idempotency = new IdempotencyManager();
    this.ttl = ttlSeconds;
  }

  /**
   * Execute with hybrid deduplication
   */
  async execute(idempotencyKey, operation) {
    // Check memory cache first (fast)
    const cached = this.memory.get(idempotencyKey);
    if (cached !== null) {
      return { result: cached, cached: true, source: 'memory' };
    }

    // Check DynamoDB (slower but persistent)
    const dbCached = await this.idempotency.getResult(idempotencyKey);
    if (dbCached.exists) {
      // Warm up memory cache
      this.memory.set(idempotencyKey, dbCached.result);
      return { result: dbCached.result, cached: true, source: 'database' };
    }

    // Execute operation
    const result = await operation();

    // Store in both layers
    this.memory.set(idempotencyKey, result);
    await this.idempotency.storeResult(idempotencyKey, result, this.ttl);

    return { result, cached: false, source: 'executed' };
  }
}

/**
 * Deduplication middleware for resolvers
 */
function withDeduplication(deduplicator, keyPrefix) {
  return (resolver) => {
    return async (event) => {
      const userId = event.identity?.claims?.sub || 'anonymous';
      const idempotencyKey = generateIdempotencyKey(
        userId,
        keyPrefix,
        event.arguments
      );

      const result = await deduplicator.execute(idempotencyKey, async () => {
        return resolver(event);
      });

      // Add deduplication info to response
      event.deduplicationInfo = {
        idempotencyKey,
        cached: result.cached,
        source: result.source,
      };

      return result.result;
    };
  };
}

module.exports = {
  generateIdempotencyKey,
  IdempotencyManager,
  MemoryDeduplicator,
  HybridDeduplicator,
  withDeduplication,
};
