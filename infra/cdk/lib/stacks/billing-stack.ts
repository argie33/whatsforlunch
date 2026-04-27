import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as iam from "aws-cdk-lib/aws-iam";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as stepfunctions from "aws-cdk-lib/aws-stepfunctions";
import * as stepfunctions_tasks from "aws-cdk-lib/aws-stepfunctions-tasks";
import * as logs from "aws-cdk-lib/aws-logs";
import { BaseStack, BaseStackProps } from "./base-stack";
import { DataStack } from "./data-stack";
import { NotificationsStack } from "./notifications-stack";

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
    const appName = "wfl";

    // ============================================
    // IAM roles for billing functions
    // ============================================
    const billingLambdaRole = new iam.Role(this, "BillingLambdaRole", {
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
      description: "Role for billing-related Lambdas",
    });

    billingLambdaRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaBasicExecutionRole")
    );

    props.dataStack.table?.grantReadWriteData(billingLambdaRole);

    // ============================================
    // RevenueCat webhook handler
    // ============================================
    const revenuecatWebhookFn = new lambda.Function(
      this,
      "RevenueCatWebhookHandler",
      {
        functionName: `${appName}-revenuecat-webhook-${env}`,
        code: lambda.Code.fromInline(`
          exports.handler = async (event) => {
            console.log('RevenueCat webhook received:', event);
            // Phase B: process subscription events
            return {
              statusCode: 200,
              body: JSON.stringify({ status: 'processed' }),
            };
          };
        `),
        handler: "index.handler",
        runtime: lambda.Runtime.NODEJS_20_X,
        role: billingLambdaRole,
        timeout: cdk.Duration.seconds(30),
        memorySize: 256,
        environment: {
          TABLE_NAME: props.dataStack.table?.tableName || "wfl-main",
          MAIN_TABLE: props.dataStack.table?.tableName || "wfl-main",
        },
      }
    );

    // ============================================
    // API Gateway for webhook endpoint
    // ============================================
    this.revenuecatWebhookApi = new apigateway.RestApi(
      this,
      "RevenueCatWebhookApi",
      {
        restApiName: `${appName}-revenuecat-webhook-${env}`,
        description: "RevenueCat subscription webhook",
        defaultCorsPreflightOptions: {
          allowOrigins: apigateway.Cors.ALL_ORIGINS,
          allowMethods: apigateway.Cors.ALL_METHODS,
        },
      }
    );

    const webhookResource = this.revenuecatWebhookApi.root.addResource("webhook");
    webhookResource.addMethod(
      "POST",
      new apigateway.LambdaIntegration(revenuecatWebhookFn)
    );

    // ============================================
    // Data export function
    // ============================================
    const exportDataFn = new lambda.Function(this, "ExportDataFunction", {
      functionName: `${appName}-export-data-${env}`,
      code: lambda.Code.fromInline(`
        exports.handler = async (event) => {
          console.log('Exporting user data:', event);
          // Phase B: export data to S3
          return { status: 'export_started' };
        };
      `),
      handler: "index.handler",
      runtime: lambda.Runtime.NODEJS_20_X,
      role: billingLambdaRole,
      timeout: cdk.Duration.minutes(5),
      memorySize: 512,
      environment: {
        TABLE_NAME: props.dataStack.table?.tableName || "wfl-main",
        MAIN_TABLE: props.dataStack.table?.tableName || "wfl-main",
        EXPORT_BUCKET: `${appName}-exports-${env}`,
      },
    });

    // ============================================
    // Step Function: Delete account flow
    // Phase B: Two-phase deletion (soft-delete immediately, hard-purge after 30 days)
    // ============================================
    const deleteAccountFn = props.notificationsStack.deleteAccountLambda;

    // Grant Step Functions permission to invoke delete Lambda
    deleteAccountFn.grantInvoke(
      new iam.ServicePrincipal("states.amazonaws.com")
    );

    // Phase 1: Soft-delete (immediate)
    const softDeleteStep = new stepfunctions_tasks.LambdaInvoke(
      this,
      "SoftDeleteAccount",
      {
        lambdaFunction: deleteAccountFn,
        outputPath: "$.Payload",
        payloadResponseOnly: true,
      }
    );

    // Phase 2: Wait for 30-day retention window
    const waitStep = new stepfunctions.Wait(this, "WaitRetentionWindow", {
      time: stepfunctions.WaitTime.duration(cdk.Duration.days(30)),
    });

    // Phase 3: Hard-purge (permanent deletion)
    const hardPurgeStep = new stepfunctions_tasks.LambdaInvoke(
      this,
      "HardPurgeAccount",
      {
        lambdaFunction: deleteAccountFn,
        outputPath: "$.Payload",
        payloadResponseOnly: true,
      }
    );

    // Succeed state
    const successState = new stepfunctions.Succeed(this, "DeletionSucceeded");

    // Failure handling
    const failureState = new stepfunctions.Fail(this, "DeletionFailed", {
      message: "Account deletion process failed",
    });

    // Define state machine definition
    const definition = softDeleteStep
      .addCatch(failureState, {
        errors: ["States.ALL"],
        resultPath: "$.error",
      })
      .next(waitStep)
      .next(hardPurgeStep)
      .addCatch(failureState, {
        errors: ["States.ALL"],
        resultPath: "$.error",
      })
      .next(successState);

    // Create state machine
    this.deleteAccountStateMachine = new stepfunctions.StateMachine(
      this,
      "DeleteAccountStateMachine",
      {
        definition: definition,
        stateMachineType: stepfunctions.StateMachineType.STANDARD,
        timeout: cdk.Duration.days(35), // 30 days + buffer
        logs: {
          destination: new logs.LogGroup(this, "DeleteAccountLogs", {
            logGroupName: `/aws/stepfunctions/${appName}-delete-account-${env}`,
            retention: env === "prod" ? logs.RetentionDays.ONE_MONTH : logs.RetentionDays.ONE_WEEK,
          }),
          level: stepfunctions.LogLevel.ALL,
        },
      }
    );

    new cdk.CfnOutput(this, "RevenueCatWebhookUrl", {
      value: `${this.revenuecatWebhookApi.url}webhook`,
      description: "RevenueCat webhook endpoint",
    });

    new cdk.CfnOutput(this, "DeleteAccountStateMachineArn", {
      value: this.deleteAccountStateMachine.stateMachineArn,
      description: "Delete account workflow ARN",
    });
  }
}
