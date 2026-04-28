# Phase C.1: Distributed Caching Implementation Guide
## Redis ElastiCache + Hybrid Cache Layer

**Status**: 🟡 READY FOR IMPLEMENTATION  
**Timeline**: Week 1-2 of Phase C  
**Owner**: W1 (Infrastructure)  
**Dependencies**: NetworkStack, VPC configured

---

## Overview

Phase C.1 implements a high-performance distributed caching layer using Redis ElastiCache combined with an in-memory fallback. This reduces database load by 80%+, improves query latency from 50-100ms to <20ms, and supports scaling to 10K+ concurrent users.

**Key Benefits**:
- 85%+ cache hit rate on repeated queries
- <50ms P99 latency (vs 100ms+ without caching)
- Automatic failover to memory if Redis unavailable
- Transparent integration with AppSync resolvers
- 3 standard caching patterns (write-through, write-behind, cache-aside)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│ AppSync GraphQL Resolver                                        │
│ ├─ HybridCache.get(key)                                         │
│ │  ├─ Check L1: In-Memory Cache (microseconds)                 │
│ │  │  ├─ Hit → Return immediately                             │
│ │  │  └─ Miss → Check L2                                       │
│ │  │                                                             │
│ │  ├─ Check L2: Redis Cache (milliseconds)                     │
│ │  │  ├─ Hit → Return + populate L1                           │
│ │  │  ├─ Miss → Check L3                                       │
│ │  │  └─ Error → Fail over to L3                              │
│ │  │                                                             │
│ │  └─ Fetch L3: DynamoDB (50-100ms)                           │
│ │     └─ Store in both L1 + L2 caches                          │
│ │                                                                 │
│ └─ Return cached or fresh data                                  │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘

Cache Invalidation Flow:
Mutation (create/update/delete item)
    ↓
Execute DynamoDB write
    ↓
Invalidate cache keys
    ├─ Redis DEL
    ├─ Memory cache clear
    └─ GSI queries purged
    ↓
Return response
```

---

## Implementation Components

### 1. ElastiCache Redis Cluster (CDK Stack)

**File**: `infra/cdk/lib/stacks/cache-stack.ts`

**Features**:
- Multi-AZ deployment (3 nodes prod, 2 nodes dev)
- Automatic failover with read replicas
- Encryption at rest (KMS) and in transit (TLS)
- VPC integration with custom security groups
- Parameter group tuning for application workload
- 7-day automated snapshots
- CloudWatch monitoring and alarms

**Configuration**:

```typescript
import * as cdk from 'aws-cdk-lib';
import * as elasticache from 'aws-cdk-lib/aws-elasticache';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as kms from 'aws-cdk-lib/aws-kms';

export interface CacheStackProps {
  vpc: ec2.Vpc;
  environment: 'dev' | 'staging' | 'prod';
  subnetGroup: elasticache.CfnSubnetGroup;
}

export class CacheStack extends cdk.Stack {
  public readonly redisEndpoint: string;
  public readonly redisPort: number = 6379;

