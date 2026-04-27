import * as cdk from "aws-cdk-lib";
import * as sns from "aws-cdk-lib/aws-sns";
import * as events from "aws-cdk-lib/aws-events";
import * as targets from "aws-cdk-lib/aws-events-targets";
import * as iam from "aws-cdk-lib/aws-iam";
import { BaseStack, BaseStackProps } from "./base-stack";
import { DataStack } from "./data-stack";

export interface NotificationsStackProps extends BaseStackProps {
  dataStack: DataStack;
}

export class NotificationsStack extends BaseStack {
  public readonly pushTopic: sns.Topic;
  public readonly eventBus: events.EventBus;

  constructor(scope: cdk.App, id: string, props: NotificationsStackProps) {
    super(scope, id, props);

    const env = this.config.env;
    const appName = "wfl";

    // ============================================
    // SNS Mobile Push Topic
    // ============================================
    this.pushTopic = new sns.Topic(this, "MobilePushTopic", {
      topicName: `${appName}-mobile-push-${env}`,
      displayName: "Mobile push notifications",
    });

    // ============================================
    // Platform applications (APNs, FCM)
    // Placeholder - will be configured manually with certs in Phase B
    // ============================================

    // ============================================
    // EventBridge for expiring item notifications
    // ============================================
    this.eventBus = new events.EventBus(this, "NotificationEventBus", {
      eventBusName: `${appName}-notifications-${env}`,
    });

    // Rule for daily expiration check (runs at 09:00 UTC)
    const expirationRule = new events.Rule(this, "ExpirationCheckRule", {
      eventBus: this.eventBus,
      schedule: events.Schedule.cron({
        minute: "0",
        hour: "9",
      }),
      description: "Daily check for expiring food items",
    });

    // Placeholder target - Phase B will add Lambda
    expirationRule.addTarget(
      new targets.SnsTopic(this.pushTopic, {
        message: events.RuleTargetInput.fromText("Daily expiration check"),
      })
    );

    // ============================================
    // EventBridge rule for item status changes
    // ============================================
    const statusChangeRule = new events.Rule(this, "ItemStatusChangeRule", {
      eventBus: this.eventBus,
      eventPattern: {
        source: ["wfl.items"],
        detailType: ["Item Status Changed"],
      },
      description: "Notify on item status changes",
    });

    statusChangeRule.addTarget(
      new targets.SnsTopic(this.pushTopic, {
        message: events.RuleTargetInput.fromEventPath("$.detail"),
      })
    );

    new cdk.CfnOutput(this, "PushTopicArn", {
      value: this.pushTopic.topicArn,
      description: "SNS topic for mobile push notifications",
    });

    new cdk.CfnOutput(this, "EventBusArn", {
      value: this.eventBus.eventBusArn,
      description: "EventBridge event bus for notifications",
    });
  }
}
