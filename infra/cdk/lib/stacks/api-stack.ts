import * as cdk from "aws-cdk-lib";
import { BaseStack, BaseStackProps } from "./base-stack";
import { DataStack } from "./data-stack";
import { AuthStack } from "./auth-stack";
import { AiStack } from "./ai-stack";

export interface ApiStackProps extends BaseStackProps {
  dataStack: DataStack;
  authStack: AuthStack;
  aiStack: AiStack;
}

export class ApiStack extends BaseStack {
  public readonly apiUrl: string;

  constructor(scope: cdk.App, id: string, props: ApiStackProps) {
    super(scope, id, props);

    this.apiUrl = this.config.apiUrl;

    // Phase A: AppSync API skeleton
    // Phase B will implement:
    // - GraphQL schema with all mutations, queries, subscriptions per 03_API_SPEC.md
    // - AppSync JS resolvers for CRUD (Container, Item, Profile, Household, FoodRule)
    // - Subscription resolvers for real-time sync
    // - Sync engine resolver: deltaSync query
    // - Conflict resolution logic
    // - Lambda data sources for classify, ocr, etc.

    new cdk.CfnOutput(this, "AppSyncApiUrl", {
      value: this.apiUrl,
      description: "AppSync API endpoint",
    });
  }
}
