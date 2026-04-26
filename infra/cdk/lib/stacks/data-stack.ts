import * as cdk from "aws-cdk-lib";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as kms from "aws-cdk-lib/aws-kms";
import { BaseStack, BaseStackProps } from "./base-stack";

export interface DataStackProps extends BaseStackProps {
  dataStack?: DataStack;
}

export class DataStack extends BaseStack {
  public readonly table: dynamodb.Table | null = null;
  public readonly photoBucket: s3.Bucket | null = null;
  public readonly exportsBucket: s3.Bucket | null = null;
  public readonly assetsBucket: s3.Bucket | null = null;
  public readonly kmsKey: kms.Key | null = null;

  constructor(scope: cdk.App, id: string, props: BaseStackProps) {
    super(scope, id, props);

    // Phase A: Create KMS key for encryption
    this.kmsKey = new kms.Key(this, "TableKey", {
      description: "KMS key for DynamoDB and S3 encryption",
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      enableKeyRotation: true,
    });

    // Phase B will implement:
    // - DynamoDB single-table with all GSIs per 02_DATA_MODEL.md
    // - S3 buckets (photos, exports, app-assets) with encryption + policies
    // - Secrets Manager + SSM Parameter Store

    new cdk.CfnOutput(this, "KmsKeyArn", {
      value: this.kmsKey.keyArn,
      description: "KMS key ARN for encryption",
    });
  }
}
