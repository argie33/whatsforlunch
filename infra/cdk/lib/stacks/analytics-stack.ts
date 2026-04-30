import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as logs from 'aws-cdk-lib/aws-logs';
import { BaseStack, BaseStackProps } from './base-stack';

export class AnalyticsStack extends BaseStack {
  public readonly analyticsEventTable: dynamodb.Table;
  public readonly costAnalysisTable: dynamodb.Table;

  constructor(scope: cdk.App, id: string, props: BaseStackProps) {
    super(scope, id, props);

    const env = this.config.env;
    const appName = 'wfl';

    // ============================================
    // AnalyticsEvent Table (event stream)
    // ============================================
    this.analyticsEventTable = new dynamodb.Table(this, 'AnalyticsEventTable', {
      tableName: `${appName}-analytics-event-${env}`,
      partitionKey: {
        name: 'userId',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'timestamp',
        type: dynamodb.AttributeType.NUMBER,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      pointInTimeRecovery: true,
      timeToLiveAttribute: 'expirationTime',
      removalPolicy: env === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    // GSI: eventType (for querying specific event types)
    this.analyticsEventTable.addGlobalSecondaryIndex({
      indexName: 'eventTypeIndex',
      partitionKey: {
        name: 'eventType',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'timestamp',
        type: dynamodb.AttributeType.NUMBER,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // GSI: householdId (for household-level analytics)
    this.analyticsEventTable.addGlobalSecondaryIndex({
      indexName: 'householdIdIndex',
      partitionKey: {
        name: 'householdId',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'timestamp',
        type: dynamodb.AttributeType.NUMBER,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // ============================================
    // CostAnalysis Table (aggregated reports)
    // ============================================
    this.costAnalysisTable = new dynamodb.Table(this, 'CostAnalysisTable', {
      tableName: `${appName}-cost-analysis-${env}`,
      partitionKey: {
        name: 'householdId',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'period',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      pointInTimeRecovery: true,
      removalPolicy: env === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    // GSI: by month for trend analysis
    this.costAnalysisTable.addGlobalSecondaryIndex({
      indexName: 'monthIndex',
      partitionKey: {
        name: 'month',
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // ============================================
    // CloudWatch Log Groups
    // ============================================
    new logs.LogGroup(this, 'AnalyticsProcessingLogs', {
      logGroupName: `/aws/analytics/${appName}-${env}`,
      retention: env === 'prod' ? logs.RetentionDays.ONE_MONTH : logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // ============================================
    // CloudWatch Metrics
    // ============================================
    const eventsTrackedMetric = new cloudwatch.Metric({
      namespace: `${appName}/Analytics`,
      metricName: 'EventsTracked',
      statistic: 'Sum',
      period: cdk.Duration.minutes(1),
    });

    const costCalculationLatencyMetric = new cloudwatch.Metric({
      namespace: `${appName}/Analytics`,
      metricName: 'CostCalculationLatency',
      statistic: 'Average',
      period: cdk.Duration.minutes(5),
      unit: 'Milliseconds',
    });

    // ============================================
    // CloudWatch Alarms
    // ============================================
    new cloudwatch.Alarm(this, 'EventCaptureRateAlarm', {
      alarmName: `${appName}-event-capture-rate-${env}`,
      metric: new cloudwatch.Metric({
        namespace: `${appName}/Analytics`,
        metricName: 'EventsCaptured',
        statistic: 'Sum',
        period: cdk.Duration.minutes(5),
      }),
      threshold: 10,
      evaluationPeriods: 2,
      comparisonOperator: cloudwatch.ComparisonOperator.LESS_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    new cloudwatch.Alarm(this, 'CostCalculationLatencyAlarm', {
      alarmName: `${appName}-cost-calc-latency-${env}`,
      metric: costCalculationLatencyMetric,
      threshold: 2000,
      evaluationPeriods: 3,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    // ============================================
    // CloudWatch Dashboard
    // ============================================
    new cloudwatch.Dashboard(this, 'AnalyticsDashboard', {
      dashboardName: `${appName}-analytics-${env}`,
      widgets: [
        [
          new cloudwatch.GraphWidget({
            title: 'Events Tracked',
            left: [eventsTrackedMetric],
            width: 8,
          }),
          new cloudwatch.GraphWidget({
            title: 'Cost Calculation Latency',
            left: [costCalculationLatencyMetric],
            width: 8,
          }),
          new cloudwatch.SingleValueWidget({
            title: 'Event Capture Rate %',
            metrics: [
              new cloudwatch.Metric({
                namespace: `${appName}/Analytics`,
                metricName: 'CaptureRate',
                statistic: 'Average',
              }),
            ],
            width: 8,
          }),
        ],
        [
          new cloudwatch.GraphWidget({
            title: 'Cost by Category (Last 24h)',
            left: [
              new cloudwatch.Metric({
                namespace: `${appName}/Analytics`,
                metricName: 'CostByCategory',
                statistic: 'Sum',
                period: cdk.Duration.hours(1),
              }),
            ],
            width: 12,
          }),
          new cloudwatch.GraphWidget({
            title: 'Top Cost Items',
            left: [
              new cloudwatch.Metric({
                namespace: `${appName}/Analytics`,
                metricName: 'TopItems',
                statistic: 'Sum',
              }),
            ],
            width: 12,
          }),
        ],
      ],
    });

    // ============================================
    // Outputs
    // ============================================
    new cdk.CfnOutput(this, 'AnalyticsEventTableName', {
      value: this.analyticsEventTable.tableName,
      description: 'DynamoDB Analytics Event table name',
      exportName: `${appName}-analytics-event-table-${env}`,
    });

    new cdk.CfnOutput(this, 'AnalyticsEventTableArn', {
      value: this.analyticsEventTable.tableArn,
      description: 'DynamoDB Analytics Event table ARN',
      exportName: `${appName}-analytics-event-table-arn-${env}`,
    });

    new cdk.CfnOutput(this, 'CostAnalysisTableName', {
      value: this.costAnalysisTable.tableName,
      description: 'DynamoDB Cost Analysis table name',
      exportName: `${appName}-cost-analysis-table-${env}`,
    });

    new cdk.CfnOutput(this, 'CostAnalysisTableArn', {
      value: this.costAnalysisTable.tableArn,
      description: 'DynamoDB Cost Analysis table ARN',
      exportName: `${appName}-cost-analysis-table-arn-${env}`,
    });
  }
}
