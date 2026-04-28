import * as cdk from 'aws-cdk-lib';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import { BaseStack, BaseStackProps } from './base-stack';

export class DomainStack extends BaseStack {
  public readonly hostedZone: route53.IHostedZone | undefined;
  public readonly wildcardCertificate: acm.Certificate | undefined;

  constructor(scope: cdk.App, id: string, props: BaseStackProps) {
    super(scope, id, props);

    const domainName = this.config.domainName;
    const domainSafe = domainName.replace(/\./g, '-');

    let hostedZone: route53.IHostedZone | undefined;
    let wildcardCertificate: acm.Certificate | undefined;

    try {
      hostedZone = route53.HostedZone.fromLookup(this, 'HostedZone', {
        domainName: domainName,
      });

      new cdk.CfnOutput(this, 'HostedZoneId', {
        value: hostedZone.hostedZoneId,
        description: 'Route53 hosted zone ID',
        exportName: `${domainSafe}-hosted-zone-id`,
      });

      // ACM wildcard certificate covering apex + all subdomains
      wildcardCertificate = new acm.Certificate(this, 'WildcardCert', {
        domainName: domainName,
        subjectAlternativeNames: [`*.${domainName}`],
        validation: acm.CertificateValidation.fromDns(hostedZone),
      });

      new cdk.CfnOutput(this, 'WildcardCertArn', {
        value: wildcardCertificate.certificateArn,
        description: 'ACM wildcard certificate ARN',
        exportName: `${domainSafe}-wildcard-cert-arn`,
      });
    } catch (e) {
      console.warn(
        `Hosted zone for ${domainName} not found. Create it manually or via:
        aws route53 create-hosted-zone --name ${domainName} --caller-reference $(date +%s)`,
      );
    }

    this.hostedZone = hostedZone;
    this.wildcardCertificate = wildcardCertificate;

    new cdk.CfnOutput(this, 'DomainName', {
      value: domainName,
      description: 'Domain name for WhatsForLunch',
      exportName: `wfl-domain-${domainSafe}`,
    });
  }
}
