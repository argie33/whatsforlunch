import * as cdk from "aws-cdk-lib";
import * as cloudwatch from "aws-cdk-lib/aws-cloudwatch";
import * as sns from "aws-cdk-lib/aws-sns";
import { BaseStack, BaseStackProps } from "./base-stack";

export class OpsStack extends BaseStack {
  public readonly alertTopic: sns.Topic;

  constructor(scope: cdk.App, id: string, props: BaseStackProps) {
    super(scope, id, props);

    // Phase A: Create SNS topic for CloudWatch alarms
    this.alertTopic = new sns.Topic(this, "AlertTopic", {
      topicName: `wfl-alerts-${this.config.env}`,
      displayName: "WhatsForLunch alerts",
    });

    // Phase B will implement:
    // - CloudWatch alarms for Lambdas, DynamoDB, AppSync
    // - CloudWatch dashboards
    // - Cost monitoring dashboard
    // - Production runbooks

    new cdk.CfnOutput(this, "AlertTopicArn", {
      value: this.alertTopic.topicArn,
      description: "SNS topic for alerts",
    });
  }
}
