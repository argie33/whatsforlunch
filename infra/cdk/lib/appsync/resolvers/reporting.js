// Reporting & Analytics
// Generate reports and insights from usage data

const { ddb, TABLE_NAME } = require('./utils');

/**
 * Usage analytics reporter
 */
class UsageReporter {
  /**
   * Get household activity report
   */
  async getHouseholdReport(householdId, daysBack = 30) {
    const cutoffDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);

    const result = await ddb
      .query({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: {
          ':pk': `HOUSEHOLD#${householdId}`,
          ':sk': 'ITEM#',
        },
      })
      .promise();

    const items = result.Items || [];

    const report = {
      householdId,
      period: `Last ${daysBack} days`,
      reportDate: new Date().toISOString(),
      stats: {
        totalItems: items.length,
        activeItems: items.filter((i) => i.status === 'active').length,
        eatenItems: items.filter((i) => i.status === 'eaten' && new Date(i.updatedAt) > cutoffDate)
          .length,
        tossedItems: items.filter(
          (i) => i.status === 'tossed' && new Date(i.updatedAt) > cutoffDate
        ).length,
        frozenItems: items.filter((i) => i.status === 'frozen').length,
      },
      wasteRate: 0,
      avgItemLifespan: 0,
      topWastedFoods: [],
      trends: {},
    };

    // Calculate waste rate
    const consumedItems = report.stats.eatenItems + report.stats.tossedItems;
    report.wasteRate =
      consumedItems > 0
        ? ((report.stats.tossedItems / consumedItems) * 100).toFixed(2) + '%'
        : 'N/A';

    // Get top wasted foods
    const wasteByFood = {};
    items
      .filter((i) => i.status === 'tossed' && new Date(i.updatedAt) > cutoffDate)
      .forEach((i) => {
        wasteByFood[i.foodType] = (wasteByFood[i.foodType] || 0) + 1;
      });

    report.topWastedFoods = Object.entries(wasteByFood)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([food, count]) => ({ food, count }));

    return report;
  }

  /**
   * Get user activity report
   */
  async getUserReport(userId, daysBack = 30) {
    const cutoffDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);

    // Get user's households
    const householdResult = await ddb
      .query({
        TableName: TABLE_NAME,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :pk',
        ExpressionAttributeValues: {
          ':pk': `USER#${userId}`,
        },
      })
      .promise();

    const households = (householdResult.Items || [])
      .filter((m) => m.entityType === 'HouseholdMember')
      .map((m) => m.householdId);

    const report = {
      userId,
      period: `Last ${daysBack} days`,
      reportDate: new Date().toISOString(),
      households: households.length,
      stats: {
        itemsCreated: 0,
        itemsEaten: 0,
        itemsWasted: 0,
        actionsPerDay: 0,
      },
      householdDetails: [],
    };

    // Get items created by this user across all households
    const scanResult = await ddb
      .scan({
        TableName: TABLE_NAME,
        FilterExpression:
          'createdByUserId = :userId AND entityType = :type AND #updatedAt > :cutoff',
        ExpressionAttributeNames: {
          '#updatedAt': 'updatedAt',
        },
        ExpressionAttributeValues: {
          ':userId': userId,
          ':type': 'Item',
          ':cutoff': cutoffDate.toISOString(),
        },
      })
      .promise();

    const items = scanResult.Items || [];
    report.stats.itemsCreated = items.length;
    report.stats.itemsEaten = items.filter((i) => i.status === 'eaten').length;
    report.stats.itemsWasted = items.filter((i) => i.status === 'tossed').length;
    report.stats.actionsPerDay = (items.length / daysBack).toFixed(2);

    // Get details for each household
    for (const householdId of households) {
      const houseReport = await this.getHouseholdReport(householdId, daysBack);
      report.householdDetails.push(houseReport);
    }

    return report;
  }

  /**
   * Generate compliance report (GDPR, data retention)
   */
  async getComplianceReport(householdId) {
    const result = await ddb
      .query({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'PK = :pk',
        ExpressionAttributeValues: {
          ':pk': `HOUSEHOLD#${householdId}`,
        },
      })
      .promise();

    const items = result.Items || [];

    const report = {
      householdId,
      generatedAt: new Date().toISOString(),
      dataRetention: {
        total: items.length,
        withoutDeletion: items.filter((i) => !i.deletedAt).length,
        softDeleted: items.filter((i) => i.deletedAt).length,
        olderThan30Days: items.filter(
          (i) => new Date(i.createdAt) < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        ).length,
      },
      gdprCompliance: {
        hasVersioning: items.every((i) => i._version !== undefined),
        hasTimestamps: items.every((i) => i.createdAt && i.updatedAt),
        hasDeletionRecords: items.some((i) => i.deletedAt),
        auditTrail: 'enabled',
      },
      dataExportable: true,
      dataRetentionPolicy: '2+ years for audits, 30 days for soft-deletes',
    };

    return report;
  }

  /**
   * Export data for user (GDPR data portability)
   */
  async exportUserData(userId) {
    const profileResult = await ddb
      .query({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'PK = :pk AND SK = :sk',
        ExpressionAttributeValues: {
          ':pk': `USER#${userId}`,
          ':sk': 'PROFILE',
        },
      })
      .promise();

    const householdResult = await ddb
      .query({
        TableName: TABLE_NAME,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :pk',
        ExpressionAttributeValues: {
          ':pk': `USER#${userId}`,
        },
      })
      .promise();

    const export_ = {
      exportDate: new Date().toISOString(),
      userId,
      profile: profileResult.Items?.[0] || null,
      households: householdResult.Items || [],
      dataFormat: 'JSON',
      version: '1.0',
    };

    return export_;
  }
}

