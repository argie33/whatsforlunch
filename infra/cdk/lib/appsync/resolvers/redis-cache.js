import Redis from 'ioredis';

const DEFAULT_TTL = 3600; // 1 hour
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 100;

export class RedisCache {
  constructor(options = {}) {
    this.endpoint = options.endpoint || process.env.REDIS_ENDPOINT || 'localhost';
    this.port = options.port || parseInt(process.env.REDIS_PORT || '6379');
    this.authToken = options.authToken || process.env.REDIS_AUTH_TOKEN;
    this.defaultTtl = options.defaultTtl || DEFAULT_TTL;
    this.maxRetries = options.maxRetries || MAX_RETRIES;
    this.retryDelayMs = options.retryDelayMs || RETRY_DELAY_MS;

    this.client = null;
    this.isConnected = false;
    this.stats = {
      hits: 0,
      misses: 0,
      errors: 0,
      sets: 0,
      deletes: 0,
    };
  }

  async connect() {
    if (this.client) return this.client;

    try {
      this.client = new Redis({
        host: this.endpoint,
        port: this.port,
        password: this.authToken,
        retryStrategy: (times) => Math.min(times * RETRY_DELAY_MS, 2000),
        maxRetriesPerRequest: this.maxRetries,
        enableReadyCheck: false,
        enableOfflineQueue: true,
        lazyConnect: false,
      });

      await this.client.ping();
      this.isConnected = true;
      return this.client;
    } catch (error) {
      console.error('[RedisCache] Connection failed:', error.message);
      this.isConnected = false;
      throw error;
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.disconnect();
      this.client = null;
      this.isConnected = false;
    }
  }

  async get(key) {
    if (!this.isConnected) {
      this.stats.errors++;
      return null;
    }

    try {
      const value = await this.client.get(key);
      if (value) {
        this.stats.hits++;
        return JSON.parse(value);
      }
      this.stats.misses++;
      return null;
    } catch (error) {
      console.error(`[RedisCache] Get error for key ${key}:`, error.message);
      this.stats.errors++;
      return null;
    }
  }

  async set(key, value, ttl = null) {
    if (!this.isConnected) {
      this.stats.errors++;
      return false;
    }

    try {
      const serialized = JSON.stringify(value);
      const finalTtl = ttl || this.defaultTtl;

      if (finalTtl) {
        await this.client.setex(key, finalTtl, serialized);
      } else {
        await this.client.set(key, serialized);
      }

      this.stats.sets++;
      return true;
    } catch (error) {
      console.error(`[RedisCache] Set error for key ${key}:`, error.message);
      this.stats.errors++;
      return false;
    }
  }

  async del(key) {
    if (!this.isConnected) {
      this.stats.errors++;
      return false;
    }

    try {
      const result = await this.client.del(key);
      this.stats.deletes++;
      return result > 0;
    } catch (error) {
      console.error(`[RedisCache] Delete error for key ${key}:`, error.message);
      this.stats.errors++;
      return false;
    }
  }

  async invalidatePattern(pattern) {
    if (!this.isConnected) {
      this.stats.errors++;
      return false;
    }

    try {
      const keys = await this.client.keys(pattern);
      if (keys.length === 0) return true;

      const pipeline = this.client.pipeline();
      keys.forEach((key) => pipeline.del(key));
      await pipeline.exec();

      this.stats.deletes += keys.length;
      return true;
    } catch (error) {
      console.error(`[RedisCache] Pattern invalidation error for ${pattern}:`, error.message);
      this.stats.errors++;
      return false;
    }
  }

  async batchGet(keys) {
    if (!this.isConnected || keys.length === 0) {
      this.stats.errors++;
      return {};
    }

    try {
      const values = await this.client.mget(...keys);
      const result = {};

      keys.forEach((key, idx) => {
        if (values[idx]) {
          result[key] = JSON.parse(values[idx]);
          this.stats.hits++;
        } else {
          this.stats.misses++;
        }
      });

      return result;
    } catch (error) {
      console.error('[RedisCache] Batch get error:', error.message);
      this.stats.errors++;
      return {};
    }
  }

  async batchSet(kvPairs, ttl = null) {
    if (!this.isConnected || Object.keys(kvPairs).length === 0) {
      this.stats.errors++;
      return false;
    }

    try {
      const pipeline = this.client.pipeline();
      const finalTtl = ttl || this.defaultTtl;

      Object.entries(kvPairs).forEach(([key, value]) => {
        const serialized = JSON.stringify(value);
        if (finalTtl) {
          pipeline.setex(key, finalTtl, serialized);
        } else {
          pipeline.set(key, serialized);
        }
      });

      await pipeline.exec();
      this.stats.sets += Object.keys(kvPairs).length;
      return true;
    } catch (error) {
      console.error('[RedisCache] Batch set error:', error.message);
      this.stats.errors++;
      return false;
    }
  }

  getStats() {
    return {
      ...this.stats,
      isConnected: this.isConnected,
      endpoint: this.endpoint,
      port: this.port,
    };
  }

  resetStats() {
    this.stats = {
      hits: 0,
      misses: 0,
      errors: 0,
      sets: 0,
      deletes: 0,
    };
  }

  generateKey(...parts) {
    return parts.filter((p) => p !== undefined && p !== null && p !== '').join(':');
  }
}

export default RedisCache;
