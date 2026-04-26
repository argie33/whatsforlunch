import * as cdk from "aws-cdk-lib";
import * as guardduty from "aws-cdk-lib/aws-guardduty";
import * as wafv2 from "aws-cdk-lib/aws-wafv2";
import { BaseStack, BaseStackProps } from "./base-stack";

export class SecurityStack extends BaseStack {
  public readonly webAcl: wafv2.CfnWebACL | null = null;

  constructor(scope: cdk.App, id: string, props: BaseStackProps) {
    super(scope, id, props);

    const env = this.config.env;

    // Phase A: Enable GuardDuty for threat detection
    new guardduty.CfnDetector(this, "GuardDutyDetector", {
      enable: true,
      findingPublishingFrequency: "FIFTEEN_MINUTES",
    });

    // ============================================
    // WAF Web ACL for CloudFront
    // ============================================
    this.webAcl = new wafv2.CfnWebACL(this, "CloudFrontWebAcl", {
      scope: "CLOUDFRONT",
      defaultAction: { allow: {} },
      visibilityConfig: {
        sampledRequestsEnabled: true,
        cloudWatchMetricsEnabled: true,
        metricName: `wfl-waf-${env}`,
      },
      rules: [
        // Rate limit: 2000 requests per 5 minutes per IP
        {
          name: "RateLimitRule",
          priority: 1,
          action: { block: {} },
          statement: {
            rateBasedStatement: {
              limit: 2000,
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
        ...(env === "prod"
          ? [
              {
                name: "BlockGraphQLIntrospection",
                priority: 2,
                action: { block: {} },
                statement: {
                  byteMatchStatement: {
                    searchString: "__schema",
                    fieldToMatch: {
                      body: {},
                    },
                    textTransformation: [{ priority: 0, type: "LOWERCASE" }],
                    positionalConstraint: "CONTAINS",
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
        // AWS Managed Rules: Common Rule Set
        {
          name: "AWSManagedRulesCommonRuleSet",
          priority: 10,
          overrideAction: { none: {} },
          statement: {
            managedRuleGroupStatement: {
              vendorName: "AWS",
              name: "AWSManagedRulesCommonRuleSet",
              excludedRules: [
                { name: "SizeRestrictions_BODY" }, // Allow large GraphQL queries
                { name: "GenericRFI_BODY" }, // Allow legitimate URL patterns
              ],
            },
          },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: "AWSManagedRulesCommonRuleSet",
          },
        },
        // AWS Managed Rules: Known Bad Inputs
        {
          name: "AWSManagedRulesKnownBadInputsRuleSet",
          priority: 11,
          overrideAction: { none: {} },
          statement: {
            managedRuleGroupStatement: {
              vendorName: "AWS",
              name: "AWSManagedRulesKnownBadInputsRuleSet",
            },
          },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: "AWSManagedRulesKnownBadInputsRuleSet",
          },
        },
      ],
    });

    // ============================================
    // Regional WAF for AppSync
    // ============================================
    const appSyncWebAcl = new wafv2.CfnWebACL(this, "AppSyncWebAcl", {
      scope: "REGIONAL",
      defaultAction: { allow: {} },
      visibilityConfig: {
        sampledRequestsEnabled: true,
        cloudWatchMetricsEnabled: true,
        metricName: `wfl-appsync-waf-${env}`,
      },
      rules: [
        // Rate limit for GraphQL mutations
        {
          name: "GraphQLMutationRateLimit",
          priority: 1,
          action: { block: { customResponse: { responseCode: 429 } } },
          statement: {
            rateBasedStatement: {
              limit: 100,
              aggregateKeyType: "IP",
              scopeDownStatement: {
                byteMatchStatement: {
                  searchString: "mutation",
                  fieldToMatch: { body: {} },
                  textTransformation: [{ priority: 0, type: "LOWERCASE" }],
                  positionalConstraint: "CONTAINS",
                },
              },
            },
          },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: "GraphQLMutationRateLimit",
          },
        },
      ],
    });

    // Phase B will implement:
    // - Security Hub enabled + standards
    // - CloudTrail with S3 lock
    // - IAM Access Analyzer

    new cdk.CfnOutput(this, "CloudFrontWebAclArn", {
      value: this.webAcl.attrArn,
      description: "CloudFront WAF Web ACL ARN",
      exportName: `wfl-CloudFrontWebAcl-${env}`,
    });

    new cdk.CfnOutput(this, "AppSyncWebAclArn", {
      value: appSyncWebAcl.attrArn,
      description: "AppSync WAF Web ACL ARN",
      exportName: `wfl-AppSyncWebAcl-${env}`,
    });
  }
}
