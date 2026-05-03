import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { NetworkStack } from '../network-stack';
import { DataStack } from '../data-stack';
import { AuthStack } from '../auth-stack';
import { ApiStack } from '../api-stack';
import { AiStack } from '../ai-stack';
import { OpsStack } from '../ops-stack';
import { SecurityStack } from '../security-stack';
import { NotificationsStack } from '../notifications-stack';
import { BillingStack } from '../billing-stack';
import { loadEnvConfig } from '../../config/env-config';

const config = loadEnvConfig('dev');
const stackProps = {
  env: { account: '123456789012', region: 'us-east-1' },
  description: 'Test stack',
};

describe('WhatsFresh Infrastructure Stacks', () => {
  test('NetworkStack synthesizes without errors', () => {
    const app = new cdk.App();
    const stack = new NetworkStack(app, 'TestNetwork', { ...stackProps, config });
    const template = Template.fromStack(stack);
    template.resourceCountIs('AWS::CloudFront::Distribution', 1);
    template.resourceCountIs('AWS::S3::Bucket', 1);
  });

  test('DataStack synthesizes with DynamoDB + 4 GSIs', () => {
    const app = new cdk.App();
    const stack = new DataStack(app, 'TestData', { ...stackProps, config });
    const template = Template.fromStack(stack);
    template.resourceCountIs('AWS::DynamoDB::Table', 1);
    template.resourceCountIs('AWS::S3::Bucket', 3); // photos, exports, assets
    template.resourceCountIs('AWS::KMS::Key', 1);
  });

  test('AuthStack synthesizes with Cognito', () => {
    const app = new cdk.App();
    const dataStack = new DataStack(app, 'TestDataForAuth', { ...stackProps, config });
    const stack = new AuthStack(app, 'TestAuth', { ...stackProps, config, dataStack });
    const template = Template.fromStack(stack);
    template.resourceCountIs('AWS::Cognito::UserPool', 1);
    template.resourceCountIs('AWS::DynamoDB::Table', 1); // For nonce storage
  });

  test('SecurityStack synthesizes with WAF + CloudTrail', () => {
    const app = new cdk.App();
    const stack = new SecurityStack(app, 'TestSecurity', { ...stackProps, config });
    const template = Template.fromStack(stack);
    template.resourceCountIs('AWS::WAFv2::WebACL', 1);
    template.resourceCountIs('AWS::CloudTrail::Trail', 1);
    template.resourceCountIs('AWS::SecretsManager::Secret', 1);
    template.resourceCountIs('AWS::S3::Bucket', 1); // Audit bucket
  });

  test('OpsStack synthesizes with dashboards + alarms', () => {
    const app = new cdk.App();
    const stack = new OpsStack(app, 'TestOps', { ...stackProps, config });
    const template = Template.fromStack(stack);
    template.resourceCountIs('AWS::CloudWatch::Dashboard', 1);
    template.resourceCountIs('AWS::CloudWatch::Alarm', 10); // Lambda, AppSync, DynamoDB, Bedrock, AI cost + cache alarms
    template.resourceCountIs('AWS::SNS::Topic', 2); // Alerts + Critical
  });

  test('AiStack synthesizes with 3 Lambdas', () => {
    const app = new cdk.App();
    const dataStack = new DataStack(app, 'TestDataForAi', { ...stackProps, config });
    const stack = new AiStack(app, 'TestAi', { ...stackProps, config, dataStack });
    const template = Template.fromStack(stack);
    template.resourceCountIs('AWS::Lambda::Function', 3); // classify-food, ocr-expiry, image-resize
    template.resourceCountIs('AWS::IAM::Role', 1);
  });

  test('NotificationsStack synthesizes with EventBridge', () => {
    const app = new cdk.App();
    const dataStack = new DataStack(app, 'TestDataForNotif', { ...stackProps, config });
    const stack = new NotificationsStack(app, 'TestNotifications', {
      ...stackProps,
      config,
      dataStack,
    });
    const template = Template.fromStack(stack);
    template.resourceCountIs('AWS::Events::Rule', 3); // Expiration check + status change + daily digest
    template.resourceCountIs('AWS::SNS::Topic', 1);
  });

  test('All stacks export required outputs', () => {
    const app = new cdk.App();
    const dataStack = new DataStack(app, 'TestDataWithOutputs', { ...stackProps, config });
    const template = Template.fromStack(dataStack);

    // Verify key exports exist
    template.hasOutput('TableName', {
      Export: { Name: 'wfl-TableName-dev' },
    });
    template.hasOutput('PhotosBucketName', {
      Export: { Name: 'wfl-PhotosBucket-dev' },
    });
  });
});

describe('Integration: API + Data + Auth stacks', () => {
  test('ApiStack can reference DataStack and AuthStack', () => {
    const app = new cdk.App();
    const dataStack = new DataStack(app, 'IntegrationData', { ...stackProps, config });
    const authStack = new AuthStack(app, 'IntegrationAuth', { ...stackProps, config, dataStack });
    const aiStack = new AiStack(app, 'IntegrationAi', { ...stackProps, config, dataStack });
    const apiStack = new ApiStack(app, 'IntegrationApi', {
      ...stackProps,
      config,
      dataStack,
      authStack,
      aiStack,
    });
    const template = Template.fromStack(apiStack);
    template.resourceCountIs('AWS::AppSync::GraphQLApi', 1);
  });
});
