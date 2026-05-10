import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as logs from 'aws-cdk-lib/aws-logs';
import { BaseStack, BaseStackProps } from './base-stack';

export class ShardingStack extends BaseStack {
  public readonly shardMetadataTable: dynamodb.Table;

  constructor(scope: cdk.App, id: string, props: BaseStackProps) {
    super(scope, id, props);

    const env = this.config.env;
    const appName = 'wfl';

    this.shardMetadataTable = new dynamodb.Table(this, 'ShardMetadataTable', {
      tableName: `${appName}-shard-metadata-${env}`,
      partitionKey: {
        name: 'shardId',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      pointInTimeRecovery: true,
      removalPolicy: env === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    this.shardMetadataTable.addGlobalSecondaryIndex({
      indexName: 'statusIndex',
      partitionKey: {
        name: 'status',
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    const shardAllocationTable = new dynamodb.Table(this, 'ShardAllocationTable', {
      tableName: `${appName}-shard-allocation-${env}`,
      partitionKey: {
        name: 'hashRange',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'timestamp',
        type: dynamodb.AttributeType.NUMBER,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      pointInTimeRecovery: true,
      removalPolicy: env === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    new logs.LogGroup(this, 'ShardingOperationLogs', {
      logGroupName: `/aws/sharding/${appName}-${env}`,
      retention: env === 'prod' ? logs.RetentionDays.ONE_MONTH : logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const shardLoadMetric = new cloudwatch.Metric({
      namespace: `${appName}/Sharding`,
      metricName: 'ShardLoad',
      statistic: 'Average',
      period: cdk.Duration.minutes(5),
    });

    new cloudwatch.Alarm(this, 'HighShardLoadAlarm', {
      alarmName: `${appName}-shard-load-high-${env}`,
      metric: shardLoadMetric,
      threshold: 0.85,
      evaluationPeriods: 3,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    new cloudwatch.Dashboard(this, 'ShardingDashboard', {
      dashboardName: `${appName}-sharding-${env}`,
      widgets: [
        [
          new cloudwatch.GraphWidget({
            title: 'Shard Load Distribution',
            left: [shardLoadMetric],
            width: 12,
          }),
        ],
      ],
    });

    new cdk.CfnOutput(this, 'ShardMetadataTableName', {
      value: this.shardMetadataTable.tableName,
      description: 'DynamoDB table for shard metadata',
      exportName: `${appName}-shard-metadata-table-${env}`,
    });

    new cdk.CfnOutput(this, 'ShardAllocationTableName', {
      value: shardAllocationTable.tableName,
      description: 'DynamoDB table for shard allocation',
      exportName: `${appName}-shard-allocation-table-${env}`,
    });
  }
}