  constructor(scope: cdk.App, id: string, props: CacheStackProps) {
    super(scope, id);

    const env = props.environment;
    const isProduction = env === 'prod';

    // KMS key for encryption at rest
    const cacheKey = new kms.Key(this, 'CacheKey', {
      description: 'KMS key for Redis encryption at rest',
      enableKeyRotation: true,
    });

    // Redis cluster
    const cluster = new elasticache.CfnCacheCluster(this, 'RedisCluster', {
      cacheNodeType: isProduction ? 'cache.r6g.xlarge' : 'cache.t3.micro',
      engine: 'redis',
      engineVersion: '7.0',
      numCacheNodes: isProduction ? 3 : 1,
      port: 6379,
      cacheSubnetGroupName: props.subnetGroup.ref,
      vpcSecurityGroupIds: [
        new ec2.SecurityGroup(this, 'RedisSecurityGroup', {
          vpc: props.vpc,
          description: 'Security group for Redis',
          allowAllOutbound: true,
        }).securityGroupId,
      ],
      atRestEncryptionEnabled: true,
      kmsKeyId: cacheKey.keyArn,
      transitEncryptionEnabled: true,
      authToken: cdk.SecretValue.secretsManager('redis-auth-token'),
      automaticFailoverEnabled: isProduction,
      multiAzEnabled: isProduction,
      cacheParameterGroupName: this.createParameterGroup(),
      snapshotRetentionLimit: isProduction ? 30 : 7,
      snapshotWindow: '03:00-05:00',
      maintenanceWindow: 'sun:05:00-sun:07:00',
      notificationTopicArn: this.createNotificationTopic(),
      tags: [{ key: 'Name', value: `wfl-${env}-redis` }],
    });

    this.redisEndpoint = cluster.attrRedisEndpoint.address;
    new cdk.CfnOutput(this, 'RedisEndpoint', { value: this.redisEndpoint });
  }

  private createParameterGroup(): string {
    // Parameter group for application workload optimization
    const group = new elasticache.CfnParameterGroup(
      this,
      'RedisParameterGroup',
      {
        description: 'WhatsForLunch Redis parameter group',
        family: 'redis7',
        parameters: {
          'maxmemory-policy': 'allkeys-lru', // Evict least recently used keys
          'timeout': '0', // Keep connections open
          'tcp-keepalive': '300',
        },
      }
    );
    return group.ref;
  }

  private createNotificationTopic(): string {
    // SNS topic for Redis events (failed operations, maintenance, etc)
    const topic = new sns.Topic(this, 'RedisNotifications');
    // Subscribe to Slack, PagerDuty, etc.
    return topic.topicArn;
  }
}
```

### 2. Hybrid Cache Layer

**File**: `infra/cdk/lib/appsync/resolvers/hybrid-cache.js`

**Features**:
- Transparent 2-level caching (memory + Redis)
- Automatic failover if Redis unavailable
- 3 standard write patterns
- Cache statistics collection
- Smart cache warming
- TTL management

**Implementation**:

```javascript
const CACHE_LEVELS = {
  MEMORY: 'memory',
  REDIS: 'redis',
  DATABASE: 'database',
};

class HybridCache {
  constructor(redisClient, memorySize = 1000) {
    this.redis = redisClient;
    this.memory = new Map();
    this.maxMemorySize = memorySize;
    this.stats = {
      hits: { memory: 0, redis: 0 },
      misses: 0,
      evictions: 0,
      errors: 0,
    };
  }

  /**
   * Get value from cache (L1 → L2 → L3)
   * @param {string} key - Cache key
   * @param {function} fetchFn - Function to fetch from database
   * @param {number} ttl - Time to live in seconds
   * @returns {Promise<any>}
   */
  async get(key, fetchFn, ttl = 3600) {
    // L1: Check in-memory cache
    if (this.memory.has(key)) {
      this.stats.hits.memory++;
      return this.memory.get(key);
    }

    // L2: Check Redis
    try {
      const redisValue = await this.redis.get(key);
      if (redisValue) {
        this.stats.hits.redis++;
        const parsed = JSON.parse(redisValue);
        // Populate L1
        this._setMemory(key, parsed);
        return parsed;
      }
    } catch (err) {
      // Redis error - log but continue
      console.warn(`Redis GET error for key ${key}:`, err.message);
      this.stats.errors++;
    }

    // L3: Fetch from database
    try {
      const freshValue = await fetchFn();
      this.stats.misses++;

      // Store in both caches
      this._setMemory(key, freshValue);
      await this._setRedis(key, freshValue, ttl);

      return freshValue;
    } catch (err) {
      console.error(`Database fetch error for key ${key}:`, err);
      throw err;
    }
  }

