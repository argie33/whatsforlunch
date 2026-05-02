import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
  GetCommand,
} from '@aws-sdk/lib-dynamodb';

const ANALYTICS_TABLE = process.env.ANALYTICS_TABLE || 'WhatsForLunch-Analytics';
const EVENT_BUFFER_SIZE = 25;
const EVENT_BUFFER_FLUSH_MS = 5000; // 5 seconds

export const EventTypes = {
  ITEM_ADDED: 'item_added',
  ITEM_EATEN: 'item_eaten',
  ITEM_WASTED: 'item_wasted',
  ITEM_SHARED: 'item_shared',
  SEARCH_QUERY: 'search_query',
  RECIPE_VIEWED: 'recipe_viewed',
  RECIPE_ATTEMPTED: 'recipe_attempted',
  HOUSEHOLD_CREATED: 'household_created',
};

export class Analytics {
  constructor(options = {}) {
    this.dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
    this.docClient = DynamoDBDocumentClient.from(this.dynamoClient);
    this.tableName = options.tableName || ANALYTICS_TABLE;
    this.bufferSize = options.bufferSize || EVENT_BUFFER_SIZE;
    this.flushInterval = options.flushInterval || EVENT_BUFFER_FLUSH_MS;

    this.eventBuffer = [];
    this.bufferTimer = null;
    this.stats = {
      eventsLogged: 0,
      eventsFlushed: 0,
      errors: 0,
    };
  }

  async trackEvent(event) {
    try {
      if (!event.userId || !event.householdId || !event.eventType) {
        throw new Error('Missing required event fields: userId, householdId, eventType');
      }

      const enrichedEvent = {
        PK: `USER#${event.userId}`,
        SK: `ANALYTICS#${event.eventType}#${new Date().toISOString()}`,
        entityType: 'AnalyticsEvent',
        eventType: event.eventType,
        householdId: event.householdId,
        userId: event.userId,
        timestamp: new Date().toISOString(),
        metadata: event.metadata || {},
        ttl: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // 30 days
      };

      this.eventBuffer.push(enrichedEvent);
      this.stats.eventsLogged++;

      // Auto-flush if buffer is full
      if (this.eventBuffer.length >= this.bufferSize) {
        await this.flush();
      } else if (!this.bufferTimer) {
        this.bufferTimer = setTimeout(() => this.flush(), this.flushInterval);
      }

      return enrichedEvent;
    } catch (error) {
      console.error('[Analytics] Track event error:', error.message);
      this.stats.errors++;
      throw error;
    }
  }

  async flush() {
    if (this.eventBuffer.length === 0) return;

    try {
      const events = this.eventBuffer.splice(0);

      // Batch write to DynamoDB
      for (const event of events) {
        await this.docClient.send(
          new PutCommand({
            TableName: this.tableName,
            Item: event,
          }),
        );
      }

      this.stats.eventsFlushed += events.length;
      clearTimeout(this.bufferTimer);
      this.bufferTimer = null;
    } catch (error) {
      console.error('[Analytics] Flush error:', error.message);
      this.stats.errors++;
      // Re-add events to buffer for retry
      this.eventBuffer.unshift(...events);
    }
  }

  async getUserEvents(userId, options = {}) {
    try {
      const limit = options.limit || 100;
      const days = options.days || 30;

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const params = {
        TableName: this.tableName,
        KeyConditionExpression: 'PK = :pk AND SK > :sk',
        ExpressionAttributeValues: {
          ':pk': `USER#${userId}`,
          ':sk': `ANALYTICS#${startDate.toISOString()}`,
        },
        Limit: limit,
        ScanIndexForward: false, // Newest first
      };

      const response = await this.docClient.send(new QueryCommand(params));
      return response.Items || [];
    } catch (error) {
      console.error('[Analytics] Get user events error:', error.message);
      this.stats.errors++;
      return [];
    }
  }

  async getHouseholdEvents(householdId, options = {}) {
    try {
      const days = options.days || 30;
      const limit = options.limit || 100;

      // Query GSI: HouseholdId-Timestamp
      const params = {
        TableName: this.tableName,
        IndexName: 'HouseholdId-Timestamp-Index',
        KeyConditionExpression: 'householdId = :hid',
        ExpressionAttributeValues: {
          ':hid': householdId,
        },
        Limit: limit,
        ScanIndexForward: false,
      };

      const response = await this.docClient.send(new QueryCommand(params));
      const events = response.Items || [];

      // Filter by date
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      return events.filter((e) => new Date(e.timestamp) > startDate);
    } catch (error) {
      console.error('[Analytics] Get household events error:', error.message);
      this.stats.errors++;
      return [];
    }
  }

  async analyzeCosts(householdId, options = {}) {
    try {
      const events = await this.getHouseholdEvents(householdId, {
        days: options.days || 30,
      });

      let totalCost = 0;
      let wastedCost = 0;
      let categoryCosts = {};

      for (const event of events) {
        const metadata = event.metadata || {};

        if (metadata.estimatedCost) {
          const cost = parseFloat(metadata.estimatedCost);
          totalCost += cost;

          if (event.eventType === EventTypes.ITEM_WASTED) {
            wastedCost += cost;
          }

          if (metadata.category) {
            categoryCosts[metadata.category] = (categoryCosts[metadata.category] || 0) + cost;
          }
        }
      }

      return {
        totalCost: parseFloat(totalCost.toFixed(2)),
        wastedCost: parseFloat(wastedCost.toFixed(2)),
        wastePercentage:
          totalCost > 0 ? parseFloat(((wastedCost / totalCost) * 100).toFixed(2)) : 0,
        categoryCosts: Object.fromEntries(
          Object.entries(categoryCosts).map(([cat, cost]) => [cat, parseFloat(cost.toFixed(2))]),
        ),
        period: `${options.days || 30} days`,
      };
    } catch (error) {
      console.error('[Analytics] Analyze costs error:', error.message);
      this.stats.errors++;
      return null;
    }
  }

