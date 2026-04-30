import * as cdk from 'aws-cdk-lib';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as logs from 'aws-cdk-lib/aws-logs';
import { BaseStack, BaseStackProps } from './base-stack';

export class MultiRegionStack extends BaseStack {
  constructor(scope: cdk.App, id: string, props: BaseStackProps) {
    super(scope, id, props);

    const env = this.config.env;
    const appName = 'wfl';
    const primaryRegion = 'us-east-1';
    const secondaryRegion = 'us-west-2';

    new logs.LogGroup(this, 'ReplicationLogs', {
      logGroupName: `/aws/dynamodb/${appName}-replication-${env}`,
      retention: env === 'prod' ? logs.RetentionDays.ONE_MONTH : logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const replicationLatencyMetric = new cloudwatch.Metric({
      namespace: `${appName}/MultiRegion`,
      metricName: 'ReplicationLatency',
      statistic: 'Average',
      period: cdk.Duration.minutes(1),
    });

    new cloudwatch.Alarm(this, 'HighReplicationLatencyAlarm', {
      alarmName: `${appName}-replication-latency-high-${env}`,
      metric: replicationLatencyMetric,
      threshold: 1000,
      evaluationPeriods: 3,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    new cloudwatch.Dashboard(this, 'MultiRegionDashboard', {
      dashboardName: `${appName}-multi-region-${env}`,
      widgets: [
        [
          new cloudwatch.GraphWidget({
            title: 'Replication Latency (ms)',
            left: [replicationLatencyMetric],
            width: 12,
          }),
        ],
      ],
    });

    new cdk.CfnOutput(this, 'PrimaryRegion', {
      value: primaryRegion,
      description: 'Primary region for multi-region setup',
      exportName: `${appName}-primary-region-${env}`,
    });

    new cdk.CfnOutput(this, 'SecondaryRegion', {
      value: secondaryRegion,
      description: 'Secondary region for failover',
      exportName: `${appName}-secondary-region-${env}`,
    });
  }
}
