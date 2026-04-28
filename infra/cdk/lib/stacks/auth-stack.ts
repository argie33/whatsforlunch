import * as cdk from "aws-cdk-lib";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as iam from "aws-cdk-lib/aws-iam";
import * as logs from "aws-cdk-lib/aws-logs";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import { BaseStack, BaseStackProps } from "./base-stack";
import { DataStack } from "./data-stack";
import * as path from "path";

export interface AuthStackProps extends BaseStackProps {
  dataStack: DataStack;
}

export class AuthStack extends BaseStack {
  public readonly userPool: cognito.UserPool | null = null;
  public readonly userPoolClient: cognito.UserPoolClient | null = null;
  public readonly authChallengesTable: dynamodb.Table | null = null;

  constructor(scope: cdk.App, id: string, props: AuthStackProps) {
    super(scope, id, props);

    const env = this.config.env;
    const appName = "wfl";

    // ============================================
    // DynamoDB table for magic link auth challenges
    // ============================================
    this.authChallengesTable = new dynamodb.Table(this, "AuthChallengesTable", {
      tableName: `${appName}-auth-challenges-${env}`,
      partitionKey: { name: "PK", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "SK", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      timeToLiveAttribute: "TTL",
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      pointInTimeRecovery: env === "prod",
    });

    // ============================================
    // Lambda execution roles
    // ============================================
    const cognitoTriggersRole = new iam.Role(this, "CognitoTriggersRole", {
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
      description: "Role for Cognito trigger Lambdas",
    });

    cognitoTriggersRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaBasicExecutionRole")
    );

    this.authChallengesTable.grantReadWriteData(cognitoTriggersRole);

    cognitoTriggersRole.addToPrincipalPolicy(
      new iam.PolicyStatement({
        actions: ["sesv2:SendEmail"],
        resources: ["*"],
      })
    );

    // ============================================
    // Lambda functions for Cognito triggers
    // ============================================
    // Phase A: Placeholder Lambdas for Cognito triggers
    // Phase B will implement actual Lambda code with business logic

    const commonEnv = {
      AUTH_CHALLENGES_TABLE: this.authChallengesTable.tableName,
      PROFILES_TABLE: `${appName}-profiles-${env}`,
      LOG_LEVEL: "INFO",
    };

    // Placeholder: Phase B will replace with actual implementation
    const placeholderCode = lambda.Code.fromInline(`
      exports.handler = async (event) => {
        console.log('Phase A placeholder - Phase B will implement');
        return event;
      };
    `);

    const defineChallengeFn = new lambda.Function(this, "DefineChallenge", {
      code: placeholderCode,
      handler: "index.handler",
      runtime: lambda.Runtime.NODEJS_20_X,
      role: cognitoTriggersRole,
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      environment: commonEnv,
    });

    const createChallengeFn = new lambda.Function(this, "CreateChallenge", {
      code: placeholderCode,
      handler: "index.handler",
      runtime: lambda.Runtime.NODEJS_20_X,
      role: cognitoTriggersRole,
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      environment: {
        ...commonEnv,
        NONCE_SECRET: "placeholder-nonce-secret",
        SES_FROM_EMAIL: `noreply@${this.config.domainName}`,
      },
    });

    const verifyChallengeRole = new iam.Role(this, "VerifyChallengeRole", {
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
    });
    verifyChallengeRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaBasicExecutionRole")
    );
    this.authChallengesTable.grantReadWriteData(verifyChallengeRole);

    const verifyChallengeResFn = new lambda.Function(this, "VerifyChallenge", {
      code: placeholderCode,
      handler: "index.handler",
      runtime: lambda.Runtime.NODEJS_20_X,
      role: verifyChallengeRole,
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      environment: {
        ...commonEnv,
        NONCE_SECRET: "placeholder-nonce-secret",
      },
    });

