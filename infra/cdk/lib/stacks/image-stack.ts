import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as lambda from 'aws-cdk-lib/aws-lambda-nodejs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import { BaseStack, BaseStackProps } from './base-stack';

export class ImageStack extends BaseStack {
  public readonly imageBucket: s3.Bucket;
  public readonly cacheDistribution: cloudfront.Distribution;
  public readonly resizeFunction: lambda.NodejsFunction;
  public readonly distributionDomainName: string;

  constructor(scope: cdk.App, id: string, props: BaseStackProps) {
    super(scope, id, props);

    const env = this.config.env;
    const appName = 'wfl';

    // ============================================
    // S3 Bucket for Image Storage
    // ============================================
    this.imageBucket = new s3.Bucket(this, 'ImageBucket', {
      bucketName: `${appName}-images-${env}-${this.account}`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      versioned: false,
      lifecycleRules: [
        {
          id: 'DeleteOldVersions',
          noncurrentVersionExpiration: cdk.Duration.days(7),
        },
        {
          id: 'TransitionToIA',
          transitions: [
            {
              storageClass: s3.StorageClass.INTELLIGENT_TIERING,
              transitionAfter: cdk.Duration.days(30),
            },
          ],
        },
      ],
      removalPolicy:
        env === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    // ============================================
    // Lambda Function for Image Resizing
    // ============================================
    this.resizeFunction = new lambda.NodejsFunction(this, 'ImageResizeFunction', {
      functionName: `${appName}-image-resize-${env}`,
      entry: '../lambdas/image-resize/handler.ts',
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_20_X,
      memorySize: 3008, // 3GB for image processing
      timeout: cdk.Duration.seconds(60),
      environment: {
        IMAGE_BUCKET: this.imageBucket.bucketName,
        CACHE_TTL: '31536000', // 1 year
      },
      logRetention: env === 'prod' ? logs.RetentionDays.ONE_MONTH : logs.RetentionDays.ONE_WEEK,
    });

    // Grant Lambda permissions to read/write S3
    this.imageBucket.grantRead(this.resizeFunction);
    this.imageBucket.grantPut(this.resizeFunction);

    // ============================================
    // CloudFront Origin Access Identity
    // ============================================
    const oai = new cloudfront.OriginAccessIdentity(this, 'ImageBucketOAI', {
      comment: `OAI for ${appName} image bucket (${env})`,
    });
    this.imageBucket.grantRead(oai);

    // ============================================
    // CloudFront Distribution
    // ============================================
    this.cacheDistribution = new cloudfront.Distribution(this, 'ImageDistribution', {
      defaultBehavior: {
        origin: new origins.S3Origin(this.imageBucket, {
          originAccessIdentity: oai,
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: new cloudfront.CachePolicy(this, 'ImageCachePolicy', {
          cachePolicyName: `${appName}-image-cache-${env}`,
          comment: 'Cache policy for images with query string parameters',
          defaultTtl: cdk.Duration.days(30),
          maxTtl: cdk.Duration.days(365),
          minTtl: cdk.Duration.seconds(1),
          enableAcceptEncodingGzip: true,
          enableAcceptEncodingBrotli: true,
          queryStringBehavior: cloudfront.QueryStringCacheBehavior.all(),
        }),
        compress: true,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
        cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD,
      },
      additionalBehaviors: {
        '/resize/*': {
          origin: new origins.S3Origin(this.imageBucket, {
            originAccessIdentity: oai,
          }),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.cacheDisabled(),
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          compress: true,
        },
      },
      enableIpv6: true,
      httpVersion: cloudfront.HttpVersion.HTTP2AND3,
      minTtl: cdk.Duration.seconds(0),
      defaultTtl: cdk.Duration.days(1),
      maxTtl: cdk.Duration.days(365),
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100, // US/Europe only for cost optimization
      geoRestriction: cloudfront.GeoRestriction.allowlist('US', 'CA', 'GB', 'IE', 'DE', 'FR', 'IT', 'ES', 'AU', 'NZ'),
    });

    this.distributionDomainName = this.cacheDistribution.distributionDomainName;

    // ============================================
    // CloudWatch Metrics
    // ============================================
    const bytesDownloadedMetric = new cloudwatch.Metric({
      namespace: 'AWS/CloudFront',
      metricName: 'BytesDownloaded',
      dimensions: {
        DistributionId: this.cacheDistribution.distributionId,
      },
      statistic: 'Sum',
      period: cdk.Duration.hours(1),
    });

    const cacheHitRateMetric = new cloudwatch.Metric({
      namespace: 'AWS/CloudFront',
      metricName: 'CacheHitRate',
      dimensions: {
        DistributionId: this.cacheDistribution.distributionId,
      },
      statistic: 'Average',
      period: cdk.Duration.hours(1),
    });

    // ============================================
    // CloudWatch Alarms
    // ============================================
    new cloudwatch.Alarm(this, 'LowCacheHitRateAlarm', {
      alarmName: `${appName}-low-cache-hit-rate-${env}`,
      metric: cacheHitRateMetric,
      threshold: 70,
      evaluationPeriods: 2,
      comparisonOperator: cloudwatch.ComparisonOperator.LESS_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      alarmDescription: 'Alert when CDN cache hit rate drops below 70%',
    });

    new cloudwatch.Alarm(this, 'HighDataTransferAlarm', {
      alarmName: `${appName}-high-data-transfer-${env}`,
      metric: bytesDownloadedMetric,
      threshold: 1099511627776, // 1TB
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      alarmDescription: 'Alert on unusually high data transfer',
    });

    // ============================================
    // CloudWatch Dashboard
    // ============================================
    new cloudwatch.Dashboard(this, 'ImageOptimizationDashboard', {
      dashboardName: `${appName}-image-optimization-${env}`,
      widgets: [
        [
          new cloudwatch.GraphWidget({
            title: 'Cache Hit Rate (%)',
            left: [cacheHitRateMetric],
            width: 8,
          }),
          new cloudwatch.GraphWidget({
            title: 'Data Downloaded (GB/day)',
            left: [bytesDownloadedMetric.with({ statistic: 'Sum' })],
            width: 8,
          }),
          new cloudwatch.GraphWidget({
            title: 'Requests',
            left: [
              new cloudwatch.Metric({
                namespace: 'AWS/CloudFront',
                metricName: 'Requests',
                dimensions: {
                  DistributionId: this.cacheDistribution.distributionId,
                },
                statistic: 'Sum',
                period: cdk.Duration.hours(1),
              }),
            ],
            width: 8,
          }),
        ],
      ],
    });

    // ============================================
    // Outputs
    // ============================================
    new cdk.CfnOutput(this, 'ImageBucketName', {
      value: this.imageBucket.bucketName,
      description: 'S3 bucket for image storage',
      exportName: `${appName}-image-bucket-${env}`,
    });

    new cdk.CfnOutput(this, 'CloudFrontDistributionId', {
      value: this.cacheDistribution.distributionId,
      description: 'CloudFront distribution ID',
      exportName: `${appName}-cf-distribution-${env}`,
    });

    new cdk.CfnOutput(this, 'CloudFrontDomainName', {
      value: this.distributionDomainName,
      description: 'CloudFront domain for image serving',
      exportName: `${appName}-cf-domain-${env}`,
    });

    new cdk.CfnOutput(this, 'ResizeFunctionArn', {
      value: this.resizeFunction.functionArn,
      description: 'ARN of image resize Lambda function',
      exportName: `${appName}-resize-function-${env}`,
    });
  }
}
