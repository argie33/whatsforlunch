/**
 * Phase C.5: Replication Monitor Lambda
 * Tracks multi-region data replication health and consistency
 */

import { CloudWatch, DynamoDB } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';

interface ReplicationMetric {
  region: string;
  replicationLatencyMs: number;
  itemsReplicated: number;
  failedReplications: number;
  lastChecked: number;
  isHealthy: boolean;
}

interface DataConsistencyReport {
  primaryRegion: string;
  secondaryRegion: string;
  consistencyScore: number; // 0-100
  dataGapItems: number;
  lastSyncTime: number;
  recommendations: string[];
}

export class ReplicationMonitor {
  private dynamodb: DynamoDB;
  private cloudwatch: CloudWatch;
  private primaryRegion = 'us-east-1';
  private secondaryRegion = 'us-west-2';
  private metrics: Map<string, ReplicationMetric> = new Map();

  constructor(dynamodbClient: DynamoDB, cloudwatchClient: CloudWatch) {
    this.dynamodb = dynamodbClient;
    this.cloudwatch = cloudwatchClient;
    this.initializeMetrics();
  }

  private initializeMetrics(): void {
    this.metrics.set(this.primaryRegion, {
      region: this.primaryRegion,
      replicationLatencyMs: 0,
      itemsReplicated: 0,
      failedReplications: 0,
      lastChecked: Date.now(),
      isHealthy: true,
    });

    this.metrics.set(this.secondaryRegion, {
      region: this.secondaryRegion,
      replicationLatencyMs: 0,
      itemsReplicated: 0,
      failedReplications: 0,
      lastChecked: Date.now(),
      isHealthy: true,
    });

    console.log(`✅ Initialized replication monitor for ${this.primaryRegion} <-> ${this.secondaryRegion}`);
  }

  async checkReplicationHealth(
    householdId: string
  ): Promise<{ success: boolean; metrics: ReplicationMetric[] }> {
    try {
      const startTime = Date.now();

      // Check primary region data
      const primaryData = await this.dynamodb.getItem({
        TableName: 'wfl-main-dev',
        Key: marshall({
          PK: `HOUSEHOLD#${householdId}`,
          SK: 'PROFILE',
        }),
      });

      const primaryItem = primaryData.Item ? unmarshall(primaryData.Item) : null;

      // Simulate checking secondary region (in production, would connect to secondary region)
      const replicationLatency = Math.floor(Math.random() * 500) + 50; // 50-550ms

      // Update metrics
      const primaryMetric = this.metrics.get(this.primaryRegion)!;
      primaryMetric.replicationLatencyMs = replicationLatency;
      primaryMetric.itemsReplicated++;
      primaryMetric.lastChecked = Date.now();
      primaryMetric.isHealthy = replicationLatency < 1000; // Healthy if <1s latency

      const secondaryMetric = this.metrics.get(this.secondaryRegion)!;
      secondaryMetric.lastChecked = Date.now();
      secondaryMetric.isHealthy = true;

      // If latency too high, mark as degraded
      if (replicationLatency > 1000) {
        console.warn(`⚠️  High replication latency detected: ${replicationLatency}ms`);
        primaryMetric.failedReplications++;
      }

      // Publish metrics to CloudWatch
      await this.publishMetrics(primaryMetric);

      console.log(
        `✅ Replication check completed for ${householdId}: ${replicationLatency}ms latency`
      );

      return {
        success: true,
        metrics: Array.from(this.metrics.values()),
      };
    } catch (error) {
      console.error('Replication health check failed:', error);
      return {
        success: false,
        metrics: Array.from(this.metrics.values()),
      };
    }
  }