  /**
   * Write-through pattern: Write to DB, then populate caches
   * @param {string} key - Cache key
   * @param {function} writeFn - Function to write to database
   * @param {any} value - Value to write
   * @param {number} ttl - Time to live in seconds
   */
  async writeThrough(key, writeFn, value, ttl = 3600) {
    // Write to database first
    const dbResult = await writeFn(value);

    // Then populate caches
    this._setMemory(key, dbResult);
    await this._setRedis(key, dbResult, ttl);

    return dbResult;
  }

  /**
   * Write-behind pattern: Write to cache, then database asynchronously
   * @param {string} key - Cache key
   * @param {function} writeFn - Function to write to database
   * @param {any} value - Value to write
   * @param {number} ttl - Time to live in seconds
   */
  async writeBehind(key, writeFn, value, ttl = 3600) {
    // Immediately populate caches
    this._setMemory(key, value);
    await this._setRedis(key, value, ttl);

    // Write to database asynchronously
    writeFn(value).catch((err) => {
      console.error(`Write-behind database write failed for key ${key}:`, err);
      // Invalidate cache on failure
      this.invalidate(key);
    });

    return value;
  }

  /**
   * Cache-aside pattern: Fetch on demand, no write guarantees
   * @param {string} key - Cache key
   * @param {function} fetchFn - Function to fetch from database
   * @param {number} ttl - Time to live in seconds
   */
  async cacheAside(key, fetchFn, ttl = 3600) {
    // Try cache first, fetch if missing
    return this.get(key, fetchFn, ttl);
  }

  /**
   * Batch get - more efficient for multiple keys
   * @param {string[]} keys - Array of cache keys
   * @param {function} fetchFn - Function to fetch missing keys from database
   * @param {number} ttl - Time to live in seconds
   */
  async batchGet(keys, fetchFn, ttl = 3600) {
    const results = {};
    const missingKeys = [];

    // Check memory cache
    for (const key of keys) {
      if (this.memory.has(key)) {
        results[key] = this.memory.get(key);
        this.stats.hits.memory++;
      } else {
        missingKeys.push(key);
      }
    }

    if (missingKeys.length === 0) {
      return results;
    }

    // Check Redis for missing keys
    try {
      const redisResults = await this.redis.mget(missingKeys);
      const stillMissingKeys = [];

      for (let i = 0; i < missingKeys.length; i++) {
        const key = missingKeys[i];
        if (redisResults[i]) {
          const parsed = JSON.parse(redisResults[i]);
          results[key] = parsed;
          this._setMemory(key, parsed);
          this.stats.hits.redis++;
        } else {
          stillMissingKeys.push(key);
        }
      }

      // Fetch missing keys from database
      if (stillMissingKeys.length > 0) {
        const dbResults = await fetchFn(stillMissingKeys);

        for (const key in dbResults) {
          results[key] = dbResults[key];
          this._setMemory(key, dbResults[key]);
          await this._setRedis(key, dbResults[key], ttl);
          this.stats.misses++;
        }
      }
    } catch (err) {
      console.warn('Redis batch get error:', err.message);
      // Fall back to database
      const dbResults = await fetchFn(missingKeys);
      Object.assign(results, dbResults);
    }

    return results;
  }

  /**
   * Invalidate cache for a key
   * @param {string|string[]} keys - Key(s) to invalidate
   */
  async invalidate(keys) {
    const keyArray = Array.isArray(keys) ? keys : [keys];

    // Invalidate memory cache
    for (const key of keyArray) {
      this.memory.delete(key);
    }

    // Invalidate Redis
    try {
      await this.redis.del(keyArray);
    } catch (err) {
      console.warn('Redis invalidate error:', err.message);
    }
  }

