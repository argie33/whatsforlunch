import RedisCache from './redis-cache.js';

const DEFAULT_MEMORY_LIMIT = 50 * 1024 * 1024; // 50MB
const WRITE_STRATEGY_WRITE_THROUGH = 'write-through';
const WRITE_STRATEGY_WRITE_BEHIND = 'write-behind';
const WRITE_STRATEGY_CACHE_ASIDE = 'cache-aside';

export class HybridCache {
  constructor(options = {}) {
    this.redisCache = new RedisCache(options.redis || {});
    this.memoryCache = new Map();
    this.memoryLimit = options.memoryLimit || DEFAULT_MEMORY_LIMIT;
    this.memoryUsage = 0;
    this.writeStrategy = options.writeStrategy || WRITE_STRATEGY_WRITE_THROUGH;
    this.defaultTtl = options.defaultTtl || 3600;

    this.stats = {
      l1Hits: 0,
      l2Hits: 0,
      l3Misses: 0,
      sets: 0,
      invalidations: 0,
    };
  }

  async initialize() {
    try {
      await this.redisCache.connect();
    } catch (error) {
      console.warn('[HybridCache] Redis connection failed, using memory-only mode:', error.message);
    }
  }

  async get(key) {
    // L1: Check in-memory cache
    if (this.memoryCache.has(key)) {
      this.stats.l1Hits++;
      return this.memoryCache.get(key);
    }

    // L2: Check Redis
    if (this.redisCache.isConnected) {
      const value = await this.redisCache.get(key);
      if (value !== null) {
        this.stats.l2Hits++;
        this._setMemory(key, value);
        return value;
      }
    }

    // L3: Cache miss
    this.stats.l3Misses++;
    return null;
  }

  async getOrFetch(key, fetchFn, options = {}) {
    const cached = await this.get(key);
    if (cached !== null) {
      return cached;
    }

    const value = await fetchFn();
    if (value !== undefined && value !== null) {
      await this.set(key, value, options.ttl);
    }
    return value;
  }

  async set(key, value, ttl = null) {
    const finalTtl = ttl || this.defaultTtl;

    if (this.writeStrategy === WRITE_STRATEGY_WRITE_THROUGH) {
      // Write to both Redis and memory synchronously
      this._setMemory(key, value, finalTtl);
      if (this.redisCache.isConnected) {
        await this.redisCache.set(key, value, finalTtl);
      }
    } else if (this.writeStrategy === WRITE_STRATEGY_WRITE_BEHIND) {
      // Write to memory immediately, Redis asynchronously
      this._setMemory(key, value, finalTtl);
      if (this.redisCache.isConnected) {
        this.redisCache.set(key, value, finalTtl).catch((err) => {
          console.error(`[HybridCache] Async Redis write failed for ${key}:`, err.message);
        });
      }
    } else if (this.writeStrategy === WRITE_STRATEGY_CACHE_ASIDE) {
      // Only write to memory
      this._setMemory(key, value, finalTtl);
    }

    this.stats.sets++;
  }

  async del(key) {
    this.memoryCache.delete(key);
    if (this.redisCache.isConnected) {
      await this.redisCache.del(key);
    }
  }

  async invalidatePattern(pattern) {
    // Clear from memory
    for (const key of this.memoryCache.keys()) {
      if (this._matchesPattern(key, pattern)) {
        this.memoryCache.delete(key);
      }
    }

    // Clear from Redis
    if (this.redisCache.isConnected) {
      await this.redisCache.invalidatePattern(pattern);
    }

    this.stats.invalidations++;
  }

  async batchGet(keys) {
    const result = {};
    const missingKeys = [];

    // L1: Check memory first
    for (const key of keys) {
      if (this.memoryCache.has(key)) {
        result[key] = this.memoryCache.get(key);
        this.stats.l1Hits++;
      } else {
        missingKeys.push(key);
      }
    }

    // L2: Get from Redis
    if (missingKeys.length > 0 && this.redisCache.isConnected) {
      const redisResults = await this.redisCache.batchGet(missingKeys);
      for (const [key, value] of Object.entries(redisResults)) {
        result[key] = value;
        this._setMemory(key, value);
        this.stats.l2Hits++;
      }
    }

    // Track misses
    for (const key of keys) {
      if (!result.hasOwnProperty(key)) {
        this.stats.l3Misses++;
      }
    }

    return result;
  }

  async batchSet(kvPairs, ttl = null) {
    const finalTtl = ttl || this.defaultTtl;

    if (this.writeStrategy === WRITE_STRATEGY_WRITE_THROUGH) {
      // Set in memory first
      for (const [key, value] of Object.entries(kvPairs)) {
        this._setMemory(key, value, finalTtl);
      }
      // Then in Redis
      if (this.redisCache.isConnected) {
        await this.redisCache.batchSet(kvPairs, finalTtl);
      }
    } else if (this.writeStrategy === WRITE_STRATEGY_WRITE_BEHIND) {
      // Set in memory immediately
      for (const [key, value] of Object.entries(kvPairs)) {
        this._setMemory(key, value, finalTtl);
      }
      // Schedule Redis write
      if (this.redisCache.isConnected) {
        this.redisCache.batchSet(kvPairs, finalTtl).catch((err) => {
          console.error('[HybridCache] Async batch Redis write failed:', err.message);
        });
      }
    } else {
      // CACHE_ASIDE: only memory
      for (const [key, value] of Object.entries(kvPairs)) {
        this._setMemory(key, value, finalTtl);
      }
    }

    this.stats.sets += Object.keys(kvPairs).length;
  }

  _setMemory(key, value, ttl = null) {
    const size = JSON.stringify(value).length;

    // Evict if needed
    while (this.memoryUsage + size > this.memoryLimit && this.memoryCache.size > 0) {
      const firstKey = this.memoryCache.keys().next().value;
      const firstValue = this.memoryCache.get(firstKey);
      this.memoryUsage -= JSON.stringify(firstValue).length;
      this.memoryCache.delete(firstKey);
    }

    this.memoryCache.set(key, value);
    this.memoryUsage += size;

    // Set TTL if provided
    if (ttl) {
      setTimeout(() => {
        if (this.memoryCache.get(key) === value) {
          this.memoryUsage -= size;
          this.memoryCache.delete(key);
        }
      }, ttl * 1000);
    }
  }

  _matchesPattern(key, pattern) {
    const regexPattern = pattern.replace(/\./g, '\\.').replace(/\*/g, '.*').replace(/\?/g, '.');
    return new RegExp(`^${regexPattern}$`).test(key);
  }

  getStats() {
    return {
      ...this.stats,
      memoryUsage: this.memoryUsage,
      memoryLimit: this.memoryLimit,
      memoryUtilization: `${((this.memoryUsage / this.memoryLimit) * 100).toFixed(2)}%`,
      redis: this.redisCache.getStats(),
    };
  }

  resetStats() {
    this.stats = {
      l1Hits: 0,
      l2Hits: 0,
      l3Misses: 0,
      sets: 0,
      invalidations: 0,
    };
    this.redisCache.resetStats();
  }

  generateKey(...parts) {
    return this.redisCache.generateKey(...parts);
  }

  clearMemory() {
    this.memoryCache.clear();
    this.memoryUsage = 0;
  }

  async disconnect() {
    this.memoryCache.clear();
    await this.redisCache.disconnect();
  }
}

export default HybridCache;
