import * as cdk from 'aws-cdk-lib';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as path from 'path';
import { BaseStack, BaseStackProps } from './base-stack';
import { DataStack } from './data-stack';

export interface NotificationsStackProps extends BaseStackProps {
  dataStack: DataStack;
}

export class NotificationsStack extends BaseStack {
  public readonly pushTopic: sns.Topic;
  public readonly eventBus: events.EventBus;
  public readonly notifyExpiringLambda: lambda.Function;
  public readonly deleteAccountLambda: lambda.Function;
  public readonly foodRulesLambda: lambda.Function;

  constructor(scope: cdk.App, id: string, props: NotificationsStackProps) {
    super(scope, id, props);

    const env = this.config.env;
    const appName = 'wfl';

    // ============================================
    // SNS Mobile Push Topic
    // ============================================
    this.pushTopic = new sns.Topic(this, 'MobilePushTopic', {
      topicName: `${appName}-mobile-push-${env}`,
      displayName: 'Mobile push notifications',
    });

    // ============================================
    // Lambda Execution Role (shared across all Lambdas)
    // ============================================
    const lambdaRole = new iam.Role(this, 'LambdaExecutionRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
    });

    // Grant DynamoDB access to Lambda
    props.dataStack.table!.grantReadWriteData(lambdaRole);

    const svcRoot = path.join(__dirname, '../../../../services');
    const monoRepoRoot = path.resolve(__dirname, '../../../..');

    const commonNodejsProps: Omit<lambdaNodejs.NodejsFunctionProps, 'entry'> = {
      runtime: lambda.Runtime.NODEJS_20_X,
      architecture: lambda.Architecture.ARM_64,
      projectRoot: monoRepoRoot,
      depsLockFilePath: path.join(monoRepoRoot, 'pnpm-lock.yaml'),
      bundling: {
        minify: true,
        sourceMap: false,
        target: 'node20',
        externalModules: ['@aws-sdk/*'],
      },
    };

    // ============================================
    // Notify Expiring Items Lambda
    // ============================================
    this.notifyExpiringLambda = new lambdaNodejs.NodejsFunction(this, 'NotifyExpiringFunction', {
      ...commonNodejsProps,
      functionName: `${appName}-notify-expiring-${env}`,
      entry: path.join(svcRoot, 'notify-expiring/src/index.ts'),
      handler: 'handler',
      timeout: cdk.Duration.seconds(60),
      memorySize: 256,
      role: lambdaRole,
      environment: {
        MAIN_TABLE: props.dataStack.table!.tableName,
        SNS_TOPIC_ARN: this.pushTopic.topicArn,
      },
    });

    // ============================================
    // Delete Account Lambda
    // ============================================
    this.deleteAccountLambda = new lambdaNodejs.NodejsFunction(this, 'DeleteAccountFunction', {
      ...commonNodejsProps,
      functionName: `${appName}-delete-account-${env}`,
      entry: path.join(svcRoot, 'delete-account/src/index.ts'),
      handler: 'handler',
      timeout: cdk.Duration.seconds(120),
      memorySize: 512,
      role: lambdaRole,
      environment: {
        MAIN_TABLE: props.dataStack.table!.tableName,
      },
    });

    // ============================================
    // Food Rules Publish Lambda
    // ============================================
    this.foodRulesLambda = new lambdaNodejs.NodejsFunction(this, 'FoodRulesPublishFunction', {
      ...commonNodejsProps,
      functionName: `${appName}-food-rules-${env}`,
      entry: path.join(svcRoot, 'food-rules-publish/src/index.ts'),
      handler: 'handler',
      timeout: cdk.Duration.seconds(60),
      memorySize: 256,
      role: lambdaRole,
      environment: {
        MAIN_TABLE: props.dataStack.table!.tableName,
      },
    });

    // ============================================
    // Platform applications (APNs, FCM)
    // Placeholder - will be configured manually with certs in Phase B
    // ============================================

    // ============================================
    // EventBridge for expiring item notifications
    // ============================================
    this.eventBus = new events.EventBus(this, 'NotificationEventBus', {
      eventBusName: `${appName}-notifications-${env}`,
    });

    // Rule for daily expiration check (runs every 6 hours)
    const expirationRule = new events.Rule(this, 'ExpirationCheckRule', {
      schedule: events.Schedule.rate(cdk.Duration.hours(6)),
      description: 'Check for expiring food items every 6 hours',
    });

    // Target: notify-expiring Lambda
    expirationRule.addTarget(new targets.LambdaFunction(this.notifyExpiringLambda));

    // ============================================
    // EventBridge rule for item status changes (on custom event bus)
    // ============================================
    const statusChangeRule = new events.Rule(this, 'ItemStatusChangeRule', {
      eventBus: this.eventBus,
      eventPattern: {
        source: ['wfl.items'],
        detailType: ['Item Status Changed'],
      },
      description: 'Notify on item status changes',
    });

    statusChangeRule.addTarget(
      new targets.SnsTopic(this.pushTopic, {
        message: events.RuleTargetInput.fromEventPath('$.detail'),
      }),
    );

    // ============================================
    // Outputs
    // ============================================
    new cdk.CfnOutput(this, 'PushTopicArn', {
      value: this.pushTopic.topicArn,
      description: 'SNS topic for mobile push notifications',
    });

    new cdk.CfnOutput(this, 'EventBusArn', {
      value: this.eventBus.eventBusArn,
      description: 'EventBridge event bus for notifications',
    });

    new cdk.CfnOutput(this, 'NotifyExpiringLambdaArn', {
      value: this.notifyExpiringLambda.functionArn,
      description: 'ARN of notify-expiring Lambda function',
      exportName: `${appName}-notify-expiring-arn-${env}`,
    });

    new cdk.CfnOutput(this, 'DeleteAccountLambdaArn', {
      value: this.deleteAccountLambda.functionArn,
      description: 'ARN of delete-account Lambda function',
      exportName: `${appName}-delete-account-arn-${env}`,
    });

    new cdk.CfnOutput(this, 'FoodRulesLambdaArn', {
      value: this.foodRulesLambda.functionArn,
      description: 'ARN of food-rules Lambda function',
      exportName: `${appName}-food-rules-arn-${env}`,
    });
  }
}
