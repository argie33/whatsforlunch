import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as path from 'path';
import * as stepfunctions from 'aws-cdk-lib/aws-stepfunctions';
import * as stepfunctions_tasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import * as logs from 'aws-cdk-lib/aws-logs';
import { BaseStack, BaseStackProps } from './base-stack';
import { DataStack } from './data-stack';
import { NotificationsStack } from './notifications-stack';

export interface BillingStackProps extends BaseStackProps {
  dataStack: DataStack;
  notificationsStack: NotificationsStack;
}

export class BillingStack extends BaseStack {
  public readonly revenuecatWebhookApi: apigateway.RestApi;
  public readonly deleteAccountStateMachine: stepfunctions.StateMachine;

  constructor(scope: cdk.App, id: string, props: BillingStackProps) {
    super(scope, id, props);

    const env = this.config.env;
    const appName = 'wfl';

    // ============================================
    // IAM roles for billing functions
    // ============================================
    const billingLambdaRole = new iam.Role(this, 'BillingLambdaRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      description: 'Role for billing-related Lambdas',
    });

    billingLambdaRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
    );

    props.dataStack.table?.grantReadWriteData(billingLambdaRole);

    props.dataStack.exportsBucket?.grantReadWrite(billingLambdaRole);

    const serviceRoot = path.join(__dirname, '../../../../services');

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
    // RevenueCat webhook handler
    // ============================================
    const revenuecatWebhookFn = new lambdaNodejs.NodejsFunction(this, 'RevenueCatWebhookHandler', {
      ...commonNodejsProps,
      functionName: `${appName}-revenuecat-webhook-${env}`,
      entry: path.join(serviceRoot, 'revenuecat-webhook/src/index.ts'),
      handler: 'handler',
      role: billingLambdaRole,
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      environment: {
        MAIN_TABLE: props.dataStack.table?.tableName || `${appName}-main-${env}`,
        REVENUECAT_WEBHOOK_SECRET: cdk.SecretValue.secretsManager(
          `${appName}/${env}/revenuecat-webhook-secret`,
        ).unsafeUnwrap(),
      },
    });

    // ============================================
    // API Gateway for webhook endpoint
    // ============================================
    this.revenuecatWebhookApi = new apigateway.RestApi(this, 'RevenueCatWebhookApi', {
      restApiName: `${appName}-revenuecat-webhook-${env}`,
      description: 'RevenueCat subscription webhook',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
      },
    });

    const webhookResource = this.revenuecatWebhookApi.root.addResource('webhook');
    webhookResource.addMethod('POST', new apigateway.LambdaIntegration(revenuecatWebhookFn));

    // ============================================
    // Data export function
    // ============================================
    const exportDataFn = new lambdaNodejs.NodejsFunction(this, 'ExportDataFunction', {
      ...commonNodejsProps,
      functionName: `${appName}-export-data-${env}`,
      entry: path.join(serviceRoot, 'export-data/src/index.ts'),
      handler: 'handler',
      role: billingLambdaRole,
      timeout: cdk.Duration.minutes(5),
      memorySize: 512,
      environment: {
        MAIN_TABLE: props.dataStack.table?.tableName || `${appName}-main-${env}`,
        EXPORT_BUCKET: props.dataStack.exportsBucket?.bucketName || `${appName}-exports-${env}`,
      },
    });

    // ============================================
    // Step Function: Delete account flow
    // Phase B: Two-phase deletion (soft-delete immediately, hard-purge after 30 days)
    // ============================================
    const deleteAccountFn = props.notificationsStack.deleteAccountLambda;

    // Grant Step Functions permission to invoke delete Lambda
    deleteAccountFn.grantInvoke(new iam.ServicePrincipal('states.amazonaws.com'));

    // Phase 1: Soft-delete (immediate)
    const softDeleteStep = new stepfunctions_tasks.LambdaInvoke(this, 'SoftDeleteAccount', {
      lambdaFunction: deleteAccountFn,
      outputPath: '$.Payload',
      payloadResponseOnly: true,
    });

    // Phase 2: Wait for 30-day retention window
    const waitStep = new stepfunctions.Wait(this, 'WaitRetentionWindow', {
      time: stepfunctions.WaitTime.duration(cdk.Duration.days(30)),
    });

    // Phase 3: Hard-purge (permanent deletion)
    const hardPurgeStep = new stepfunctions_tasks.LambdaInvoke(this, 'HardPurgeAccount', {
      lambdaFunction: deleteAccountFn,
      outputPath: '$.Payload',
      payloadResponseOnly: true,
    });

    // Succeed state
    const successState = new stepfunctions.Succeed(this, 'DeletionSucceeded');

    // Failure handling
    const failureState = new stepfunctions.Fail(this, 'DeletionFailed', {
      cause: 'Account deletion process failed',
    });

    // addCatch must be called on the task directly, not on the resulting Chain
    softDeleteStep.addCatch(failureState, {
      errors: ['States.ALL'],
      resultPath: '$.error',
    });
    hardPurgeStep.addCatch(failureState, {
      errors: ['States.ALL'],
      resultPath: '$.error',
    });

    // Define state machine definition
    const definition = softDeleteStep.next(waitStep).next(hardPurgeStep).next(successState);

    // Create state machine
    this.deleteAccountStateMachine = new stepfunctions.StateMachine(
      this,
      'DeleteAccountStateMachine',
      {
        definition: definition,
        stateMachineType: stepfunctions.StateMachineType.STANDARD,
        timeout: cdk.Duration.days(35), // 30 days + buffer
        logs: {
          destination: new logs.LogGroup(this, 'DeleteAccountLogs', {
            logGroupName: `/aws/stepfunctions/${appName}-delete-account-${env}`,
            retention: env === 'prod' ? logs.RetentionDays.ONE_MONTH : logs.RetentionDays.ONE_WEEK,
          }),
          level: stepfunctions.LogLevel.ALL,
        },
      },
    );

    new cdk.CfnOutput(this, 'RevenueCatWebhookUrl', {
      value: `${this.revenuecatWebhookApi.url}webhook`,
      description: 'RevenueCat webhook endpoint',
    });

    new cdk.CfnOutput(this, 'DeleteAccountStateMachineArn', {
      value: this.deleteAccountStateMachine.stateMachineArn,
      description: 'Delete account workflow ARN',
    });
  }
}
