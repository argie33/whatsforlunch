import * as cdk from "aws-cdk-lib";
import { BaseStack, BaseStackProps } from "./base-stack";
import { DataStack } from "./data-stack";

export interface BillingStackProps extends BaseStackProps {
  dataStack: DataStack;
}

export class BillingStack extends BaseStack {
  constructor(scope: cdk.App, id: string, props: BillingStackProps) {
    super(scope, id, props);

    // Phase A: Placeholder for RevenueCat webhook handler
    // Phase B will implement:
    // - Lambda: revenuecat-webhook (processes subscription events)
    // - Step Function: delete-account-flow
    // - Lambda: export-data
    // - Lambda: delete-account

    new cdk.CfnOutput(this, "BillingStackId", {
      value: this.stackId,
      description: "Billing and account management stack",
    });
  }
}
