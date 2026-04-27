import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as iam from "aws-cdk-lib/aws-iam";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as stepfunctions from "aws-cdk-lib/aws-stepfunctions";
import * as stepfunctions_tasks from "aws-cdk-lib/aws-stepfunctions-tasks";
import { BaseStack, BaseStackProps } from "./base-stack";
import { DataStack } from "./data-stack";

export interface BillingStackProps extends BaseStackProps {
  dataStack: DataStack;
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
      },
    });

    // ============================================
    // Delete account function
    // ============================================
    const deleteAccountFn = new lambda.Function(this, "DeleteAccountFunction", {
      code: lambda.Code.fromInline(`
        exports.handler = async (event) => {
          console.log('Deleting account:', event);
          // Phase B: implement deletion logic
          return { status: 'account_deleted' };
        };
      `),
      handler: "index.handler",
      runtime: lambda.Runtime.NODEJS_20_X,
      role: billingLambdaRole,
      timeout: cdk.Duration.minutes(5),
      memorySize: 512,
      environment: {
        TABLE_NAME: props.dataStack.table?.tableName || "wfl-main",
      },
    });

    // ============================================
    // Step Function: Delete account flow
    // ============================================
    const deleteAccountFlow = new stepfunctions.Chain.start(
      new stepfunctions_tasks.LambdaInvoke(this, "ExportBeforeDelete", {
        lambdaFunction: exportDataFn,
      })
    )
      .next(
        new stepfunctions_tasks.LambdaInvoke(this, "DeleteAccountData", {
          lambdaFunction: deleteAccountFn,
        })
      )
      .next(
        new stepfunctions.Pass(this, "DeleteComplete", {
          result: stepfunctions.Result.fromObject({ status: "account_deleted" }),
        })
      );

    this.deleteAccountStateMachine = new stepfunctions.StateMachine(
      this,
      "DeleteAccountStateMachine",
      {
        definition: deleteAccountFlow,
        stateMachineType: stepfunctions.StateMachineType.STANDARD,
        timeout: cdk.Duration.minutes(15),
      }
    );

    new cdk.CfnOutput(this, "RevenueCatWebhookUrl", {
      value: webhookResource.url,
      description: "RevenueCat webhook endpoint",
    });

    new cdk.CfnOutput(this, "DeleteAccountStateMachineArn", {
      value: this.deleteAccountStateMachine.stateMachineArn,
      description: "Delete account workflow ARN",
    });
  }
}