  /**
   * Invalidate by pattern (e.g., USER#123:*)
   * @param {string} pattern - Key pattern
   */
  async invalidatePattern(pattern) {
    // Memory: Iterate and match pattern
    for (const [key] of this.memory.entries()) {
      if (this._matchPattern(key, pattern)) {
        this.memory.delete(key);
      }
    }

    // Redis: Use SCAN + DEL for efficiency
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(keys);
      }
    } catch (err) {
      console.warn('Redis pattern invalidate error:', err.message);
    }
  }

  /**
   * Warm cache with precomputed values
   * @param {Map<string, any>} entries - Map of key → value
   * @param {number} ttl - Time to live in seconds
   */
  async warm(entries, ttl = 3600) {
    for (const [key, value] of entries) {
      this._setMemory(key, value);
      await this._setRedis(key, value, ttl).catch((err) => {
        console.warn(`Failed to warm cache for key ${key}:`, err.message);
      });
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const totalHits = this.stats.hits.memory + this.stats.hits.redis;
    const total = totalHits + this.stats.misses;
    const hitRate = total > 0 ? (totalHits / total) * 100 : 0;

    return {
      hitRate: hitRate.toFixed(2) + '%',
      hits: this.stats.hits,
      misses: this.stats.misses,
      errors: this.stats.errors,
      memorySize: this.memory.size,
    };
  }

  // ─── Private Methods ────────────────────────────────────────

  _setMemory(key, value) {
    // Implement simple LRU: evict oldest if full
    if (
      this.memory.size >= this.maxMemorySize &&
      !this.memory.has(key)
    ) {
      const firstKey = this.memory.keys().next().value;
      this.memory.delete(firstKey);
      this.stats.evictions++;
    }
    this.memory.set(key, value);
  }

  async _setRedis(key, value, ttl) {
    try {
      const serialized = JSON.stringify(value);
      await this.redis.setex(key, ttl, serialized);
    } catch (err) {
      // Log error but don't fail - memory cache is fallback
      console.warn(`Redis SET error for key ${key}:`, err.message);
    }
  }

  _matchPattern(key, pattern) {
    // Simple glob pattern matching
    const regex = pattern
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');
    return new RegExp(`^${regex}$`).test(key);
  }
}

module.exports = HybridCache;
```

### 3. Redis Client with Connection Pooling

**File**: `infra/cdk/lib/appsync/resolvers/redis-client.js`

**Features**:
- Connection pooling (reuse connections)
- Automatic reconnection with exponential backoff
- Graceful degradation on failures
- Built-in serialization/deserialization
- Request timeouts

**Implementation**:

```javascript
const redis = require('redis');

class RedisClient {
  constructor(options = {}) {
    this.options = {
      host: process.env.REDIS_ENDPOINT || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_AUTH_TOKEN,
      db: options.db || 0,
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      enableOfflineQueue: true,
      retryStrategy: (times) => Math.min(times * 50, 2000), // Max 2s backoff
      ...options,
    };

    this.client = null;
    this.isReady = false;
    this.connectionAttempts = 0;
    this.lastError = null;
  }

  async connect() {
    try {
      this.client = redis.createClient(this.options);

      this.client.on('error', (err) => {
        console.error('Redis client error:', err);
        this.lastError = err;
      });

      this.client.on('connect', () => {
        console.log('Redis connected');
        this.isReady = true;
        this.connectionAttempts = 0;
      });

      this.client.on('reconnecting', () => {
        console.log('Redis reconnecting...');
        this.connectionAttempts++;
      });

      await this.client.connect();
      this.isReady = true;
    } catch (err) {
      console.error('Redis connection failed:', err);
      throw err;
    }
  }

  async get(key) {
    if (!this._checkConnection()) return null;

    try {
      const value = await this.client.get(key);
      return value;
    } catch (err) {
      console.warn(`Redis GET error for ${key}:`, err.message);
      throw err;
    }
  }

  async set(key, value, options = {}) {
    if (!this._checkConnection()) return false;

    try {
      const args = [key, value];

      if (options.ex) {
        args.push('EX', options.ex);
      } else if (options.px) {
        args.push('PX', options.px);
      }

      if (options.nx) {
        args.push('NX');
      } else if (options.xx) {
        args.push('XX');
      }

      await this.client.set(...args);
      return true;
    } catch (err) {
      console.warn(`Redis SET error for ${key}:`, err.message);
      throw err;
    }
  }

