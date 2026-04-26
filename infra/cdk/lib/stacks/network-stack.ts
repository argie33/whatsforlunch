import * as cdk from "aws-cdk-lib";
import { BaseStack, BaseStackProps } from "./base-stack";

export class NetworkStack extends BaseStack {
  public readonly cloudFrontUrl: string;
  public readonly hostedZoneId: string;

  constructor(scope: cdk.App, id: string, props: BaseStackProps) {
    super(scope, id, props);

    // Phase A: CloudFront, WAF, ACM cert, Route53 placeholders
    // Phase B will implement actual CloudFront + WAF configuration

    this.cloudFrontUrl = "https://placeholder.cloudfront.net";
    this.hostedZoneId = "Z-PLACEHOLDER";

    new cdk.CfnOutput(this, "CloudFrontUrl", {
      value: this.cloudFrontUrl,
      description: "CloudFront distribution URL",
    });

    new cdk.CfnOutput(this, "HostedZoneId", {
      value: this.hostedZoneId,
      description: "Route53 hosted zone ID",
    });
  }
}
