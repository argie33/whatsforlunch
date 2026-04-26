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

    const env = this.config.env;
    const appName = "wfl";

    // ============================================
    // KMS Key for encryption
    // ============================================
    this.kmsKey = new kms.Key(this, "DataKey", {
      description: "KMS key for DynamoDB and S3 encryption",
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      enableKeyRotation: true,
    });

    // ============================================
    // DynamoDB Single-Table Design
    // Per: docs/02_DATA_MODEL.md
    // ============================================
    this.table = new dynamodb.Table(this, "MainTable", {
      tableName: `${appName}-main-${env}`,
      partitionKey: { name: "PK", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "SK", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.CUSTOMER_MANAGED,
      encryptionKey: this.kmsKey,
      pointInTimeRecovery: env === "prod",
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
      timeToLiveAttribute: "expiresAt",
    });

    // ============================================
    // Global Secondary Indexes (GSIs)
    // ============================================

    // GSI1: User → all their households
    // GSI1PK = USER#{userId}, GSI1SK = PROFILE | HOUSEHOLD#{householdId}
    this.table.addGlobalSecondaryIndex({
      indexName: "GSI1",
      partitionKey: { name: "GSI1PK", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "GSI1SK", type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // GSI2: Items expiring soon (sparse index)
    // GSI2PK = EXPIRING#{householdId}, GSI2SK = expiryAt
    this.table.addGlobalSecondaryIndex({
      indexName: "GSI2",
      partitionKey: { name: "GSI2PK", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "GSI2SK", type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // GSI3: Per-user items across households
    // GSI3PK = USER_ITEMS#{userId}, GSI3SK = storedAt
    this.table.addGlobalSecondaryIndex({
      indexName: "GSI3",
      partitionKey: { name: "GSI3PK", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "GSI3SK", type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // GSI4: Lookup by external ID (qrToken, barcode, inviteToken)
    // GSI4PK = QR_TOKEN#{token} | BARCODE#{barcode} | INVITE_TOKEN#{token}
    // GSI4SK = CONTAINER | ITEM#{itemId} | INVITE
    this.table.addGlobalSecondaryIndex({
      indexName: "GSI4",
      partitionKey: { name: "GSI4PK", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "GSI4SK", type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // ============================================
    // S3 Buckets (with encryption)
    // ============================================

    // Photos bucket
    this.photoBucket = new s3.Bucket(this, "PhotosBucket", {
      bucketName: `${appName}-photos-${env}`,
      encryption: s3.BucketEncryption.KMS,
      encryptionKey: this.kmsKey,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      versioned: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      lifecycleRules: [
        {
          transitions: [
            {
              storageClass: s3.StorageClass.INTELLIGENT_TIERING,
              transitionAfter: cdk.Duration.days(30),
            },
          ],
        },
      ],
    });

    // Exports bucket (data export files)
    this.exportsBucket = new s3.Bucket(this, "ExportsBucket", {
      bucketName: `${appName}-exports-${env}`,
      encryption: s3.BucketEncryption.KMS,
      encryptionKey: this.kmsKey,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      versioned: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      lifecycleRules: [
        {
          expiration: cdk.Duration.days(30), // Exports expire after 30 days
        },
      ],
    });

    // App assets bucket (shared resources)
    this.assetsBucket = new s3.Bucket(this, "AssetsBucket", {
      bucketName: `${appName}-assets-${env}`,
      encryption: s3.BucketEncryption.KMS,
      encryptionKey: this.kmsKey,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // ============================================
    // Outputs for other stacks + mobile app
    // ============================================
    new cdk.CfnOutput(this, "TableName", {
      value: this.table.tableName,
      exportName: `${appName}-TableName-${env}`,
      description: "Main DynamoDB table name",
    });

    new cdk.CfnOutput(this, "TableArn", {
      value: this.table.tableArn,
      exportName: `${appName}-TableArn-${env}`,
      description: "Main DynamoDB table ARN",
    });

    new cdk.CfnOutput(this, "PhotosBucketName", {
      value: this.photoBucket.bucketName,
      exportName: `${appName}-PhotosBucket-${env}`,
      description: "S3 bucket for photos",
    });

    new cdk.CfnOutput(this, "ExportsBucketName", {
      value: this.exportsBucket.bucketName,
      exportName: `${appName}-ExportsBucket-${env}`,
      description: "S3 bucket for data exports",
    });

    new cdk.CfnOutput(this, "AssetsBucketName", {
      value: this.assetsBucket.bucketName,
      exportName: `${appName}-AssetsBucket-${env}`,
      description: "S3 bucket for app assets",
    });

    new cdk.CfnOutput(this, "KmsKeyArn", {
      value: this.kmsKey.keyArn,
      exportName: `${appName}-KmsKey-${env}`,
      description: "KMS key ARN for encryption",
    });
  }
}
