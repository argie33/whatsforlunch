import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as iam from 'aws-cdk-lib/aws-iam';
import { BaseStack, BaseStackProps } from './base-stack';
import { DataStack } from './data-stack';
import * as path from 'path';

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
    const appName = 'wfl';
    const aiSvcRoot = path.join(__dirname, '../../../../services/ai');

    // ============================================
    // IAM Role for AI Lambdas
    // ============================================
    this.aiLambdaRole = new iam.Role(this, 'AiLambdaRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      description: 'IAM role for AI Lambda functions',
    });

    this.aiLambdaRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
    );

    // Grant Bedrock permissions
    this.aiLambdaRole.addToPrincipalPolicy(
      new iam.PolicyStatement({
        actions: ['bedrock:InvokeModel', 'bedrock:InvokeModelWithResponseStream'],
        resources: [
          `arn:aws:bedrock:${this.config.region}::foundation-model/anthropic.claude-3-5-haiku-20241022-v1:0`,
          `arn:aws:bedrock:${this.config.region}::foundation-model/anthropic.claude-3-5-sonnet-20241022-v2:0`,
        ],
      }),
    );

    // Grant Textract permissions
    this.aiLambdaRole.addToPrincipalPolicy(
      new iam.PolicyStatement({
        actions: ['textract:AnalyzeDocument', 'textract:StartDocumentAnalysis'],
        resources: ['*'],
      }),
    );

    // Grant S3 access for processing photos
    props.dataStack.photoBucket?.grantRead(this.aiLambdaRole);

    // Grant DynamoDB access for tracking AI usage
    props.dataStack.table?.grantReadWriteData(this.aiLambdaRole);

    const commonNodejsProps: Omit<lambdaNodejs.NodejsFunctionProps, 'entry'> = {
      runtime: lambda.Runtime.NODEJS_20_X,
      architecture: lambda.Architecture.ARM_64,
      bundling: {
        minify: true,
        sourceMap: false,
        target: 'node20',
        externalModules: ['@aws-sdk/*'],
      },
    };

    // ============================================
    // Lambda: Classify food from image
    // ============================================
    this.classifyFoodFn = new lambdaNodejs.NodejsFunction(this, 'ClassifyFoodFunction', {
      ...commonNodejsProps,
      entry: path.join(aiSvcRoot, 'classify-food/src/index.ts'),
      handler: 'handler',
      role: this.aiLambdaRole,
      timeout: cdk.Duration.seconds(60),
      memorySize: 1024,
      environment: {
        MAIN_TABLE: props.dataStack.table?.tableName || `${appName}-main-${env}`,
        PHOTO_BUCKET: props.dataStack.photoBucket?.bucketName || `${appName}-photos-${env}`,
        // Set to '2' to activate v2 prompt for A/B testing; keep '1' as stable default.
        CLASSIFY_PROMPT_VERSION: '1',
      },
    });

    // ============================================
    // Lambda: OCR for expiry dates
    // ============================================
    this.ocrExpiryFn = new lambdaNodejs.NodejsFunction(this, 'OcrExpiryDateFunction', {
      ...commonNodejsProps,
      entry: path.join(aiSvcRoot, 'ocr-expiry-date/src/index.ts'),
      handler: 'handler',
      role: this.aiLambdaRole,
      timeout: cdk.Duration.seconds(60),
      memorySize: 1024,
      environment: {
        MAIN_TABLE: props.dataStack.table?.tableName || `${appName}-main-${env}`,
        PHOTO_BUCKET: props.dataStack.photoBucket?.bucketName || `${appName}-photos-${env}`,
      },
    });

    // ============================================
    // Lambda: Image resize triggered by S3
    // ============================================
    this.imageResizeFn = new lambdaNodejs.NodejsFunction(this, 'ImageResizeFunction', {
      ...commonNodejsProps,
      entry: path.join(aiSvcRoot, '../images/image-resize/src/index.ts'),
      handler: 'handler',
      role: this.aiLambdaRole,
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      bundling: {
        ...commonNodejsProps.bundling,
        nodeModules: ['sharp'],
        forceDockerBundling: false,
      },
      environment: {
        PHOTO_BUCKET: props.dataStack.photoBucket?.bucketName || `${appName}-photos-${env}`,
        MAIN_TABLE: props.dataStack.table?.tableName || `${appName}-main-${env}`,
      },
    });

    // ============================================
    // Provisioned Concurrency (staging + prod only)
    // Keeps 1 warm instance of classifyFoodFn to eliminate cold-start latency
    // for the user-facing AI scan flow.
    // ============================================
    if (env === 'staging' || env === 'prod') {
      const classifyAlias = this.classifyFoodFn.addAlias('live', {
        provisionedConcurrentExecutions: env === 'prod' ? 2 : 1,
        description: 'Warm alias — zero cold-start for scan flow',
      });
      new cdk.CfnOutput(this, 'ClassifyFoodAliasArn', {
        value: classifyAlias.functionArn,
        description: 'Classify food Lambda warm alias ARN',
      });
    }

    new cdk.CfnOutput(this, 'ClassifyFoodFunctionArn', {
      value: this.classifyFoodFn.functionArn,
      description: 'Classify food Lambda ARN',
    });

    new cdk.CfnOutput(this, 'OcrExpiryFunctionArn', {
      value: this.ocrExpiryFn.functionArn,
      description: 'OCR expiry date Lambda ARN',
    });

    new cdk.CfnOutput(this, 'ImageResizeFunctionArn', {
      value: this.imageResizeFn.functionArn,
      description: 'Image resize Lambda ARN',
    });

    new cdk.CfnOutput(this, 'AiLambdaRoleArn', {
      value: this.aiLambdaRole.roleArn,
      description: 'IAM role for AI Lambdas',
    });
  }
}
