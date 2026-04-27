import * as cdk from "aws-cdk-lib";
import * as route53 from "aws-cdk-lib/aws-route53";
import { BaseStack, BaseStackProps } from "./base-stack";

export class DomainStack extends BaseStack {
  public readonly hostedZone: route53.IHostedZone | undefined;

  constructor(scope: cdk.App, id: string, props: BaseStackProps) {
    super(scope, id, props);

    const domainName = this.config.domainName;

    // Phase A: Look up existing Route53 hosted zone
    // Phase B will create ACM certificates and DNS records

    let hostedZone: route53.IHostedZone | undefined;

    try {
      hostedZone = route53.HostedZone.fromLookup(this, "HostedZone", {
        domainName: domainName,
      });

      const domainSafe = domainName.replace(/\./g, "-");
      new cdk.CfnOutput(this, "HostedZoneId", {
        value: hostedZone.hostedZoneId,
        description: "Route53 hosted zone ID",
        exportName: `${domainSafe}-hosted-zone-id`,
      });
    } catch (e) {
      console.warn(
        `Hosted zone for ${domainName} not found. Create it manually or via:
        aws route53 create-hosted-zone --name ${domainName} --caller-reference $(date +%s)`
      );
    }

    this.hostedZone = hostedZone;

    const domainSafe = domainName.replace(/\./g, "-");
    new cdk.CfnOutput(this, "DomainName", {
      value: domainName,
      description: "Domain name for WhatsForLunch",
      exportName: `wfl-domain-${domainSafe}`,
    });
  }
}
