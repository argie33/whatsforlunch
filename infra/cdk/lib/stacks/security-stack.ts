import * as cdk from "aws-cdk-lib";
import * as guardduty from "aws-cdk-lib/aws-guardduty";
import { BaseStack, BaseStackProps } from "./base-stack";

export class SecurityStack extends BaseStack {
  constructor(scope: cdk.App, id: string, props: BaseStackProps) {
    super(scope, id, props);

    const env = this.config.env;

    // Phase A: Enable GuardDuty for threat detection
    new guardduty.CfnDetector(this, "GuardDutyDetector", {
      enable: true,
      findingPublishingFrequency: "FIFTEEN_MINUTES",
    });

    // Phase B will implement:
    // - WAF Web ACL for CloudFront (rate limiting, GraphQL introspection blocking)
    // - WAF Web ACL for AppSync (mutation rate limiting)
    // - Security Hub enabled + standards
    // - CloudTrail with S3 lock
    // - IAM Access Analyzer

    new cdk.CfnOutput(this, "GuardDutyEnabled", {
      value: "true",
      description: "GuardDuty threat detection enabled",
      exportName: `wfl-GuardDuty-${env}`,
    });
  }
}