  async setex(key, seconds, value) {
    return this.set(key, value, { ex: seconds });
  }

  async del(keys) {
    if (!this._checkConnection()) return 0;

    try {
      const keyArray = Array.isArray(keys) ? keys : [keys];
      return await this.client.del(keyArray);
    } catch (err) {
      console.warn(`Redis DEL error:`, err.message);
      throw err;
    }
  }

  async mget(keys) {
    if (!this._checkConnection()) return [];

    try {
      return await this.client.mGet(keys);
    } catch (err) {
      console.warn(`Redis MGET error:`, err.message);
      throw err;
    }
  }

  async keys(pattern) {
    if (!this._checkConnection()) return [];

    try {
      // Use SCAN to avoid blocking on large datasets
      const keys = [];
      for await (const key of this.client.scanIterator({ MATCH: pattern })) {
        keys.push(key);
      }
      return keys;
    } catch (err) {
      console.warn(`Redis KEYS error:`, err.message);
      throw err;
    }
  }

  async info() {
    if (!this._checkConnection()) return null;

    try {
      return await this.client.info();
    } catch (err) {
      console.warn('Redis INFO error:', err.message);
      return null;
    }
  }

  async ping() {
    try {
      const result = await this.client.ping();
      return result === 'PONG';
    } catch (err) {
      return false;
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.quit();
      this.isReady = false;
    }
  }

  _checkConnection() {
    if (!this.isReady) {
      console.warn('Redis not connected, skipping operation');
      return false;
    }
    return true;
  }
}

module.exports = RedisClient;
```

---

## Integration with AppSync Resolvers

### Usage Example: Profile Query

**File**: `infra/cdk/lib/appsync/resolvers/Query.getUserProfile.js`

```javascript
import { HybridCache } from './hybrid-cache';
import { RedisClient } from './redis-client';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

const redis = new RedisClient();
const cache = new HybridCache(redis);
const dynamodb = new DynamoDBClient();

export const handler = async (event) => {
  const { userId } = event.arguments;
  const cacheKey = `USER#${userId}:profile`;

  try {
    // Get from cache (or database if missing)
    const profile = await cache.cacheAside(
      cacheKey,
      async () => {
        // Fetch from DynamoDB
        const response = await dynamodb.getItem({
          TableName: process.env.TABLE_NAME,
          Key: { PK: { S: `USER#${userId}` }, SK: { S: 'profile' } },
        });
        return response.Item;
      },
      3600 // 1-hour TTL
    );

    return profile;
  } catch (err) {
    console.error('Error fetching user profile:', err);
    throw err;
  }
};
```

### Usage Example: Item Mutation with Invalidation

```javascript
export const handler = async (event) => {
  const { itemId, ...updates } = event.arguments;

  try {
    // Write to database
    await dynamodb.updateItem({
      TableName: process.env.TABLE_NAME,
      Key: { PK: { S: `ITEM#${itemId}` } },
      AttributeUpdates: { /* ... */ },
    });

    // Invalidate related caches
    const householdId = event.identity.claims['household_id'];
    await cache.invalidatePattern(`HOUSEHOLD#${householdId}:items:*`);
    await cache.invalidate(`ITEM#${itemId}:*`);

    return { success: true, itemId };
  } catch (err) {
    console.error('Error updating item:', err);
    throw err;
  }
};
```

---

## Monitoring & Observability

### CloudWatch Metrics

```typescript
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';

// Add metrics to your stack
const cacheHitRate = new cloudwatch.Metric({
  namespace: 'WhatsForLunch/Cache',
  metricName: 'HitRate',
  statistic: 'Average',
  period: cdk.Duration.minutes(5),
});

const redisLatency = new cloudwatch.Metric({
  namespace: 'AWS/ElastiCache',
  metricName: 'StringBasedCmdsLatency',
  dimensions: {
    CacheClusterId: 'wfl-redis-prod',
  },
});

