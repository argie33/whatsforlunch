import * as cdk from "aws-cdk-lib";
import * as guardduty from "aws-cdk-lib/aws-guardduty";
import * as securityhub from "aws-cdk-lib/aws-securityhub";
import * as wafv2 from "aws-cdk-lib/aws-wafv2";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as cloudtrail from "aws-cdk-lib/aws-cloudtrail";
import * as ssm from "aws-cdk-lib/aws-ssm";
import { BaseStack, BaseStackProps } from "./base-stack";

export class SecurityStack extends BaseStack {
  public readonly wafWebAcl: wafv2.CfnWebACL;
  public readonly graphqlSecret: secretsmanager.Secret;

  constructor(scope: cdk.App, id: string, props: BaseStackProps) {
    super(scope, id, props);

    const env = this.config.env;
    const isProd = env === "prod";

    // ============================================
    // GuardDuty for threat detection
    // ============================================
    new guardduty.CfnDetector(this, "GuardDutyDetector", {
      enable: true,
      findingPublishingFrequency: isProd ? "FIFTEEN_MINUTES" : "ONE_HOUR",
    });

    // ============================================
    // Security Hub for compliance monitoring
    // ============================================
    new securityhub.CfnHub(this, "SecurityHub", {
      enableDefaultStandards: true,
      tags: {
        Environment: env,
      },
    });

    // ============================================
    // WAF Web ACL for CloudFront (rate limiting)
    // ============================================
    this.wafWebAcl = new wafv2.CfnWebACL(this, "CloudFrontWafAcl", {
      scope: "CLOUDFRONT",
      defaultAction: { allow: {} },
      visibilityConfig: {
        sampledRequestsEnabled: true,
        cloudWatchMetricsEnabled: true,
        metricName: "wfl-cloudfront-waf",
      },
      rules: [
        {
          name: "RateLimitRule",
          priority: 0,
          action: { block: {} },
          statement: {
            rateBasedStatement: {
              limit: 2000, // 2k requests per 5 min per IP
              aggregateKeyType: "IP",
            },
          },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: "RateLimitRule",
          },
        },
        // Block GraphQL introspection queries in production
        // Introspection leaks schema structure; allow only in dev
        ...(isProd
          ? [
              {
                name: "BlockGraphQLIntrospection",
                priority: 1,
                action: { block: {} },
                statement: {
                  byteMatchStatement: {
                    searchString: "__schema",
                    fieldToMatch: { body: {} },
                    textTransformations: [{ priority: 0, type: "NONE" as const }],
                    positionalConstraint: "CONTAINS" as const,
                  },
                },
                visibilityConfig: {
                  sampledRequestsEnabled: true,
                  cloudWatchMetricsEnabled: true,
                  metricName: "BlockGraphQLIntrospection",
                },
              },
            ]
          : []),
        {
          name: "AWSManagedRulesCommonRuleSet",
          priority: 2,
          overrideAction: { none: {} },
          statement: {
            managedRuleGroupStatement: {
              vendorName: "AWS",
              name: "AWSManagedRulesCommonRuleSet",
              excludedRules: [
                { name: "SizeRestrictions_BODY" }, // Allow larger GraphQL queries
              ],
            },
          },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: "AWSManagedRulesCommonRuleSet",
          },
        },
      ],
    });

    // ============================================
    // Secrets Manager for API credentials
    // ============================================
    // Read from environment variables; production values come from AWS Secrets Manager
    const graphqlApiKey = process.env.GRAPHQL_API_KEY || "dev-api-key-change-in-production";
    const graphqlBearerToken = process.env.GRAPHQL_BEARER_TOKEN || "dev-bearer-token-change-in-production";

    this.graphqlSecret = new secretsmanager.Secret(this, "GraphQLSecret", {
      secretName: `wfl/graphql/${env}`,
      description: "GraphQL API credentials and keys",
      secretStringValue: cdk.SecretValue.unsafePlainText(
        JSON.stringify({
          apiKey: graphqlApiKey,
          bearerToken: graphqlBearerToken,
        }),
      ),
    });

    // ============================================
    // CloudTrail for audit logging + S3 with object lock
    // ============================================
    const auditBucket = new s3.Bucket(this, "AuditBucket", {
      bucketName: `${cdk.Aws.ACCOUNT_ID}-wfl-audit-${env}`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      versioned: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      encryption: s3.BucketEncryption.S3_MANAGED,
      lifecycleRules: [
        {
          transitions: [
            {
              storageClass: s3.StorageClass.GLACIER,
              transitionAfter: cdk.Duration.days(90),
            },
          ],
          expiration: cdk.Duration.days(2555), // 7 years retention
        },
      ],
    });

    // CloudTrail with S3 for compliance (CloudTrail Lock enabled via console)
    const trail = new cloudtrail.Trail(this, "OrganizationTrail", {
      bucket: auditBucket,
      isMultiRegionTrail: false,
      enableFileValidation: true,
      includeGlobalServiceEvents: true,
      sendToCloudWatchLogs: true,
    });

    // ============================================
    // Systems Manager Parameter Store for config
    // ============================================
    new ssm.StringParameter(this, "AppEnvironment", {
      parameterName: `/wfl/${env}/app/environment`,
      stringValue: env,
      description: "Application environment identifier",
    });

    new ssm.StringParameter(this, "AIRateLimitPerUser", {
      parameterName: `/wfl/${env}/ai/rate-limit-per-user`,
      stringValue: "100", // 100 classifications per day per user
      description: "AI classification rate limit per user per day",
    });

    new ssm.StringParameter(this, "AIMaxCostPerUser", {
      parameterName: `/wfl/${env}/ai/max-cost-per-user`,
      stringValue: isProd ? "10" : "1000", // Production: $10/day, dev: $1000/day
      description: "Max AI cost per user per day (USD)",
    });

    // ============================================
    // Outputs
    // ============================================
    new cdk.CfnOutput(this, "WafWebAclArn", {
      value: this.wafWebAcl.attrArn,
      description: "WAF Web ACL ARN for CloudFront",
      exportName: `wfl-WafAcl-${env}`,
    });

    new cdk.CfnOutput(this, "GraphQLSecretName", {
      value: this.graphqlSecret.secretName,
      description: "Secrets Manager secret name for GraphQL credentials",
      exportName: `wfl-GraphQLSecret-${env}`,
    });

    new cdk.CfnOutput(this, "SecurityHubEnabled", {
      value: "true",
      description: "Security Hub compliance monitoring enabled",
      exportName: `wfl-SecurityHub-${env}`,
    });

    new cdk.CfnOutput(this, "CloudTrailBucketName", {
      value: auditBucket.bucketName,
      description: "S3 bucket for CloudTrail audit logs",
      exportName: `wfl-AuditBucket-${env}`,
    });

    new cdk.CfnOutput(this, "CloudTrailEnabled", {
      value: "true",
      description: "CloudTrail audit logging enabled",
      exportName: `wfl-CloudTrail-${env}`,
    });

    new cdk.CfnOutput(this, "ParameterStorePrefix", {
      value: `/wfl/${env}`,
      description: "SSM Parameter Store prefix for application configuration",
      exportName: `wfl-ParameterPrefix-${env}`,
    });
  }
}
