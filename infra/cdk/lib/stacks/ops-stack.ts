import * as cdk from "aws-cdk-lib";
import * as cloudwatch from "aws-cdk-lib/aws-cloudwatch";
import * as sns from "aws-cdk-lib/aws-sns";
import { BaseStack, BaseStackProps } from "./base-stack";

export class OpsStack extends BaseStack {
  public readonly alertTopic: sns.Topic;
  public readonly dashboard: cloudwatch.Dashboard;

  constructor(scope: cdk.App, id: string, props: BaseStackProps) {
    super(scope, id, props);

    const env = this.config.env;
    const appName = "wfl";

    // ============================================
    // SNS topic for alarms
    // ============================================
    this.alertTopic = new sns.Topic(this, "AlertTopic", {
      topicName: `${appName}-alerts-${env}`,
      displayName: "WhatsForLunch alerts",
    });

    // ============================================
    // CloudWatch dashboard
    // ============================================
    this.dashboard = new cloudwatch.Dashboard(this, "OperationsDashboard", {
      dashboardName: `${appName}-ops-${env}`,
    });

    this.dashboard.addWidgets(
      new cloudwatch.TextWidget({
        markdown: `# WhatsForLunch Operations Dashboard (${env})`,
        width: 24,
        height: 1,
      })
    );

    // Lambda metrics
    this.dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: "Lambda Invocations",
        left: [
          new cloudwatch.Metric({
            namespace: "AWS/Lambda",
            metricName: "Invocations",
            statistic: "Sum",
            period: cdk.Duration.minutes(5),
          }),
        ],
        width: 12,
        height: 6,
      }),
      new cloudwatch.GraphWidget({
        title: "Lambda Errors",
        left: [
          new cloudwatch.Metric({
            namespace: "AWS/Lambda",
            metricName: "Errors",
            statistic: "Sum",
            period: cdk.Duration.minutes(5),
          }),
        ],
        width: 12,
        height: 6,
      })
    );

    // DynamoDB metrics
    this.dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: "DynamoDB Consumed Capacity",
        left: [
          new cloudwatch.Metric({
            namespace: "AWS/DynamoDB",
            metricName: "ConsumedWriteCapacityUnits",
            statistic: "Sum",
            period: cdk.Duration.minutes(1),
          }),
          new cloudwatch.Metric({
            namespace: "AWS/DynamoDB",
            metricName: "ConsumedReadCapacityUnits",
            statistic: "Sum",
            period: cdk.Duration.minutes(1),
          }),
        ],
        width: 12,
        height: 6,
      }),
      new cloudwatch.GraphWidget({
        title: "DynamoDB UserErrors",
        left: [
          new cloudwatch.Metric({
            namespace: "AWS/DynamoDB",
            metricName: "UserErrors",
            statistic: "Sum",
            period: cdk.Duration.minutes(5),
          }),
        ],
        width: 12,
        height: 6,
      })
    );

    // ============================================
    // CloudWatch alarms
    // ============================================
    new cloudwatch.Alarm(this, "LambdaErrorsAlarm", {
      metric: new cloudwatch.Metric({
        namespace: "AWS/Lambda",
        metricName: "Errors",
        statistic: "Sum",
        period: cdk.Duration.minutes(5),
      }),
      threshold: 5,
      evaluationPeriods: 1,
      alarmDescription: "Alert when Lambda errors exceed threshold",
      alarmName: `${appName}-lambda-errors-${env}`,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    new cloudwatch.Alarm(this, "DynamoDBThrottlingAlarm", {
      metric: new cloudwatch.Metric({
        namespace: "AWS/DynamoDB",
        metricName: "UserErrors",
        statistic: "Sum",
        period: cdk.Duration.minutes(1),
      }),
      threshold: 1,
      evaluationPeriods: 1,
      alarmDescription: "Alert on DynamoDB throttling",
      alarmName: `${appName}-dynamodb-errors-${env}`,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    new cdk.CfnOutput(this, "AlertTopicArn", {
      value: this.alertTopic.topicArn,
      description: "SNS topic for alerts",
    });

    new cdk.CfnOutput(this, "DashboardUrl", {
      value: `https://console.aws.amazon.com/cloudwatch/home?region=${this.config.region}#dashboards:name=${appName}-ops-${env}`,
      description: "CloudWatch dashboard URL",
    });
  }
}
