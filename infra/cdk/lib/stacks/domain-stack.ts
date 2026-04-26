import * as cdk from "aws-cdk-lib";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import { BaseStack, BaseStackProps } from "./base-stack";

export class DomainStack extends BaseStack {
  public readonly hostedZone: route53.HostedZone | null = null;
  public readonly apiCertificate: acm.Certificate | null = null;

  constructor(scope: cdk.App, id: string, props: BaseStackProps) {
    super(scope, id, props);

    const domainName = this.config.domainName;
    const apiSubdomain = this.config.apiSubdomain;
    const apiDomain = `${apiSubdomain}.${domainName}`;

    // Phase A: Placeholder for Route53 hosted zone
    // In practice, the hosted zone is usually created manually or imported
    // Phase B will create the hosted zone and certificate

    // Create Route53 hosted zone
    try {
      this.hostedZone = route53.HostedZone.fromLookup(this, "HostedZone", {
        domainName: domainName,
      });

      new cdk.CfnOutput(this, "HostedZoneId", {
        value: this.hostedZone.hostedZoneId,
        description: "Route53 hosted zone ID",
        exportName: `${domainName}-hosted-zone-id`,
      });
    } catch (e) {
      console.warn(
        `Hosted zone for ${domainName} not found. Create it manually or via:
        aws route53 create-hosted-zone --name ${domainName} --caller-reference $(date +%s)`
      );
    }

    // Create ACM certificate for API domain with DNS validation
    this.apiCertificate = new acm.Certificate(this, "ApiCertificate", {
      domainName: apiDomain,
      validation: acm.CertificateValidation.fromDns(this.hostedZone),
    });

    new cdk.CfnOutput(this, "ApiCertificateArn", {
      value: this.apiCertificate.certificateArn,
      description: `ACM certificate for ${apiDomain}`,
      exportName: `${apiDomain}-certificate-arn`,
    });

    // Create wildcard certificate for all subdomains
    const wildCardCertificate = new acm.Certificate(this, "WildCardCertificate", {
      domainName: `*.${domainName}`,
      subjectAlternativeNames: [domainName],
      validation: acm.CertificateValidation.fromDns(this.hostedZone),
    });

    new cdk.CfnOutput(this, "WildCardCertificateArn", {
      value: wildCardCertificate.certificateArn,
      description: `ACM wildcard certificate for *.${domainName}`,
      exportName: `wildcard-${domainName}-certificate-arn`,
    });
  }
}