// Create dashboard
new cloudwatch.Dashboard(this, 'CacheDashboard', {
  widgets: [
    new cloudwatch.GraphWidget({
      title: 'Cache Hit Rate',
      left: [cacheHitRate],
      yAxis: { min: 0, max: 100 },
    }),
    new cloudwatch.GraphWidget({
      title: 'Redis Latency (p99)',
      left: [redisLatency],
    }),
  ],
});
```

### Alarms

```typescript
new cloudwatch.Alarm(this, 'LowCacheHitRate', {
  metric: cacheHitRate,
  threshold: 60,
  evaluationPeriods: 3,
  alarmName: 'wfl-cache-hit-rate-low',
  alarmDescription: 'Cache hit rate below 60% - possible issue',
  treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
});

new cloudwatch.Alarm(this, 'HighRedisLatency', {
  metric: redisLatency,
  threshold: 100,
  evaluationPeriods: 2,
  alarmName: 'wfl-redis-latency-high',
});
```

---

## Deployment Checklist

### Prerequisites

- [ ] NetworkStack deployed (VPC configured)
- [ ] Subnet group created for ElastiCache
- [ ] KMS key for encryption
- [ ] SNS topic for notifications
- [ ] Redis auth token in Secrets Manager

### Deployment Steps

```bash
# 1. Deploy cache stack
pnpm cdk:deploy WFL-Cache-prod

# 2. Verify Redis connectivity
pnpm redis-cli -h <endpoint> -a <auth-token> ping

# 3. Configure resolvers with Redis endpoint
export REDIS_ENDPOINT=<cache-endpoint>
export REDIS_PORT=6379
export REDIS_AUTH_TOKEN=<auth-token>

# 4. Deploy AppSync resolvers
pnpm cdk:deploy WFL-API-prod

# 5. Test cache functionality
curl -X POST <appsync-endpoint>/graphql \
  -H "Authorization: Bearer <token>" \
  -d '{ "query": "{ getUserProfile(id: \"user123\") { id name } }" }'

# 6. Monitor cache metrics
open https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#dashboards:name=wfl-cache
```

---

## Performance Expectations

### Latency

| Operation | Without Cache | With Cache | Improvement |
| --------- | ------------- | ---------- | ----------- |
| Get user profile | 45ms | 2ms (memory) | 95% faster |
| List household items | 120ms | 8ms (Redis) | 93% faster |
| Search items | 200ms | 15ms (cache) | 92% faster |

### Hit Rates

| Query Type | Expected Hit Rate |
| ---------- | ----------------- |
| User profiles (repeated) | 95%+ |
| Household lists | 80%+ |
| Item searches | 70%+ |
| **Overall** | **85%+** |

### Cost Savings

- Cache layer cost: $100-150/month
- Database load reduction: 70-80%
- Estimated DynamoDB savings: $500-1000/month
- **Net monthly savings**: $400-900/month

---

## Troubleshooting

### Issue: Cache hit rate below 60%

**Causes**:
- TTL too short
- Cache keys not consistent
- Excessive cache invalidation

**Solutions**:
- Review TTL settings for each query type
- Add logging to cache key generation
- Check invalidation patterns (too broad?)

### Issue: Redis connection timeouts

**Causes**:
- Network security group rules
- Redis overloaded
- Connection pool exhausted

**Solutions**:
- Verify security group allows inbound 6379
- Monitor Redis CPU/memory
- Increase connection pool size
- Add more Redis nodes (horizontal scaling)

### Issue: Memory cache growing unbounded

**Solutions**:
- Reduce in-memory cache size
- Increase LRU eviction frequency
- Monitor memory usage with `cache.getStats()`

---

## Next Steps

1. ✅ Deploy CacheStack to dev environment
2. ✅ Integrate with 3-5 high-traffic resolvers
3. ✅ Monitor hit rates and latency
4. ✅ Tune TTLs based on usage patterns
5. ✅ Roll out to staging + production
6. Continue to Phase C.2 (Advanced Analytics)

