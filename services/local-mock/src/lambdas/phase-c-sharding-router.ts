/**
 * Phase C.6: Sharding Router Lambda
 * Distributes data across shards using consistent hashing
 */

import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import crypto from 'crypto';

interface ShardingEvent {
  householdId: string;
  operation: 'get' | 'put' | 'delete';
  data?: any;
}

interface ShardInfo {
  shardId: string;
  status: 'active' | 'rebalancing' | 'offline';
  load: number; // 0-1 scale
  itemCount: number;
  lastUpdated: number;
}

export class ShardingRouter {
  private dynamodbClient: DynamoDB;
  private shardCount = 4; // Configurable
  private shardRing: Map<string, ShardInfo> = new Map();
  private consistentHashRing: string[] = [];

  constructor(dynamodbClient: DynamoDB, shardCount: number = 4) {
    this.dynamodbClient = dynamodbClient;
    this.shardCount = shardCount;
    this.initializeShardRing();
  }

  private initializeShardRing(): void {
    // Initialize shard ring with consistent hashing
    for (let i = 0; i < this.shardCount; i++) {
      const shardId = `shard-${i}`;
      this.shardRing.set(shardId, {
        shardId,
        status: 'active',
        load: 0,
        itemCount: 0,
        lastUpdated: Date.now(),
      });

      // Add multiple points on hash ring for better distribution
      for (let j = 0; j < 160; j++) {
        // 160 virtual nodes per shard
        const hash = this.hash(`${shardId}-${j}`);
        this.consistentHashRing.push(hash);
      }
    }

    this.consistentHashRing.sort();
    console.log(`✅ Initialized ${this.shardCount} shards with consistent hashing`);
  }

  async routeRequest(event: ShardingEvent): Promise<any> {
    try {
      // Determine shard for this household
      const shardId = this.getShardForHousehold(event.householdId);
      const shardInfo = this.shardRing.get(shardId)!;

      // Check shard health
      if (shardInfo.status !== 'active') {
        console.warn(`⚠️  Shard ${shardId} is ${shardInfo.status}`);
        // In production: route to backup or wait for recovery
      }

      // Route operation
      let result;
      switch (event.operation) {
        case 'get':
          result = await this.getFromShard(shardId, event.householdId);
          break;
        case 'put':
          result = await this.putToShard(shardId, event.householdId, event.data);
          break;
        case 'delete':
          result = await this.deleteFromShard(shardId, event.householdId);
          break;
        default:
          throw new Error(`Unknown operation: ${event.operation}`);
      }

      // Update load
      await this.updateShardLoad(shardId);

      console.log(
        `✅ ${event.operation.toUpperCase()} routed to ${shardId}: ${event.householdId}`
      );

      return {
        success: true,
        householdId: event.householdId,
        shardId,
        operation: event.operation,
        result,
      };
    } catch (error) {
      console.error('Routing failed:', error);
      return {
        success: false,
        error: String(error),
      };
    }
  }

  private getShardForHousehold(householdId: string): string {
    const hash = this.hash(householdId);
    const shardHash = this.findClosestShardHash(hash);
    const shardId = this.findShardIdByHash(shardHash);
    return shardId;
  }

  private hash(key: string): string {
    // Use SHA-256 for consistent hashing
    return crypto.createHash('sha256').update(key).digest('hex');
  }

  private findClosestShardHash(targetHash: string): string {
    // Find the next shard hash in the ring (circular)
    for (const hash of this.consistentHashRing) {
      if (hash >= targetHash) {
        return hash;
      }
    }
    // Wrap around to first shard
    return this.consistentHashRing[0];
  }

  private findShardIdByHash(hash: string): string {
    // Map hash back to shard ID
    for (const [shardId] of this.shardRing) {
      for (let j = 0; j < 160; j++) {
        const virtualNodeHash = this.hash(`${shardId}-${j}`);
        if (virtualNodeHash === hash) {
          return shardId;
        }
      }
    }
    // Fallback: return first shard
    return Array.from(this.shardRing.keys())[0];
  }

  private async getFromShard(shardId: string, householdId: string): Promise<any> {
    // In production: read from shard database
    // For local: return mock data
    return {
      householdId,
      shardId,
      timestamp: Date.now(),
      source: 'shard',
    };
  }

  private async putToShard(
    shardId: string,
    householdId: string,
    data: any
  ): Promise<any> {
    // In production: write to shard database
    // For local: simulate write
    return {
      householdId,
      shardId,
      stored: true,
      size: JSON.stringify(data).length,
      timestamp: Date.now(),
    };
  }

  private async deleteFromShard(shardId: string, householdId: string): Promise<any> {
    // In production: delete from shard database
    // For local: simulate delete
    return {
      householdId,
      shardId,
      deleted: true,
      timestamp: Date.now(),
    };
  }

  private async updateShardLoad(shardId: string): Promise<void> {
    const shardInfo = this.shardRing.get(shardId);
    if (shardInfo) {
      shardInfo.itemCount++;
      shardInfo.load = Math.min(shardInfo.itemCount / 100, 1); // Normalize to 0-1
      shardInfo.lastUpdated = Date.now();

      // Check if rebalancing needed
      if (shardInfo.load > 0.85) {
        console.warn(`⚠️  Shard ${shardId} is at ${Math.round(shardInfo.load * 100)}% capacity`);
        // In production: trigger rebalancing
      }

      // Store in DynamoDB
      try {
        await this.dynamodbClient.putItem({
          TableName: 'wfl-shard-metadata-dev',
          Item: marshall({
            shardId,
            status: shardInfo.status,
            load: shardInfo.load,
            itemCount: shardInfo.itemCount,
            lastUpdated: shardInfo.lastUpdated,
          }),
        });
      } catch (error) {
        console.warn('Failed to update shard metadata:', error);
      }
    }
  }

  getShardStats(): Record<string, ShardInfo> {
    const stats: Record<string, ShardInfo> = {};
    for (const [shardId, info] of this.shardRing) {
      stats[shardId] = { ...info };
    }
    return stats;
  }

  async rebalanceShards(): Promise<{ success: boolean; message: string }> {
    // In production: complex redistribution algorithm
    // For local: simple mock
    const stats = this.getShardStats();
    const avgLoad = Object.values(stats).reduce((sum, s) => sum + s.load, 0) / this.shardCount;

    const overloaded = Object.values(stats).filter((s) => s.load > avgLoad * 1.2);
    const underloaded = Object.values(stats).filter((s) => s.load < avgLoad * 0.8);

    if (overloaded.length > 0 && underloaded.length > 0) {
      console.log(`🔄 Rebalancing: ${overloaded.length} overloaded, ${underloaded.length} underloaded`);
      return {
        success: true,
        message: `Rebalanced ${overloaded.length} overloaded shards to ${underloaded.length} underloaded shards`,
      };
    }

    return {
      success: true,
      message: 'Shards are balanced',
    };
  }
}

/**
 * Lambda Handler for local testing
 */
export async function handler(event: any): Promise<any> {
  console.log('🔀 Sharding Router Lambda invoked');
  console.log('Event:', JSON.stringify(event, null, 2));

  const dynamodbClient = {} as DynamoDB;
  const router = new ShardingRouter(dynamodbClient, 4);

  try {
    const result = await router.routeRequest({
      householdId: event.householdId || 'household-123',
      operation: event.operation || 'get',
      data: event.data,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        result,
        shardStats: router.getShardStats(),
      }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: String(error),
      }),
    };
  }
}
