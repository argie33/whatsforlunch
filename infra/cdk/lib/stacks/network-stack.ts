import * as cdk from "aws-cdk-lib";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as s3 from "aws-cdk-lib/aws-s3";
import { BaseStack, BaseStackProps } from "./base-stack";

export class NetworkStack extends BaseStack {
  public readonly distribution: cloudfront.Distribution;
  public readonly assetsBucket: s3.Bucket;

  constructor(scope: cdk.App, id: string, props: BaseStackProps) {
    super(scope, id, props);

    const env = this.config.env;
    const appName = "wfl";

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
    // CloudFront distribution
    // ============================================
    this.distribution = new cloudfront.Distribution(this, "ApiDistribution", {
      defaultBehavior: {
        origin: new origins.S3Origin(this.assetsBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.HTTPS_ONLY,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        compress: true,
      },
      domainNames: [`${this.config.apiSubdomain}.${this.config.domainName}`],
      certificate: undefined, // Phase B: will add ACM cert when domain is set up
      comment: `WhatsForLunch API distribution (${env})`,
      enableIpv6: true,
      httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
      minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
    });

    new cdk.CfnOutput(this, "DistributionDomainName", {
      value: this.distribution.domainName,
      description: "CloudFront distribution domain name",
    });

    new cdk.CfnOutput(this, "DistributionId", {
      value: this.distribution.distributionId,
      description: "CloudFront distribution ID",
    });

    new cdk.CfnOutput(this, "AssetsBucketName", {
      value: this.assetsBucket.bucketName,
      description: "S3 bucket for CloudFront assets",
    });
  }
}