    const preSignupRole = new iam.Role(this, "PreSignupRole", {
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
    });
    preSignupRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaBasicExecutionRole")
    );

    const preSignupFn = new lambda.Function(this, "PreSignup", {
      code: placeholderCode,
      handler: "index.handler",
      runtime: lambda.Runtime.NODEJS_20_X,
      role: preSignupRole,
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      environment: commonEnv,
    });

    const postConfirmRole = new iam.Role(this, "PostConfirmRole", {
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
    });
    postConfirmRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaBasicExecutionRole")
    );
    // PostConfirm writes Profile + Household + HouseholdMember to the main table
    props.dataStack.table?.grantWriteData(postConfirmRole);

    const postConfirmFn = new lambda.Function(this, "PostConfirm", {
      code: placeholderCode,
      handler: "index.handler",
      runtime: lambda.Runtime.NODEJS_20_X,
      role: postConfirmRole,
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      environment: {
        ...commonEnv,
        MAIN_TABLE: props.dataStack.table?.tableName ?? `${appName}-main-${env}`,
      },
    });

    // ============================================
    // Cognito User Pool
    // ============================================
    this.userPool = new cognito.UserPool(this, "UserPool", {
      userPoolName: `${appName}-${env}`,
      selfSignUpEnabled: true,
      signInAliases: {
        email: true,
        preferredUsername: false,
      },
      passwordPolicy: {
        minLength: 12,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: false,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      advancedSecurityMode: cognito.AdvancedSecurityMode.ENFORCED,
      mfa: cognito.Mfa.OPTIONAL,
    });

    // Add Cognito triggers
    this.userPool.addTrigger(
      cognito.UserPoolOperation.DEFINE_AUTH_CHALLENGE,
      defineChallengeFn
    );
    this.userPool.addTrigger(
      cognito.UserPoolOperation.CREATE_AUTH_CHALLENGE,
      createChallengeFn
    );
    this.userPool.addTrigger(
      cognito.UserPoolOperation.VERIFY_AUTH_CHALLENGE_RESPONSE,
      verifyChallengeResFn
    );
    this.userPool.addTrigger(cognito.UserPoolOperation.PRE_SIGN_UP, preSignupFn);
    this.userPool.addTrigger(cognito.UserPoolOperation.POST_CONFIRMATION, postConfirmFn);

    // ============================================
    // User Pool Client
    // ============================================
    this.userPoolClient = this.userPool.addClient("MobileClient", {
      userPoolClientName: `${appName}-mobile-${env}`,
      authFlows: {
        custom: true,
        userPassword: false,
        adminUserPassword: false,
      },
      generateSecret: false,
      refreshTokenValidity: cdk.Duration.days(30),
      accessTokenValidity: cdk.Duration.hours(1),
      idTokenValidity: cdk.Duration.hours(1),
      preventUserExistenceErrors: false,
    });

    // ============================================
    // Cognito Identity Pool (for federated OAuth)
    // ============================================
    const identityPool = new cognito.CfnIdentityPool(this, "IdentityPool", {
      identityPoolName: `${appName}-identity-${env}`,
      allowUnauthenticatedIdentities: false,
      cognitoIdentityProviders: [
        {
          clientId: this.userPoolClient.userPoolClientId,
          providerName: this.userPool.userPoolProviderName,
        },
      ],
    });

    // ============================================
    // IAM roles for identity pool
    // ============================================
    const authenticatedRole = new iam.Role(this, "IdentityPoolAuthenticatedRole", {
      assumedBy: new iam.FederatedPrincipal(
        "cognito-identity.amazonaws.com",
        {
          StringEquals: {
            "cognito-identity.amazonaws.com:aud": identityPool.ref,
          },
          "ForAllValues:StringLike": {
            "cognito-identity.amazonaws.com:sub_type": "authenticated",
          },
        },
        "sts:AssumeRoleWithWebIdentity"
      ),
    });

    // Grant minimal permissions for AppSync and DynamoDB
    authenticatedRole.addToPrincipalPolicy(
      new iam.PolicyStatement({
        actions: ["appsync:GraphQL"],
        resources: ["*"],
      })
    );

    // Attach authenticated role to identity pool
    new cognito.CfnIdentityPoolRoleAttachment(this, "IdentityPoolRoleAttachment", {
      identityPoolId: identityPool.ref,
      roles: {
        authenticated: authenticatedRole.roleArn,
      },
    });

    // ============================================
    // Federated Identity Providers (placeholders)
    // ============================================
    // Apple Sign-In Provider
    // Note: Requires Apple Developer account and certificate
    // Configuration example:
    // const appleProvider = new cognito.UserPoolIdentityProviderApple(this, 'AppleProvider', {
    //   clientId: 'com.whatsforlunch.signin', // Services ID from Apple Developer Console
    //   teamId: 'XXXXXXXXXX', // 10-character Team ID
    //   keyId: 'XXXXXXXXXX', // 10-character Key ID
    //   privateKey: cdk.SecretValue.secretsManager('whatsforlunch/apple-key'),
    //   scopes: [cognito.OAuthScope.EMAIL, cognito.OAuthScope.OPENID],
    //   userPool: this.userPool,
    // });

    // Google Sign-In Provider
    // Note: Requires Google Cloud Console OAuth 2.0 credentials
    // const googleProvider = new cognito.UserPoolIdentityProviderGoogle(this, 'GoogleProvider', {
    //   clientId: new cdk.SecretValue.secretsManager('whatsforlunch/google-client-id'),
    //   clientSecret: new cdk.SecretValue.secretsManager('whatsforlunch/google-client-secret'),
    //   scopes: [cognito.OAuthScope.EMAIL, cognito.OAuthScope.OPENID, cognito.OAuthScope.PROFILE],
    //   userPool: this.userPool,
    // });

    // ============================================
    // Outputs
    // ============================================
    new cdk.CfnOutput(this, "CognitoUserPoolId", {
      value: this.userPool.userPoolId,
      description: "Cognito User Pool ID",
      exportName: `${appName}-UserPoolId-${env}`,
    });

    new cdk.CfnOutput(this, "CognitoClientId", {
      value: this.userPoolClient.userPoolClientId,
      description: "Cognito User Pool Client ID",
      exportName: `${appName}-ClientId-${env}`,
    });

    new cdk.CfnOutput(this, "IdentityPoolId", {
      value: identityPool.ref,
      description: "Cognito Identity Pool ID (for federated identities)",
      exportName: `${appName}-IdentityPoolId-${env}`,
    });

    new cdk.CfnOutput(this, "AuthChallengesTableName", {
      value: this.authChallengesTable.tableName,
      description: "Auth challenges DynamoDB table name",
      exportName: `${appName}-AuthChallengesTable-${env}`,
    });

    new cdk.CfnOutput(this, "UserPoolArn", {
      value: this.userPool.userPoolArn,
      description: "Cognito User Pool ARN",
      exportName: `${appName}-UserPoolArn-${env}`,
    });
  }
}
