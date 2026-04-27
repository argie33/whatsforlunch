import * as cdk from "aws-cdk-lib";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as route53_targets from "aws-cdk-lib/aws-route53-targets";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import { BaseStack, BaseStackProps } from "./base-stack";

export class NetworkStack extends BaseStack {
  public readonly distribution: cloudfront.Distribution;
  public readonly assetsBucket: s3.Bucket;
  public readonly certificate?: acm.ICertificate;
  public readonly hostedZone?: route53.IHostedZone;

  constructor(scope: cdk.App, id: string, props: BaseStackProps) {
    super(scope, id, props);

    const env = this.config.env;
    const appName = "wfl";
    const domainName = this.config.domainName;
    const apiSubdomain = this.config.apiSubdomain;
    const apiDomain = `${apiSubdomain}.${domainName}`;

    // ============================================
    // Route53 Hosted Zone (assumes zone exists)
    // ============================================
    // In production, the hosted zone should be created in DomainStack
    // For local dev, this is skipped (no public domain)
    let hostedZone: route53.IHostedZone | null = null;

    if (env === "prod" || env === "staging") {
      try {
        hostedZone = route53.HostedZone.fromLookup(this, "HostedZone", {
          domainName: domainName,
        });
      } catch (error) {
        console.warn(`Could not find hosted zone for ${domainName}. DNS records will not be created.`);
      }
    }

    // ============================================
    // ACM Certificate for HTTPS
    // ============================================
    let certificate: acm.ICertificate | undefined;

    if (hostedZone && (env === "prod" || env === "staging")) {
      // Create certificate with DNS validation
      certificate = new acm.Certificate(this, "ApiCertificate", {
        domainName: apiDomain,
        validation: acm.CertificateValidation.fromDns(hostedZone),
      });
    } else {
      // For dev environment, use self-signed or skip
      // Phase B: Add self-signed cert generation for dev if needed
      // For now, CloudFront will use its default cert
      console.log(`[${env}] Skipping ACM certificate creation. Using CloudFront default.`);
    }

    // ============================================
    // S3 bucket for CloudFront assets
    // ============================================
    this.assetsBucket = new s3.Bucket(this, "CloudFrontAssetsBucket", {
      bucketName: `${appName}-assets-cdn-${env}`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      versioned: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      lifecycleRules: [
        {
          transitions: [
            {
              storageClass: s3.StorageClass.GLACIER,
              transitionAfter: cdk.Duration.days(90),
            },
          ],
        },
      ],
    });

    // ============================================
    // CloudFront distribution for assets
    // ============================================
    const domainNames = hostedZone ? [apiDomain] : [];

    this.distribution = new cloudfront.Distribution(this, "AssetDistribution", {
      defaultBehavior: {
        origin: new origins.S3Origin(this.assetsBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.HTTPS_ONLY,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        compress: true,
      },
      ...(domainNames.length > 0 && certificate && {
        domainNames,
        certificate,
      }),
      comment: `WhatsForLunch Assets (${env})`,
      enableIpv6: true,
      httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
      minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
    });

    // ============================================
    // Route53 DNS Records (if hosted zone exists)
    // ============================================
    if (hostedZone) {
      // API domain → CloudFront distribution
      new route53.ARecord(this, "ApiAliasRecord", {
        zone: hostedZone,
        recordName: apiDomain,
        target: route53.RecordTarget.fromAlias(
          new route53_targets.CloudFrontTarget(this.distribution)
        ),
      });

      // IPv6 alias record
      new route53.AaaaRecord(this, "ApiAliasRecordIpv6", {
        zone: hostedZone,
        recordName: apiDomain,
        target: route53.RecordTarget.fromAlias(
          new route53_targets.CloudFrontTarget(this.distribution)
        ),
      });

      console.log(`[${env}] DNS records created: ${apiDomain} → CloudFront distribution`);
    }

    this.hostedZone = hostedZone as route53.IHostedZone;

    // ============================================
    // Outputs
    // ============================================
    new cdk.CfnOutput(this, "DistributionDomainName", {
      value: this.distribution.domainName,
      description: "CloudFront distribution domain name",
      exportName: `${appName}-CFDistribution-${env}`,
    });

    new cdk.CfnOutput(this, "DistributionId", {
      value: this.distribution.distributionId,
      description: "CloudFront distribution ID",
      exportName: `${appName}-CFDistributionId-${env}`,
    });

    new cdk.CfnOutput(this, "AssetsBucketName", {
      value: this.assetsBucket.bucketName,
      description: "S3 bucket for CloudFront assets",
      exportName: `${appName}-AssetsBucket-${env}`,
    });

    if (hostedZone) {
      new cdk.CfnOutput(this, "ApiDomain", {
        value: apiDomain,
        description: "API domain name",
        exportName: `${appName}-ApiDomain-${env}`,
      });
    }

    if (certificate) {
      new cdk.CfnOutput(this, "CertificateArn", {
        value: certificate.certificateArn,
        description: "ACM certificate ARN",
        exportName: `${appName}-CertificateArn-${env}`,
      });
    }
  }
}