  async calculateTrends(householdId, options = {}) {
    try {
      const events = await this.getHouseholdEvents(householdId, {
        days: options.days || 30,
      });

      const costs = [];
      for (const event of events) {
        if (event.metadata?.estimatedCost) {
          costs.push(parseFloat(event.metadata.estimatedCost));
        }
      }

      if (costs.length === 0) {
        return {
          min: 0,
          max: 0,
          avg: 0,
          median: 0,
          trend: 'stable',
        };
      }

      costs.sort((a, b) => a - b);

      const min = costs[0];
      const max = costs[costs.length - 1];
      const avg = costs.reduce((a, b) => a + b, 0) / costs.length;
      const median =
        costs.length % 2 === 0
          ? (costs[costs.length / 2 - 1] + costs[costs.length / 2]) / 2
          : costs[Math.floor(costs.length / 2)];

      // Simple trend: compare first half to second half
      const midpoint = Math.floor(costs.length / 2);
      const firstHalf = costs.slice(0, midpoint);
      const secondHalf = costs.slice(midpoint);

      const firstHalfAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const secondHalfAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

      let trend = 'stable';
      if (secondHalfAvg > firstHalfAvg * 1.1) trend = 'increasing';
      if (secondHalfAvg < firstHalfAvg * 0.9) trend = 'decreasing';

      return {
        min: parseFloat(min.toFixed(2)),
        max: parseFloat(max.toFixed(2)),
        avg: parseFloat(avg.toFixed(2)),
        median: parseFloat(median.toFixed(2)),
        trend,
        dataPoints: costs.length,
      };
    } catch (error) {
      console.error('[Analytics] Calculate trends error:', error.message);
      this.stats.errors++;
      return null;
    }
  }

  async generateReport(householdId, options = {}) {
    try {
      const costs = await this.analyzeCosts(householdId, options);
      const trends = await this.calculateTrends(householdId, options);

      if (!costs || !trends) return null;

      const report = {
        householdId,
        generatedAt: new Date().toISOString(),
        period: costs.period,
        costs,
        trends,
        recommendations: this._generateRecommendations(costs, trends),
      };

      if (options.format === 'csv') {
        return this._formatCSV(report);
      }
      if (options.format === 'html') {
        return this._formatHTML(report);
      }

      return report;
    } catch (error) {
      console.error('[Analytics] Generate report error:', error.message);
      this.stats.errors++;
      return null;
    }
  }

  _generateRecommendations(costs, trends) {
    const recommendations = [];

    if (costs.wastePercentage > 20) {
      recommendations.push({
        type: 'waste_reduction',
        message: `High waste level (${costs.wastePercentage}%). Consider consuming items before expiry.`,
        priority: 'high',
      });
    }

    if (trends.trend === 'increasing') {
      recommendations.push({
        type: 'spending_increase',
        message: 'Spending is increasing. Review shopping patterns.',
        priority: 'medium',
      });
    }

    const highestCategory = Object.entries(costs.categoryCosts).sort(([, a], [, b]) => b - a)[0];
    if (highestCategory && highestCategory[1] > costs.totalCost * 0.3) {
      recommendations.push({
        type: 'category_focus',
        message: `${highestCategory[0]} is ${((highestCategory[1] / costs.totalCost) * 100).toFixed(0)}% of spending.`,
        priority: 'low',
      });
    }

    return recommendations;
  }

  _formatCSV(report) {
    let csv = 'WhatsForLunch Analytics Report\n';
    csv += `Generated: ${report.generatedAt}\n`;
    csv += `Period: ${report.period}\n\n`;

    csv += 'Cost Analysis\n';
    csv += `Total Cost,${report.costs.totalCost}\n`;
    csv += `Wasted Cost,${report.costs.wastedCost}\n`;
    csv += `Waste Percentage,${report.costs.wastePercentage}%\n\n`;

    csv += 'Trends\n';
    csv += `Min,${report.trends.min}\n`;
    csv += `Max,${report.trends.max}\n`;
    csv += `Average,${report.trends.avg}\n`;
    csv += `Median,${report.trends.median}\n`;
    csv += `Trend,${report.trends.trend}\n\n`;

    return csv;
  }

  _formatHTML(report) {
    return `
      <!DOCTYPE html>
      <html>
        <head><title>WhatsForLunch Analytics Report</title></head>
        <body>
          <h1>Analytics Report</h1>
          <p>Generated: ${report.generatedAt}</p>
          <p>Period: ${report.period}</p>

          <h2>Cost Analysis</h2>
          <ul>
            <li>Total Cost: $${report.costs.totalCost}</li>
            <li>Wasted Cost: $${report.costs.wastedCost}</li>
            <li>Waste: ${report.costs.wastePercentage}%</li>
          </ul>

          <h2>Trends</h2>
          <ul>
            <li>Min: $${report.trends.min}</li>
            <li>Max: $${report.trends.max}</li>
            <li>Average: $${report.trends.avg}</li>
            <li>Median: $${report.trends.median}</li>
            <li>Trend: ${report.trends.trend}</li>
          </ul>

          <h2>Recommendations</h2>
          <ul>
            ${report.recommendations.map((r) => `<li>[${r.priority}] ${r.message}</li>`).join('')}
          </ul>
        </body>
      </html>
    `;
  }

  getStats() {
    return {
      ...this.stats,
      bufferSize: this.eventBuffer.length,
    };
  }
}

export default Analytics;