/**
 * Performance metrics reporter
 */
class PerformanceReporter {
  /**
   * Generate performance report from metrics
   */
  static generateReport(metrics) {
    const summary = {};

    // Aggregate all resolver metrics
    for (const [resolverId, resolverMetrics] of Object.entries(metrics)) {
      const durations = resolverMetrics.map((m) => m.duration);
      const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
      const p95 = durations.sort((a, b) => a - b)[Math.floor(durations.length * 0.95)];

      summary[resolverId] = {
        callCount: durations.length,
        avgDuration: Math.floor(avg),
        maxDuration: Math.max(...durations),
        p95Duration: Math.floor(p95),
        slowCalls: durations.filter((d) => d > 1000).length,
      };
    }

    return {
      reportDate: new Date().toISOString(),
      resolvers: summary,
      recommendations: PerformanceReporter.generateRecommendations(summary),
    };
  }

  /**
   * Generate optimization recommendations
   */
  static generateRecommendations(summary) {
    const recommendations = [];

    for (const [resolverId, stats] of Object.entries(summary)) {
      if (stats.avgDuration > 500) {
        recommendations.push({
          resolver: resolverId,
          issue: 'High average latency',
          suggestion: 'Add caching or optimize query',
          priority: 'high',
        });
      }

      if (stats.slowCalls > stats.callCount * 0.1) {
        // >10% slow calls
        recommendations.push({
          resolver: resolverId,
          issue: 'Frequent slow calls (>1s)',
          suggestion: 'Investigate query performance',
          priority: 'medium',
        });
      }

      if (stats.p95Duration > 2000) {
        recommendations.push({
          resolver: resolverId,
          issue: 'High p95 latency',
          suggestion: 'Add batch operations or pagination',
          priority: 'medium',
        });
      }
    }

    return recommendations;
  }
}

/**
 * Cost estimation reporter
 */
class CostEstimator {
  /**
   * Estimate monthly costs based on usage
   */
  static estimateMonthlyCost(requestsPerMonth = 1000000) {
    const dynamoDBReadUnits = requestsPerMonth * 0.5; // Estimate
    const dynamoDBWriteUnits = requestsPerMonth * 0.2; // Estimate
    const lambdaInvocations = requestsPerMonth;
    const lambdaDurationMs = requestsPerMonth * 100; // 100ms average

    const costs = {
      dynamoDB: {
        readUnits: (dynamoDBReadUnits / 1000000) * 0.25, // $0.25 per million
        writeUnits: (dynamoDBWriteUnits / 1000000) * 1.25, // $1.25 per million
        storage: 100, // Estimate $100/month
      },
      lambda: {
        invocations: (lambdaInvocations / 1000000) * 0.2, // $0.2 per million
        compute: (lambdaDurationMs / 400000) * 0.0000166667, // $0.0000166667 per GB-sec
      },
      apiGateway: (requestsPerMonth / 1000000) * 3.5, // $3.5 per million
      dataTransfer: 50, // Estimate $50/month
    };

    const total =
      costs.dynamoDB.readUnits +
      costs.dynamoDB.writeUnits +
      costs.dynamoDB.storage +
      costs.lambda.invocations +
      costs.lambda.compute +
      costs.apiGateway +
      costs.dataTransfer;

    return {
      requestsPerMonth,
      estimatedMonthlyCost: total.toFixed(2),
      breakdown: costs,
      note: 'Estimates based on typical usage patterns',
    };
  }
}

module.exports = {
  UsageReporter,
  PerformanceReporter,
  CostEstimator,
};
