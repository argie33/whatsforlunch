import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import { BaseStack, BaseStackProps } from "./base-stack";
import { DataStack } from "./data-stack";

export interface AiStackProps extends BaseStackProps {
  dataStack: DataStack;
}

export class AiStack extends BaseStack {
  constructor(scope: cdk.App, id: string, props: AiStackProps) {
    super(scope, id, props);

    // Phase A: Request Bedrock model access, create IAM roles
    // Phase B will implement:
    // - Lambda: classify-food (Haiku 4.5 with prompt caching)
    // - Lambda: ocr-expiry-date (Textract + Bedrock fallback)
    // - Lambda: image-resize (S3 trigger)
    // - AI quota enforcement
    // - Cost tracking table
    // - Eval suite skeleton

    // Create a placeholder role for AI Lambdas
    const aiLambdaRole = new iam.Role(this, "AiLambdaRole", {
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
      description: "IAM role for AI Lambda functions",
    });

    // Grant minimal permissions for Phase A
    aiLambdaRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaBasicExecutionRole")
    );

    new cdk.CfnOutput(this, "AiLambdaRoleArn", {
      value: aiLambdaRole.roleArn,
      description: "IAM role for AI Lambdas",
    });
  }
}
