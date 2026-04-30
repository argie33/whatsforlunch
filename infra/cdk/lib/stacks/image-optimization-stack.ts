import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import { BaseStack, BaseStackProps } from './base-stack';

export class ImageOptimizationStack extends BaseStack {
  public readonly imagesBucket: s3.Bucket;
  public readonly imageProcessorRole: iam.Role;

  constructor(scope: cdk.App, id: string, props: BaseStackProps) {
    super(scope, id, props);

    const env = this.config.env;
    const appName = 'wfl';

    this.imagesBucket = new s3.Bucket(this, 'ImagesBucket', {
      bucketName: `${appName}-images-${env}-${cdk.Aws.ACCOUNT_ID}`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      versioned: false,
      removalPolicy: env === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      lifecycleRules: [
        {
          id: 'delete-temp-processed-images',
          prefix: 'processed/',
          expiration: cdk.Duration.days(90),
        },
        {
          id: 'archive-originals',
          prefix: 'originals/',
          transitions: [
            {
              storageClass: s3.StorageClass.GLACIER,
              transitionAfter: cdk.Duration.days(180),
            },
          ],
        },
      ],
    });

    this.imageProcessorRole = new iam.Role(this, 'ImageProcessorRole', {
      roleName: `${appName}-image-processor-${env}`,
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      description: 'Role for Lambda functions processing images',
    });

    this.imageProcessorRole.addToPrincipalPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['s3:GetObject', 's3:PutObject', 's3:DeleteObject'],
        resources: [
          this.imagesBucket.arnForObjects('originals/*'),
          this.imagesBucket.arnForObjects('processed/*'),
        ],
      }),
    );

    this.imageProcessorRole.addToPrincipalPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents'],
        resources: ['arn:aws:logs:*:*:*'],
      }),
    );

    new logs.LogGroup(this, 'ImageProcessorLogs', {
      logGroupName: `/aws/lambda/${appName}-image-processor-${env}`,
      retention: env === 'prod' ? logs.RetentionDays.TWO_WEEKS : logs.RetentionDays.THREE_DAYS,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const imageProcessingTimeMetric = new cloudwatch.Metric({
      namespace: `${appName}/Images`,
      metricName: 'ProcessingTime',
      statistic: 'Average',
      period: cdk.Duration.minutes(5),
    });

    new cloudwatch.Alarm(this, 'ImageProcessingLatencyAlarm', {
      alarmName: `${appName}-image-processing-latency-${env}`,
      metric: imageProcessingTimeMetric,
      threshold: 5000,
      evaluationPeriods: 3,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    new cloudwatch.Dashboard(this, 'ImageOptimizationDashboard', {
      dashboardName: `${appName}-image-optimization-${env}`,
      widgets: [
        [
          new cloudwatch.GraphWidget({
            title: 'Image Processing Time (ms)',
            left: [imageProcessingTimeMetric],
            width: 12,
          }),
        ],
      ],
    });

    new cdk.CfnOutput(this, 'ImagesBucketName', {
      value: this.imagesBucket.bucketName,
      description: 'S3 bucket for image storage',
      exportName: `${appName}-images-bucket-${env}`,
    });
  }
}
