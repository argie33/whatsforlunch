import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import { BaseStack, BaseStackProps } from './base-stack';

export class MLRecommendationsStack extends BaseStack {
  public readonly userPreferencesTable: dynamodb.Table;
  public readonly recommendationCacheTable: dynamodb.Table;
  public readonly bedrockAccessRole: iam.Role;
  public readonly bedrockSecretArn: string;

  constructor(scope: cdk.App, id: string, props: BaseStackProps) {
    super(scope, id, props);

    const env = this.config.env;
    const appName = 'wfl';
    const region = this.config.region;

    // ============================================
    // User Preferences Table
    // ============================================
    this.userPreferencesTable = new dynamodb.Table(this, 'UserPreferencesTable', {
      tableName: `${appName}-user-preferences-${env}`,
      partitionKey: {
        name: 'userId',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      pointInTimeRecovery: true,
      removalPolicy: env === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    // ============================================
    // Recommendation Cache Table
    // ============================================
    this.recommendationCacheTable = new dynamodb.Table(this, 'RecommendationCacheTable', {
      tableName: `${appName}-recommendation-cache-${env}`,
      partitionKey: {
        name: 'householdId',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'cacheKey',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      pointInTimeRecovery: true,
      timeToLiveAttribute: 'expirationTime',
      removalPolicy: env === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    // GSI: by userId for user-specific recommendations
    this.recommendationCacheTable.addGlobalSecondaryIndex({
      indexName: 'userIdIndex',
      partitionKey: {
        name: 'userId',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'cacheKey',
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // ============================================
    // Bedrock API Key Secret
    // ============================================
    const bedrockSecret = new secretsmanager.Secret(this, 'BedrockApiSecret', {
      secretName: `${appName}/${env}/bedrock-api-key`,
      description: 'Bedrock API key for Claude 3 Sonnet',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({
          region: region,
          modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
        }),
        generateStringKey: 'apiKey',
        passwordLength: 32,
        excludePunctuation: true,
      },
    });

    this.bedrockSecretArn = bedrockSecret.secretArn;

    // ============================================
    // IAM Role for Bedrock Access
    // ============================================
    this.bedrockAccessRole = new iam.Role(this, 'BedrockAccessRole', {
      roleName: `${appName}-bedrock-access-${env}`,
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      description: 'Role for Lambda functions to access Bedrock and recommendation tables',
    });

    // Bedrock permissions
    this.bedrockAccessRole.addToPrincipalPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['bedrock:InvokeModel', 'bedrock:InvokeModelWithResponseStream'],
        resources: [
          `arn:aws:bedrock:${region}::foundation-model/anthropic.claude-3-sonnet-20240229-v1:0`,
        ],
      }),
    );

    // DynamoDB permissions
    this.bedrockAccessRole.addToPrincipalPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'dynamodb:GetItem',
          'dynamodb:PutItem',
          'dynamodb:UpdateItem',
          'dynamodb:Query',
          'dynamodb:Scan',
        ],
        resources: [
          this.userPreferencesTable.tableArn,
          this.recommendationCacheTable.tableArn,
          `${this.recommendationCacheTable.tableArn}/index/*`,
        ],
      }),
    );

    // Secrets Manager permissions
    this.bedrockAccessRole.addToPrincipalPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['secretsmanager:GetSecretValue'],
        resources: [bedrockSecret.secretArn],
      }),
    );

    // CloudWatch Logs permissions
    this.bedrockAccessRole.addToPrincipalPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents'],
        resources: ['arn:aws:logs:*:*:*'],
      }),
    );

    // ============================================
    // CloudWatch Log Groups
    // ============================================
    new logs.LogGroup(this, 'BedrockInvocationLogs', {
      logGroupName: `/aws/bedrock/${appName}-${env}`,
      retention: env === 'prod' ? logs.RetentionDays.TWO_WEEKS : logs.RetentionDays.THREE_DAYS,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // ============================================
    // CloudWatch Metrics
    // ============================================
    const bedrockInvocationMetric = new cloudwatch.Metric({
      namespace: `${appName}/ML`,
      metricName: 'BedrockInvocations',
      statistic: 'Sum',
      period: cdk.Duration.hours(1),
    });

    const recommendationLatencyMetric = new cloudwatch.Metric({
      namespace: `${appName}/ML`,
      metricName: 'RecommendationLatency',
      statistic: 'Average',
      period: cdk.Duration.minutes(5),
    });

    const cacheHitRateMetric = new cloudwatch.Metric({
      namespace: `${appName}/ML`,
      metricName: 'CacheHitRate',
      statistic: 'Average',
      period: cdk.Duration.minutes(5),
    });

    // ============================================
    // CloudWatch Alarms
    // ============================================
    new cloudwatch.Alarm(this, 'BedrockCostAlarm', {
      alarmName: `${appName}-bedrock-cost-high-${env}`,
      metric: new cloudwatch.Metric({
        namespace: `${appName}/ML`,
        metricName: 'EstimatedMonthlyBedrockCost',
        statistic: 'Maximum',
        period: cdk.Duration.days(1),
      }),
      threshold: 150, // Alert if projected to exceed $150/month
      evaluationPeriods: 2,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    new cloudwatch.Alarm(this, 'RecommendationLatencyAlarm', {
      alarmName: `${appName}-recommendation-latency-high-${env}`,
      metric: recommendationLatencyMetric,
      threshold: 3000, // Alert if latency exceeds 3 seconds
      evaluationPeriods: 2,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    // ============================================
    // CloudWatch Dashboard
    // ============================================
    new cloudwatch.Dashboard(this, 'MLDashboard', {
      dashboardName: `${appName}-ml-recommendations-${env}`,
      widgets: [
        [
          new cloudwatch.GraphWidget({
            title: 'Bedrock Invocations',
            left: [bedrockInvocationMetric],
            width: 8,
          }),
          new cloudwatch.GraphWidget({
            title: 'Recommendation Latency',
            left: [recommendationLatencyMetric],
            width: 8,
          }),
          new cloudwatch.GraphWidget({
            title: 'Cache Hit Rate %',
            left: [cacheHitRateMetric],
            width: 8,
          }),
        ],
        [
          new cloudwatch.SingleValueWidget({
            title: 'Estimated Monthly Cost',
            metrics: [
              new cloudwatch.Metric({
                namespace: `${appName}/ML`,
                metricName: 'EstimatedMonthlyBedrockCost',
                statistic: 'Maximum',
              }),
            ],
            width: 8,
          }),
          new cloudwatch.GraphWidget({
            title: 'User Preferences Updated',
            left: [
              new cloudwatch.Metric({
                namespace: `${appName}/ML`,
                metricName: 'PreferencesUpdated',
                statistic: 'Sum',
                period: cdk.Duration.hours(1),
              }),
            ],
            width: 8,
          }),
          new cloudwatch.GraphWidget({
            title: 'Recommendation Quality (Avg Rating)',
            left: [
              new cloudwatch.Metric({
                namespace: `${appName}/ML`,
                metricName: 'RecommendationRating',
                statistic: 'Average',
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
    new cdk.CfnOutput(this, 'UserPreferencesTableName', {
      value: this.userPreferencesTable.tableName,
      description: 'DynamoDB User Preferences table name',
      exportName: `${appName}-user-preferences-table-${env}`,
    });

    new cdk.CfnOutput(this, 'UserPreferencesTableArn', {
      value: this.userPreferencesTable.tableArn,
      description: 'DynamoDB User Preferences table ARN',
      exportName: `${appName}-user-preferences-table-arn-${env}`,
    });

    new cdk.CfnOutput(this, 'RecommendationCacheTableName', {
      value: this.recommendationCacheTable.tableName,
      description: 'DynamoDB Recommendation Cache table name',
      exportName: `${appName}-recommendation-cache-table-${env}`,
    });

    new cdk.CfnOutput(this, 'RecommendationCacheTableArn', {
      value: this.recommendationCacheTable.tableArn,
      description: 'DynamoDB Recommendation Cache table ARN',
      exportName: `${appName}-recommendation-cache-table-arn-${env}`,
    });

    new cdk.CfnOutput(this, 'BedrockAccessRoleArn', {
      value: this.bedrockAccessRole.roleArn,
      description: 'IAM role ARN for Bedrock access',
      exportName: `${appName}-bedrock-access-role-${env}`,
    });

    new cdk.CfnOutput(this, 'BedrockSecretArn', {
      value: bedrockSecret.secretArn,
      description: 'Secrets Manager secret ARN for Bedrock API key',
      exportName: `${appName}-bedrock-secret-arn-${env}`,
    });
  }
}
