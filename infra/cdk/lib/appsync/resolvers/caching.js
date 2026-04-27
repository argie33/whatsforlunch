// Caching Layer
// In-memory and Redis caching for resolver performance

const crypto = require('crypto');

/**
 * Simple in-memory cache with TTL
 * Used for local caching before Redis
 */
class MemoryCache {
  constructor() {
    this.cache = new Map();
    this.ttls = new Map();
  }

  /**
   * Generate cache key from arguments
   */
  generateKey(prefix, ...args) {
    const hash = crypto.createHash('md5').update(JSON.stringify(args)).digest('hex');
    return `${prefix}:${hash}`;
  }

  /**
   * Get value from cache
   */
  get(key) {
    if (!this.cache.has(key)) {
      return null;
    }

    // Check if TTL expired
    const ttl = this.ttls.get(key);
    if (ttl && ttl < Date.now()) {
      this.cache.delete(key);
      this.ttls.delete(key);
      return null;
    }

    return this.cache.get(key);
  }

  /**
   * Set value in cache with optional TTL (seconds)
   */
  set(key, value, ttlSeconds = 300) {
    this.cache.set(key, value);
    if (ttlSeconds) {
      this.ttls.set(key, Date.now() + ttlSeconds * 1000);
    }
  }

  /**
   * Delete value from cache
   */
  delete(key) {
    this.cache.delete(key);
    this.ttls.delete(key);
  }

  /**
   * Invalidate all keys matching pattern
   */
  invalidatePattern(pattern) {
    for (const key of this.cache.keys()) {
      if (key.startsWith(pattern)) {
        this.delete(key);
      }
    }
  }

  /**
   * Clear entire cache
   */
  clear() {
    this.cache.clear();
    this.ttls.clear();
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
 * Cache warming strategy
 * Proactively load frequently accessed data
 */
async function warmCache(cache, households) {
  const promises = [];

  for (const householdId of households) {
    // Warm food rules cache
    const rulesKey = cache.generateKey('foodRules');
    if (!cache.get(rulesKey)) {
      promises.push(
        // Would load from DB
        cache.set(rulesKey, {}, 3600) // Cache for 1 hour
      );
    }

    // Warm household stats
    const statsKey = cache.generateKey('householdStats', householdId);
    if (!cache.get(statsKey)) {
      promises.push(
        // Would load from DB
        cache.set(statsKey, {}, 600) // Cache for 10 minutes
      );
    }
  }

  return Promise.all(promises);
}

/**
 * Cache invalidation strategies
 */
const CacheInvalidation = {
  /**
   * Invalidate on item change
   */
  onItemChange: (householdId, itemId) => {
    return [
      `householdStats:${householdId}`,
      `itemsExpiring:${householdId}`,
      `searchItems:${householdId}`,
      `containerStats:${householdId}`,
    ];
  },

  /**
   * Invalidate on household change
   */
  onHouseholdChange: (householdId) => {
    return [`household:${householdId}`, `householdStats:${householdId}`];
  },

  /**
   * Invalidate on membership change
   */
  onMembershipChange: (householdId, userId) => {
    return [
      `householdMembers:${householdId}`,
      `userHouseholds:${userId}`,
    ];
  },

  /**
   * Invalidate on shopping list change
   */
  onShoppingListChange: (householdId) => {
    return [`shoppingList:${householdId}`];
  },
};

/**
 * Distributed cache interface (Redis-compatible)
 * Use when scaling beyond single instance
 */
class DistributedCache {
  constructor(redisClient) {
    this.redis = redisClient;
  }

  async get(key) {
    const value = await this.redis.get(key);
    return value ? JSON.parse(value) : null;
  }

  async set(key, value, ttlSeconds = 300) {
    await this.redis.setex(key, ttlSeconds, JSON.stringify(value));
  }

  async delete(key) {
    await this.redis.del(key);
  }

  async invalidatePattern(pattern) {
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }

  async clear() {
    await this.redis.flushdb();
  }
}

/**
 * Cache middleware for resolvers
 */
function withCache(cache, keyPrefix, ttlSeconds = 300) {
  return async (resolver) => {
    return async (event) => {
      // Generate cache key from resolver arguments
      const cacheKey = cache.generateKey(keyPrefix, JSON.stringify(event.arguments));

      // Check cache
      const cached = cache.get(cacheKey);
      if (cached) {
        console.log(`[cache-hit] ${keyPrefix}`);
        return cached;
      }

      // Execute resolver
      console.log(`[cache-miss] ${keyPrefix}`);
      const result = await resolver(event);

      // Cache result (only if not an error)
      if (result && !result.errorType) {
        cache.set(cacheKey, result, ttlSeconds);
      }

      return result;
    };
  };
}

/**
 * Cache statistics collector
 */
class CacheStats {
  constructor() {
    this.hits = 0;
    this.misses = 0;
    this.sets = 0;
    this.invalidations = 0;
  }

  recordHit() {
    this.hits++;
  }

  recordMiss() {
    this.misses++;
  }

  recordSet() {
    this.sets++;
  }

  recordInvalidation() {
    this.invalidations++;
  }

  getHitRate() {
    const total = this.hits + this.misses;
    return total === 0 ? 0 : (this.hits / total) * 100;
  }

  reset() {
    this.hits = 0;
    this.misses = 0;
    this.sets = 0;
    this.invalidations = 0;
  }

  summary() {
    return {
      hits: this.hits,
      misses: this.misses,
      sets: this.sets,
      invalidations: this.invalidations,
      hitRate: `${this.getHitRate().toFixed(2)}%`,
    };
  }
}

module.exports = {
  MemoryCache,
  DistributedCache,
  CacheInvalidation,
  withCache,
  CacheStats,
  warmCache,
};
