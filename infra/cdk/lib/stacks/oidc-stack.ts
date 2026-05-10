import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import { BaseStack, BaseStackProps } from "./base-stack";

export class OidcStack extends BaseStack {
  public readonly stagingRoleArn: string;
  public readonly prodRoleArn: string;

  constructor(scope: cdk.App, id: string, props: BaseStackProps) {
    super(scope, id, props);

    // GitHub OIDC identity provider
    const provider = new iam.OpenIdConnectProvider(this, "GitHubProvider", {
      url: "https://token.actions.githubusercontent.com",
      clientIds: ["sts.amazonaws.com"],
      thumbprints: [
        "6938fd4d98bab03faadb97b34396831e3780aea1",
        "1c58a3a8518e8759bf075b76b750d4f2df264fcd",
      ],
    });

    // Deployment role for staging
    const stagingRole = new iam.Role(this, "GitHubActionsStagingRole", {
      assumedBy: new iam.WebIdentityPrincipal(provider.openIdConnectProviderArn, {
        StringEquals: {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
          "token.actions.githubusercontent.com:sub": "repo:wfl-org/whatsfresh:ref:refs/heads/main",
        },
      }),
      description: "Role for GitHub Actions to deploy to staging",
    });

    stagingRole.addToPrincipalPolicy(
      new iam.PolicyStatement({
        actions: ["cdk:*"],
        resources: ["*"],
      })
    );
    stagingRole.addToPrincipalPolicy(
      new iam.PolicyStatement({
        actions: ["cloudformation:*", "iam:*", "dynamodb:*", "s3:*", "ec2:*"],
        resources: ["*"],
        conditions: {
          StringEquals: {
            "aws:RequestedRegion": "us-east-1",
          },
        },
      })
    );

    // Deployment role for production
    const prodRole = new iam.Role(this, "GitHubActionsProductionRole", {
      assumedBy: new iam.WebIdentityPrincipal(provider.openIdConnectProviderArn, {
        StringEquals: {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
          "token.actions.githubusercontent.com:sub": "repo:wfl-org/whatsfresh:environment:prod",
        },
      }),
      description: "Role for GitHub Actions to deploy to production",
    });

    prodRole.addToPrincipalPolicy(
      new iam.PolicyStatement({
        actions: ["cdk:*"],
        resources: ["*"],
      })
    );
    prodRole.addToPrincipalPolicy(
      new iam.PolicyStatement({
        actions: ["cloudformation:*", "iam:*", "dynamodb:*", "s3:*", "ec2:*"],
        resources: ["*"],
        conditions: {
          StringEquals: {
            "aws:RequestedRegion": "us-east-1",
          },
        },
      })
    );

    this.stagingRoleArn = stagingRole.roleArn;
    this.prodRoleArn = prodRole.roleArn;

    new cdk.CfnOutput(this, "GitHubOidcProviderArn", {
      value: provider.openIdConnectProviderArn,
      description: "GitHub OIDC provider ARN",
    });

    new cdk.CfnOutput(this, "StagingRoleArn", {
      value: stagingRole.roleArn,
      description: "IAM role ARN for staging deployments",
      exportName: "github-actions-staging-role-arn",
    });

    new cdk.CfnOutput(this, "ProductionRoleArn", {
      value: prodRole.roleArn,
      description: "IAM role ARN for production deployments",
      exportName: "github-actions-production-role-arn",
    });
  }
}
