import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as iam from "aws-cdk-lib/aws-iam";
import { BaseStack, BaseStackProps } from "./base-stack";
import { DataStack } from "./data-stack";

export interface AiStackProps extends BaseStackProps {
  dataStack: DataStack;
}

export class AiStack extends BaseStack {
  public readonly classifyFoodFn: lambda.Function;
  public readonly ocrExpiryFn: lambda.Function;
  public readonly imageResizeFn: lambda.Function;
  public readonly aiLambdaRole: iam.Role;

  constructor(scope: cdk.App, id: string, props: AiStackProps) {
    super(scope, id, props);

    const env = this.config.env;
    const appName = "wfl";

    // ============================================
    // IAM Role for AI Lambdas
    // ============================================
    this.aiLambdaRole = new iam.Role(this, "AiLambdaRole", {
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
      description: "IAM role for AI Lambda functions",
    });

    this.aiLambdaRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaBasicExecutionRole")
    );

    // Grant Bedrock permissions
    this.aiLambdaRole.addToPrincipalPolicy(
      new iam.PolicyStatement({
        actions: ["bedrock:InvokeModel", "bedrock:InvokeModelWithResponseStream"],
        resources: [
          `arn:aws:bedrock:${this.config.region}::foundation-model/anthropic.claude-3-5-haiku-20241022-v1:0`,
          `arn:aws:bedrock:${this.config.region}::foundation-model/anthropic.claude-3-5-sonnet-20241022-v2:0`,
        ],
      })
    );

    // Grant Textract permissions
    this.aiLambdaRole.addToPrincipalPolicy(
      new iam.PolicyStatement({
        actions: ["textract:AnalyzeDocument", "textract:StartDocumentAnalysis"],
        resources: ["*"],
      })
    );

    // Grant S3 access for processing photos
    props.dataStack.photoBucket?.grantRead(this.aiLambdaRole);

    // Grant DynamoDB access for tracking AI usage
    props.dataStack.table?.grantReadWriteData(this.aiLambdaRole);

    // ============================================
    // Lambda: Classify food from image
    // ============================================
    this.classifyFoodFn = new lambda.Function(this, "ClassifyFoodFunction", {
      code: lambda.Code.fromInline(`
        exports.handler = async (event) => {
          console.log('Classifying food image:', event);
          // Phase B: Invoke Bedrock Claude 3.5 Haiku with prompt caching
          // Analyze food image and return structured classification
          return {
            status: 'success',
            classification: {
              name: 'unknown',
              expiryEstimate: 7,
              category: 'other',
            },
          };
        };
      `),
      handler: "index.handler",
      runtime: lambda.Runtime.NODEJS_20_X,
      role: this.aiLambdaRole,
      timeout: cdk.Duration.seconds(60),
      memorySize: 1024,
      architecture: lambda.Architecture.ARM_64,
      environment: {
        TABLE_NAME: props.dataStack.table?.tableName || "wfl-main",
      },
    });

    // ============================================
    // Lambda: OCR for expiry dates
    // ============================================
    this.ocrExpiryFn = new lambda.Function(this, "OcrExpiryDateFunction", {
      code: lambda.Code.fromInline(`
        exports.handler = async (event) => {
          console.log('Extracting expiry date:', event);
          // Phase B: Use Textract for OCR, fallback to Bedrock for interpretation
          return {
            status: 'success',
            expiryDate: null,
            confidence: 0,
          };
        };
      `),
      handler: "index.handler",
      runtime: lambda.Runtime.NODEJS_20_X,
      role: this.aiLambdaRole,
      timeout: cdk.Duration.seconds(60),
      memorySize: 1024,
      architecture: lambda.Architecture.ARM_64,
      environment: {
        TABLE_NAME: props.dataStack.table?.tableName || "wfl-main",
      },
    });

    // ============================================
    // Lambda: Image resize triggered by S3
    // ============================================
    this.imageResizeFn = new lambda.Function(this, "ImageResizeFunction", {
      code: lambda.Code.fromInline(`
        exports.handler = async (event) => {
          console.log('Resizing image:', event);
          // Phase B: Use Sharp or ImageMagick to resize/optimize images
          return {
            status: 'success',
            originalSize: 0,
            optimizedSize: 0,
          };
        };
      `),
      handler: "index.handler",
      runtime: lambda.Runtime.NODEJS_20_X,
      role: this.aiLambdaRole,
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      architecture: lambda.Architecture.ARM_64,
      environment: {
        BUCKET_NAME: props.dataStack.photoBucket?.bucketName || "wfl-photos",
      },
    });

    // Phase C: Wire S3 notifications to trigger imageResizeFn
    // (Defer to later phase to avoid circular stack dependencies)
    // Will be wired via EventBridge or Lambda URL instead

    new cdk.CfnOutput(this, "ClassifyFoodFunctionArn", {
      value: this.classifyFoodFn.functionArn,
      description: "Classify food Lambda ARN",
    });

    new cdk.CfnOutput(this, "OcrExpiryFunctionArn", {
      value: this.ocrExpiryFn.functionArn,
      description: "OCR expiry date Lambda ARN",
    });

    new cdk.CfnOutput(this, "ImageResizeFunctionArn", {
      value: this.imageResizeFn.functionArn,
      description: "Image resize Lambda ARN",
    });

    new cdk.CfnOutput(this, "AiLambdaRoleArn", {
      value: this.aiLambdaRole.roleArn,
      description: "IAM role for AI Lambdas",
    });
  }
}
