import * as cdk from "aws-cdk-lib";
import * as sns from "aws-cdk-lib/aws-sns";
import { BaseStack, BaseStackProps } from "./base-stack";
import { DataStack } from "./data-stack";

export interface NotificationsStackProps extends BaseStackProps {
  dataStack: DataStack;
}

export class NotificationsStack extends BaseStack {
  public readonly pushTopic: sns.Topic | null = null;

  constructor(scope: cdk.App, id: string, props: NotificationsStackProps) {
    super(scope, id, props);

    // Phase A: SNS topic placeholder
    // Phase B will implement:
    // - SNS Mobile Push platform apps (APNs for iOS, FCM for Android)
    // - EventBridge rules for expiring notifications
    // - Lambda: notify-expiring (EventBridge cron)

    new cdk.CfnOutput(this, "NotificationTopicArn", {
      value: "arn:aws:sns:placeholder",
      description: "SNS topic for mobile push notifications",
    });
  }
}
