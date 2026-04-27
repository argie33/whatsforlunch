import * as cdk from "aws-cdk-lib";
import * as appsync from "aws-cdk-lib/aws-appsync";
import * as iam from "aws-cdk-lib/aws-iam";
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
  public readonly api: appsync.GraphqlApi;
  public readonly apiUrl: string;

  constructor(scope: cdk.App, id: string, props: ApiStackProps) {
    super(scope, id, props);

    const env = this.config.env;
    const appName = "wfl";

    // ============================================
    // AppSync GraphQL API
    // ============================================
    this.api = new appsync.GraphqlApi(this, "Api", {
      name: `${appName}-api-${env}`,
      schema: appsync.SchemaFile.fromAsset("lib/appsync/schema.graphql"),
      authorizationConfig: {
        defaultAuthorization: {
          authorizationType: appsync.AuthorizationType.USER_POOL,
          userPoolConfig: {
            userPool: props.authStack.userPool!,
          },
        },
        additionalAuthorizationModes: [
          {
            authorizationType: appsync.AuthorizationType.API_KEY,
          },
        ],
      },
      logConfig: {
        retention: 7,
      },
      xrayEnabled: true,
    });

    // ============================================
    // Data source: DynamoDB table
    // ============================================
    const dbDataSource = this.api.addDynamoDbDataSource(
      "DynamoDbDataSource",
      props.dataStack.table!
    );

    // ============================================
    // Simple resolvers for Query.me (placeholder)
    // ============================================
    dbDataSource.createResolver("QueryMeResolver", {
      typeName: "Query",
      fieldName: "me",
      requestMappingTemplate: appsync.MappingTemplate.fromString(`
        {
          "version": "2017-02-28",
          "operation": "GetItem",
          "key": {
            "PK": { "S": "USER#\$ctx.identity.sub" },
            "SK": { "S": "PROFILE" }
          }
        }
      `),
      responseMappingTemplate: appsync.MappingTemplate.fromString(`
        $util.toJson($ctx.result)
      `),
    });

    // ============================================
    // Lambda data source for AI functions
    // ============================================
    const aiRole = new iam.Role(this, "AppSyncAiRole", {
      assumedBy: new iam.ServicePrincipal("appsync.amazonaws.com"),
    });
    aiRole.addToPrincipalPolicy(
      new iam.PolicyStatement({
        actions: ["lambda:InvokeFunction"],
        resources: ["*"],
      })
    );

    this.apiUrl = this.config.apiUrl;

    new cdk.CfnOutput(this, "AppSyncApiUrl", {
      value: `https://${this.api.apiId}.appsync-api.${this.config.region}.amazonaws.com/graphql`,
      description: "AppSync GraphQL API endpoint",
    });

    new cdk.CfnOutput(this, "AppSyncApiId", {
      value: this.api.apiId,
      description: "AppSync API ID",
    });
  }
}