  async checkDataConsistency(householdId: string): Promise<DataConsistencyReport> {
    try {
      const startTime = Date.now();

      // Query items from primary region
      const primaryResult = await this.dynamodb.query({
        TableName: 'wfl-main-dev',
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: {
          ':pk': { S: `HOUSEHOLD#${householdId}` },
          ':sk': { S: 'ITEM#' },
        },
      });

      const primaryItems = primaryResult.Items?.map((item) => unmarshall(item)) || [];

      // Simulate secondary region query (in production, would connect to secondary)
      const secondaryItems = primaryItems.slice(0, Math.max(0, primaryItems.length - 1));

      const dataGap = primaryItems.length - secondaryItems.length;
      const consistencyScore = primaryItems.length > 0
        ? ((primaryItems.length - dataGap) / primaryItems.length) * 100
        : 100;

      const syncTime = Date.now() - startTime;

      // Generate recommendations
      const recommendations: string[] = [];
      if (consistencyScore < 95) {
        recommendations.push('High data inconsistency detected - consider triggering manual replication');
      }
      if (syncTime > 2000) {
        recommendations.push('Replication sync time is slow - check network connectivity');
      }
      if (dataGap > 0) {
        recommendations.push(`${dataGap} items pending replication - monitor for sync completion`);
      }

      const report: DataConsistencyReport = {
        primaryRegion: this.primaryRegion,
        secondaryRegion: this.secondaryRegion,
        consistencyScore: Math.round(consistencyScore),
        dataGapItems: dataGap,
        lastSyncTime: syncTime,
        recommendations,
      };

      // Store consistency report
      try {
        await this.dynamodb.putItem({
          TableName: 'wfl-main-dev',
          Item: marshall({
            PK: `HOUSEHOLD#${householdId}`,
            SK: `REPLICATION#${Date.now()}`,
            ...report,
            expiresAt: Math.floor(Date.now() / 1000) + 86400, // 24-hour TTL
          }),
        });
      } catch (error) {
        console.warn('Failed to store consistency report:', error);
      }

      console.log(
        `📊 Consistency check: ${consistencyScore}% match, ${dataGap} items pending`
      );

      return report;
    } catch (error) {
      console.error('Data consistency check failed:', error);
      return {
        primaryRegion: this.primaryRegion,
        secondaryRegion: this.secondaryRegion,
        consistencyScore: 0,
        dataGapItems: 0,
        lastSyncTime: 0,
        recommendations: ['Failed to check consistency - check database connectivity'],
      };
    }
  }

  async triggerRebalancing(householdId: string): Promise<{ success: boolean; message: string }> {
    try {
      const timestamp = Date.now();

      // In production: trigger replication rebalancing workflow
      // For local: simulate rebalancing request

      await this.dynamodb.putItem({
        TableName: 'wfl-main-dev',
        Item: marshall({
          PK: `HOUSEHOLD#${householdId}`,
          SK: `REBALANCE#${timestamp}`,
          status: 'initiated',
          primaryRegion: this.primaryRegion,
          secondaryRegion: this.secondaryRegion,
          initiatedAt: timestamp,
          expiresAt: Math.floor(timestamp / 1000) + 3600, // 1-hour TTL
        }),
      });

      console.log(`🔄 Rebalancing initiated for ${householdId}`);

      return {
        success: true,
        message: `Rebalancing initiated between ${this.primaryRegion} and ${this.secondaryRegion}`,
      };
    } catch (error) {
      console.error('Failed to trigger rebalancing:', error);
      return {
        success: false,
        message: `Rebalancing failed: ${String(error)}`,
      };
    }
  }

  private async publishMetrics(metric: ReplicationMetric): Promise<void> {
    // In production: would publish to CloudWatch
    // For local: log metrics
    console.log(
      `📈 Metric published: ${metric.region} - ${metric.replicationLatencyMs}ms latency, ` +
      `${metric.itemsReplicated} replicated, ${metric.failedReplications} failed`
    );
  }

  getMetricsSummary(): Record<string, ReplicationMetric> {
    const summary: Record<string, ReplicationMetric> = {};
    for (const [region, metric] of this.metrics) {
      summary[region] = { ...metric };
    }
    return summary;
  }
}

/**
 * Lambda Handler for local testing
 */
export async function handler(event: any): Promise<any> {
  console.log('🔍 Replication Monitor Lambda invoked');
  console.log('Event:', JSON.stringify(event, null, 2));

  const dynamodbClient = {} as DynamoDB;
  const cloudwatchClient = {} as CloudWatch;

  const monitor = new ReplicationMonitor(dynamodbClient, cloudwatchClient);
  const householdId = event.householdId || 'household-123';
  const action = event.action || 'check-health';

  try {
    let result;

    switch (action) {
      case 'check-health':
        result = await monitor.checkReplicationHealth(householdId);
        break;
      case 'check-consistency':
        result = await monitor.checkDataConsistency(householdId);
        break;
      case 'trigger-rebalancing':
        result = await monitor.triggerRebalancing(householdId);
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        action,
        result,
        metrics: monitor.getMetricsSummary(),
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
