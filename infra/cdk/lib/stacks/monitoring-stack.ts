import * as cdk from 'aws-cdk-lib';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as actions from 'aws-cdk-lib/aws-cloudwatch-actions';
import * as sns from 'aws-cdk-lib/aws-sns';
import { BaseStack, BaseStackProps } from './base-stack';
import { ApiStack } from './api-stack';
import { NotificationsStack } from './notifications-stack';

export interface MonitoringStackProps extends BaseStackProps {
  apiStack: ApiStack;
  notificationsStack: NotificationsStack;
}

export class MonitoringStack extends BaseStack {
  public readonly dashboard: cloudwatch.Dashboard;
  public readonly alarmTopic: sns.Topic;

  constructor(scope: cdk.App, id: string, props: MonitoringStackProps) {
    super(scope, id, props);

    const env = this.config.env;
    const appName = 'wfl';

    // ============================================
    // SNS Topic for Alarms
    // ============================================
    this.alarmTopic = new sns.Topic(this, 'AlarmTopic', {
      topicName: `${appName}-alarms-${env}`,
      displayName: 'WhatsForLunch Monitoring Alarms',
    });

    // ============================================
    // CloudWatch Dashboard
    // ============================================
    this.dashboard = new cloudwatch.Dashboard(this, 'MainDashboard', {
      dashboardName: `${appName}-main-${env}`,
    });

    // ============================================
    // API Metrics Section
    // ============================================
    this.dashboard.addWidgets(
      new cloudwatch.TextWidget({
        markdown: '# GraphQL API Metrics',
        width: 24,
        height: 1,
      }),
    );

    // AppSync Requests
    this.dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'AppSync Requests',
        width: 12,
        height: 6,
        left: [
          new cloudwatch.Metric({
            namespace: 'AWS/AppSync',
            metricName: 'Requests',
            statistic: 'Sum',
            period: cdk.Duration.minutes(1),
          }),
        ],
        leftYAxis: {
          label: 'Requests',
        },
      }),
    );

    // AppSync Latency
    this.dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'AppSync Latency',
        width: 12,
        height: 6,
        left: [
          new cloudwatch.Metric({
            namespace: 'AWS/AppSync',
            metricName: 'GraphQLLatency',
            statistic: 'Average',
            period: cdk.Duration.minutes(1),
          }),
          new cloudwatch.Metric({
            namespace: 'AWS/AppSync',
            metricName: 'GraphQLLatency',
            statistic: 'p99',
            period: cdk.Duration.minutes(1),
          }),
        ],
        leftYAxis: {
          label: 'Latency (ms)',
        },
      }),
    );

    // AppSync Errors
    this.dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'AppSync Errors',
        width: 12,
        height: 6,
        left: [
          new cloudwatch.Metric({
            namespace: 'AWS/AppSync',
            metricName: 'Errors',
            statistic: 'Sum',
            period: cdk.Duration.minutes(1),
          }),
        ],
        leftYAxis: {
          label: 'Error Count',
        },
      }),
    );

    // Throttles
    this.dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'AppSync Throttles',
        width: 12,
        height: 6,
        left: [
          new cloudwatch.Metric({
            namespace: 'AWS/AppSync',
            metricName: 'Throttles',
            statistic: 'Sum',
            period: cdk.Duration.minutes(1),
          }),
        ],
        leftYAxis: {
          label: 'Throttle Count',
        },
      }),
    );

    // ============================================
    // DynamoDB Metrics Section
    // ============================================
    this.dashboard.addWidgets(
      new cloudwatch.TextWidget({
        markdown: '# DynamoDB Metrics',
        width: 24,
        height: 1,
      }),
    );

    // DynamoDB Read/Write Capacity
    this.dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'DynamoDB Capacity',
        width: 12,
        height: 6,
        left: [
          new cloudwatch.Metric({
            namespace: 'AWS/DynamoDB',
            metricName: 'ConsumedReadCapacityUnits',
            statistic: 'Sum',
            period: cdk.Duration.minutes(1),
          }),
          new cloudwatch.Metric({
            namespace: 'AWS/DynamoDB',
            metricName: 'ConsumedWriteCapacityUnits',
            statistic: 'Sum',
            period: cdk.Duration.minutes(1),
          }),
        ],
        leftYAxis: {
          label: 'Capacity Units',
        },
      }),
    );

    // DynamoDB Throttles
    this.dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'DynamoDB User Errors (Throttles)',
        width: 12,
        height: 6,
        left: [
          new cloudwatch.Metric({
            namespace: 'AWS/DynamoDB',
            metricName: 'UserErrors',
            statistic: 'Sum',
            period: cdk.Duration.minutes(1),
          }),
          new cloudwatch.Metric({
            namespace: 'AWS/DynamoDB',
            metricName: 'SystemErrors',
            statistic: 'Sum',
            period: cdk.Duration.minutes(1),
          }),
        ],
        leftYAxis: {
          label: 'Error Count',
        },
      }),
    );

    // DynamoDB Latency
    this.dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'DynamoDB Latency',
        width: 12,
        height: 6,
        left: [
          new cloudwatch.Metric({
            namespace: 'AWS/DynamoDB',
            metricName: 'SuccessfulRequestLatency',
            statistic: 'Average',
            period: cdk.Duration.minutes(1),
          }),
        ],
        leftYAxis: {
          label: 'Latency (ms)',
        },
      }),
    );

    // Item Count
    this.dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'DynamoDB Item Count',
        width: 12,
        height: 6,
        left: [
          new cloudwatch.Metric({
            namespace: 'AWS/DynamoDB',
            metricName: 'ItemCount',
            statistic: 'Average',
            period: cdk.Duration.hours(1),
          }),
        ],
        leftYAxis: {
          label: 'Items',
        },
      }),
    );

    // ============================================
    // Lambda Metrics Section
    // ============================================
    this.dashboard.addWidgets(
      new cloudwatch.TextWidget({
        markdown: '# Lambda Function Metrics',
        width: 24,
        height: 1,
      }),
    );

    // Lambda Invocations
    this.dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'Lambda Invocations by Function',
        width: 12,
        height: 6,
        left: [
          new cloudwatch.Metric({
            namespace: 'AWS/Lambda',
            metricName: 'Invocations',
            statistic: 'Sum',
            period: cdk.Duration.minutes(1),
            dimensionsMap: {
              FunctionName: `${appName}-delete-account-${env}`,
            },
          }),
          new cloudwatch.Metric({
            namespace: 'AWS/Lambda',
            metricName: 'Invocations',
            statistic: 'Sum',
            period: cdk.Duration.minutes(1),
            dimensionsMap: {
              FunctionName: `${appName}-notify-expiring-${env}`,
            },
          }),
          new cloudwatch.Metric({
            namespace: 'AWS/Lambda',
            metricName: 'Invocations',
            statistic: 'Sum',
            period: cdk.Duration.minutes(1),
            dimensionsMap: {
              FunctionName: `${appName}-food-rules-${env}`,
            },
          }),
        ],
        leftYAxis: {
          label: 'Invocations',
        },
      }),
    );

    // Lambda Errors
    this.dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'Lambda Errors',
        width: 12,
        height: 6,
        left: [
          new cloudwatch.Metric({
            namespace: 'AWS/Lambda',
            metricName: 'Errors',
            statistic: 'Sum',
            period: cdk.Duration.minutes(1),
          }),
        ],
        leftYAxis: {
          label: 'Error Count',
        },
      }),
    );

    // Lambda Duration
    this.dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'Lambda Duration',
        width: 12,
        height: 6,
        left: [
          new cloudwatch.Metric({
            namespace: 'AWS/Lambda',
            metricName: 'Duration',
            statistic: 'Average',
            period: cdk.Duration.minutes(1),
          }),
          new cloudwatch.Metric({
            namespace: 'AWS/Lambda',
            metricName: 'Duration',
            statistic: 'p99',
            period: cdk.Duration.minutes(1),
          }),
        ],
        leftYAxis: {
          label: 'Duration (ms)',
        },
      }),
    );

    // Lambda Concurrent Executions
    this.dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'Lambda Concurrent Executions',
        width: 12,
        height: 6,
        left: [
          new cloudwatch.Metric({
            namespace: 'AWS/Lambda',
            metricName: 'ConcurrentExecutions',
            statistic: 'Maximum',
            period: cdk.Duration.minutes(1),
          }),
        ],
        leftYAxis: {
          label: 'Concurrent Executions',
        },
      }),
    );

    // ============================================
    // Step Functions Section
    // ============================================
    this.dashboard.addWidgets(
      new cloudwatch.TextWidget({
        markdown: '# Step Functions',
        width: 24,
        height: 1,
      }),
    );

    // State Machine Executions
    this.dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'Delete Account State Machine',
        width: 12,
        height: 6,
        left: [
          new cloudwatch.Metric({
            namespace: 'AWS/States',
            metricName: 'ExecutionsFailed',
            statistic: 'Sum',
            period: cdk.Duration.minutes(1),
          }),
          new cloudwatch.Metric({
            namespace: 'AWS/States',
            metricName: 'ExecutionsSucceeded',
            statistic: 'Sum',
            period: cdk.Duration.minutes(1),
          }),
          new cloudwatch.Metric({
            namespace: 'AWS/States',
            metricName: 'ExecutionsTimedOut',
            statistic: 'Sum',
            period: cdk.Duration.minutes(1),
          }),
        ],
        leftYAxis: {
          label: 'Execution Count',
        },
      }),
    );

    // State Machine Execution Time
    this.dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'Delete Account Execution Time',
        width: 12,
        height: 6,
        left: [
          new cloudwatch.Metric({
            namespace: 'AWS/States',
            metricName: 'ExecutionTime',
            statistic: 'Average',
            period: cdk.Duration.minutes(1),
          }),
        ],
        leftYAxis: {
          label: 'Time (ms)',
        },
      }),
    );

    // ============================================
    // EventBridge Section
    // ============================================
    this.dashboard.addWidgets(
      new cloudwatch.TextWidget({
        markdown: '# EventBridge',
        width: 24,
        height: 1,
      }),
    );

    // EventBridge Invocations
    this.dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'EventBridge Rule Invocations',
        width: 12,
        height: 6,
        left: [
          new cloudwatch.Metric({
            namespace: 'AWS/Events',
            metricName: 'Invocations',
            statistic: 'Sum',
            period: cdk.Duration.minutes(1),
          }),
          new cloudwatch.Metric({
            namespace: 'AWS/Events',
            metricName: 'FailedInvocations',
            statistic: 'Sum',
            period: cdk.Duration.minutes(1),
          }),
        ],
        leftYAxis: {
          label: 'Invocations',
        },
      }),
    );

    // ============================================
    // Health Summary
    // ============================================
    this.dashboard.addWidgets(
      new cloudwatch.TextWidget({
        markdown: '# System Health',
        width: 24,
        height: 1,
      }),
    );

    // Overall Error Rate
    this.dashboard.addWidgets(
      new cloudwatch.SingleValueWidget({
        title: 'Total API Errors (Last Hour)',
        metrics: [
          new cloudwatch.Metric({
            namespace: 'AWS/AppSync',
            metricName: 'Errors',
            statistic: 'Sum',
            period: cdk.Duration.hours(1),
          }),
        ],
        width: 6,
        height: 4,
      }),
    );

    // P99 Latency
    this.dashboard.addWidgets(
      new cloudwatch.SingleValueWidget({
        title: 'P99 Latency (Last Hour)',
        metrics: [
          new cloudwatch.Metric({
            namespace: 'AWS/AppSync',
            metricName: 'GraphQLLatency',
            statistic: 'p99',
            period: cdk.Duration.hours(1),
          }),
        ],
        width: 6,
        height: 4,
      }),
    );

    // Lambda Error Count
    this.dashboard.addWidgets(
      new cloudwatch.SingleValueWidget({
        title: 'Lambda Errors (Last Hour)',
        metrics: [
          new cloudwatch.Metric({
            namespace: 'AWS/Lambda',
            metricName: 'Errors',
            statistic: 'Sum',
            period: cdk.Duration.hours(1),
          }),
        ],
        width: 6,
        height: 4,
      }),
    );

    // DynamoDB Throttles
    this.dashboard.addWidgets(
      new cloudwatch.SingleValueWidget({
        title: 'DynamoDB User Errors (Last Hour)',
        metrics: [
          new cloudwatch.Metric({
            namespace: 'AWS/DynamoDB',
            metricName: 'UserErrors',
            statistic: 'Sum',
            period: cdk.Duration.hours(1),
          }),
        ],
        width: 6,
        height: 4,
      }),
    );

    // ============================================
    // CloudWatch Alarms
    // ============================================
    this.createAlarms();

    // ============================================
    // Outputs
    // ============================================
    new cdk.CfnOutput(this, 'DashboardUrl', {
      value: `https://${this.config.region}.console.aws.amazon.com/cloudwatch/home?region=${this.config.region}#dashboards:name=${appName}-main-${env}`,
      description: 'CloudWatch Dashboard URL',
    });

    new cdk.CfnOutput(this, 'AlarmTopicArn', {
      value: this.alarmTopic.topicArn,
      description: 'SNS Topic for monitoring alarms',
    });
  }

  // ============================================
  // Create Alarms
  // ============================================

  private createAlarms() {
    const env = this.config.env;
    const snsAction = new actions.SnsAction(this.alarmTopic);

    const appsyncErrors = new cloudwatch.Alarm(this, 'AppSyncErrorsAlarm', {
      metric: new cloudwatch.Metric({
        namespace: 'AWS/AppSync',
        metricName: 'Errors',
        statistic: 'Sum',
        period: cdk.Duration.minutes(5),
      }),
      threshold: 50,
      evaluationPeriods: 2,
      alarmName: `${env}-appsync-errors-high`,
      alarmDescription: 'AppSync errors exceed threshold',
    });
    appsyncErrors.addAlarmAction(snsAction);

    const appsyncLatency = new cloudwatch.Alarm(this, 'AppSyncLatencyAlarm', {
      metric: new cloudwatch.Metric({
        namespace: 'AWS/AppSync',
        metricName: 'GraphQLLatency',
        statistic: 'p99',
        period: cdk.Duration.minutes(5),
      }),
      threshold: 1000,
      evaluationPeriods: 2,
      alarmName: `${env}-appsync-latency-high`,
      alarmDescription: 'AppSync p99 latency exceeds 1 second',
    });
    appsyncLatency.addAlarmAction(snsAction);

    const lambdaErrors = new cloudwatch.Alarm(this, 'LambdaErrorsAlarm', {
      metric: new cloudwatch.Metric({
        namespace: 'AWS/Lambda',
        metricName: 'Errors',
        statistic: 'Sum',
        period: cdk.Duration.minutes(5),
      }),
      threshold: 10,
      evaluationPeriods: 1,
      alarmName: `${env}-lambda-errors-high`,
      alarmDescription: 'Lambda errors exceed threshold',
    });
    lambdaErrors.addAlarmAction(snsAction);

    const dynamoThrottles = new cloudwatch.Alarm(this, 'DynamoDBThrottlesAlarm', {
      metric: new cloudwatch.Metric({
        namespace: 'AWS/DynamoDB',
        metricName: 'UserErrors',
        statistic: 'Sum',
        period: cdk.Duration.minutes(5),
      }),
      threshold: 5,
      evaluationPeriods: 1,
      alarmName: `${env}-dynamodb-throttles`,
      alarmDescription: 'DynamoDB user errors (throttles) detected',
    });
    dynamoThrottles.addAlarmAction(snsAction);

    const sfnFailures = new cloudwatch.Alarm(this, 'StepFunctionFailureAlarm', {
      metric: new cloudwatch.Metric({
        namespace: 'AWS/States',
        metricName: 'ExecutionsFailed',
        statistic: 'Sum',
        period: cdk.Duration.minutes(5),
      }),
      threshold: 5,
      evaluationPeriods: 1,
      alarmName: `${env}-stepfunctions-failures`,
      alarmDescription: 'Step Function executions failing',
    });
    sfnFailures.addAlarmAction(snsAction);
  }
}
