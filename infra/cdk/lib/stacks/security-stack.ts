import * as cdk from "aws-cdk-lib";
import * as guardduty from "aws-cdk-lib/aws-guardduty";
import * as securityhub from "aws-cdk-lib/aws-securityhub";
import * as wafv2 from "aws-cdk-lib/aws-wafv2";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
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
        {
          name: "AWSManagedRulesCommonRuleSet",
          priority: 1,
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
    this.graphqlSecret = new secretsmanager.Secret(this, "GraphQLSecret", {
      secretName: `wfl/graphql/${env}`,
      description: "GraphQL API credentials and keys",
      generateSecretString: {
        secretStringTemplate: JSON.stringify({
          apiKey: "placeholder-key",
          bearerToken: "placeholder-token",
        }),
        generateStringKey: "secretValue",
      },
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
  }
}
