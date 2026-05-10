import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { DataStack } from '../data-stack';
import { AuthStack } from '../auth-stack';
import { ApiStack } from '../api-stack';
import { AiStack } from '../ai-stack';
import { SecurityStack } from '../security-stack';
import { loadEnvConfig } from '../../config/env-config';

const ENV = { account: '123456789012', region: 'us-east-1' };
const config = loadEnvConfig('dev');
const baseProps = { env: ENV, description: 'Snapshot test', config };

describe('CDK Snapshots', () => {
  // ============================================================
  // DataStack
  // ============================================================
  describe('DataStack snapshot', () => {
    let template: Template;

    beforeAll(() => {
      const app = new cdk.App();
      const stack = new DataStack(app, 'SnapData', baseProps);
      template = Template.fromStack(stack);
    });

    test('full template matches snapshot', () => {
      expect(template.toJSON()).toMatchSnapshot();
    });

    test('DynamoDB table has single-table design with 4 GSIs', () => {
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        TableName: 'wfl-main-dev',
        KeySchema: [
          { AttributeName: 'PK', KeyType: 'HASH' },
          { AttributeName: 'SK', KeyType: 'RANGE' },
        ],
        GlobalSecondaryIndexes: [
          {
            IndexName: 'GSI1',
            KeySchema: [
              { AttributeName: 'GSI1PK', KeyType: 'HASH' },
              { AttributeName: 'GSI1SK', KeyType: 'RANGE' },
            ],
          },
          {
            IndexName: 'GSI2',
            KeySchema: [
              { AttributeName: 'GSI2PK', KeyType: 'HASH' },
              { AttributeName: 'GSI2SK', KeyType: 'RANGE' },
            ],
          },
          {
            IndexName: 'GSI3',
            KeySchema: [
              { AttributeName: 'GSI3PK', KeyType: 'HASH' },
              { AttributeName: 'GSI3SK', KeyType: 'RANGE' },
            ],
          },
          {
            IndexName: 'GSI4',
            KeySchema: [
              { AttributeName: 'GSI4PK', KeyType: 'HASH' },
              { AttributeName: 'GSI4SK', KeyType: 'RANGE' },
            ],
          },
        ],
        BillingMode: 'PAY_PER_REQUEST',
        StreamSpecification: { StreamViewType: 'NEW_AND_OLD_IMAGES' },
        TimeToLiveSpecification: {
          AttributeName: 'expiresAt',
          Enabled: true,
        },
      });
    });

    test('KMS key has rotation enabled', () => {
      template.hasResourceProperties('AWS::KMS::Key', {
        EnableKeyRotation: true,
        Description: 'KMS key for DynamoDB and S3 encryption',
      });
    });

    test('photos bucket has versioning and INTELLIGENT_TIERING lifecycle', () => {
      template.hasResourceProperties('AWS::S3::Bucket', {
        BucketName: 'wfl-photos-dev',
        VersioningConfiguration: { Status: 'Enabled' },
        LifecycleConfiguration: {
          Rules: [
            {
              Transitions: [
                {
                  StorageClass: 'INTELLIGENT_TIERING',
                  TransitionInDays: 30,
                },
              ],
              Status: 'Enabled',
            },
          ],
        },
      });
    });

    test('exports bucket expires objects after 30 days', () => {
      template.hasResourceProperties('AWS::S3::Bucket', {
        BucketName: 'wfl-exports-dev',
        LifecycleConfiguration: {
          Rules: [
            {
              ExpirationInDays: 30,
              Status: 'Enabled',
            },
          ],
        },
      });
    });

    test('stack outputs include TableName and PhotosBucketName exports', () => {
      template.hasOutput('TableName', {
        Export: { Name: 'wfl-TableName-dev' },
      });
      template.hasOutput('PhotosBucketName', {
        Export: { Name: 'wfl-PhotosBucket-dev' },
      });
      template.hasOutput('KmsKeyArn', {
        Export: { Name: 'wfl-KmsKey-dev' },
      });
    });
  });

  // ============================================================
  // SecurityStack
  // ============================================================
  describe('SecurityStack snapshot', () => {
    let template: Template;

    beforeAll(() => {
      const app = new cdk.App();
      const stack = new SecurityStack(app, 'SnapSecurity', baseProps);
      template = Template.fromStack(stack);
    });

    test('full template matches snapshot', () => {
      expect(template.toJSON()).toMatchSnapshot();
    });

    test('WAF WebACL has RateLimitRule and AWSManagedRulesCommonRuleSet', () => {
      const json = template.toJSON();
      const webAcls = Object.values(json.Resources as Record<string, any>).filter(
        (r: any) => r.Type === 'AWS::WAFv2::WebACL',
      );
      expect(webAcls).toHaveLength(1);

      const rules: any[] = webAcls[0].Properties.Rules;
      const ruleNames = rules.map((r: any) => r.Name);

      expect(ruleNames).toContain('RateLimitRule');
      expect(ruleNames).toContain('AWSManagedRulesCommonRuleSet');

      // dev environment must NOT have BlockGraphQLIntrospection rule
      expect(ruleNames).not.toContain('BlockGraphQLIntrospection');
    });

    test('WAF RateLimitRule blocks at 2000 requests per IP', () => {
      const json = template.toJSON();
      const webAcl = Object.values(json.Resources as Record<string, any>).find(
        (r: any) => r.Type === 'AWS::WAFv2::WebACL',
      );
      const rateLimitRule = webAcl.Properties.Rules.find((r: any) => r.Name === 'RateLimitRule');

      expect(rateLimitRule.Action).toEqual({ Block: {} });
      expect(rateLimitRule.Statement.RateBasedStatement.Limit).toBe(2000);
      expect(rateLimitRule.Statement.RateBasedStatement.AggregateKeyType).toBe('IP');
    });

    test('WAF AWSManagedRulesCommonRuleSet excludes SizeRestrictions_BODY', () => {
      const json = template.toJSON();
      const webAcl = Object.values(json.Resources as Record<string, any>).find(
        (r: any) => r.Type === 'AWS::WAFv2::WebACL',
      );
      const managedRule = webAcl.Properties.Rules.find(
        (r: any) => r.Name === 'AWSManagedRulesCommonRuleSet',
      );

      const excludedRules = managedRule.Statement.ManagedRuleGroupStatement.ExcludedRules;
      expect(excludedRules).toContainEqual({ Name: 'SizeRestrictions_BODY' });
    });

    test('CloudTrail audit bucket has 7-year lifecycle and GLACIER transition', () => {
      // Audit bucket name uses Aws.ACCOUNT_ID token — match by lifecycle shape
      template.hasResourceProperties('AWS::S3::Bucket', {
        LifecycleConfiguration: {
          Rules: [
            {
              Transitions: [
                {
                  StorageClass: 'GLACIER',
                  TransitionInDays: 90,
                },
              ],
              ExpirationInDays: 2555,
              Status: 'Enabled',
            },
          ],
        },
      });
    });

    test('CloudTrail has file validation and multi-region disabled', () => {
      template.hasResourceProperties('AWS::CloudTrail::Trail', {
        EnableLogFileValidation: true,
        IsMultiRegionTrail: false,
        IncludeGlobalServiceEvents: true,
      });
    });

    test('stack outputs include WafWebAclArn and CloudTrailEnabled', () => {
      template.hasOutput('WafWebAclArn', {
        Export: { Name: 'wfl-WafAcl-dev' },
      });
      template.hasOutput('CloudTrailEnabled', {
        Value: 'true',
        Export: { Name: 'wfl-CloudTrail-dev' },
      });
    });
  });

  // ============================================================
  // Full composition: DataStack + AuthStack + AiStack + ApiStack
  // ============================================================
  describe('Full stack composition snapshot', () => {
    let dataTemplate: Template;
    let authTemplate: Template;
    let aiTemplate: Template;
    let apiTemplate: Template;

    beforeAll(() => {
      const app = new cdk.App();

      const dataStack = new DataStack(app, 'CompData', baseProps);
      const authStack = new AuthStack(app, 'CompAuth', {
        ...baseProps,
        dataStack,
      });
      const aiStack = new AiStack(app, 'CompAi', {
        ...baseProps,
        dataStack,
      });
      const apiStack = new ApiStack(app, 'CompApi', {
        ...baseProps,
        dataStack,
        authStack,
        aiStack,
      });

      dataTemplate = Template.fromStack(dataStack);
      authTemplate = Template.fromStack(authStack);
      aiTemplate = Template.fromStack(aiStack);
      apiTemplate = Template.fromStack(apiStack);
    });

    test('DataStack template matches snapshot (composition context)', () => {
      expect(dataTemplate.toJSON()).toMatchSnapshot();
    });

    test('AuthStack template matches snapshot', () => {
      expect(authTemplate.toJSON()).toMatchSnapshot();
    });

    test('AiStack template matches snapshot', () => {
      expect(aiTemplate.toJSON()).toMatchSnapshot();
    });

    test('ApiStack template matches snapshot', () => {
      expect(apiTemplate.toJSON()).toMatchSnapshot();
    });

    test('AuthStack Cognito User Pool references custom auth Lambdas', () => {
      authTemplate.hasResourceProperties('AWS::Cognito::UserPool', {
        UserPoolName: 'wfl-dev',
        LambdaConfig: {
          DefineAuthChallenge: {
            'Fn::GetAtt': Match.arrayWith([Match.stringLikeRegexp('DefineChallenge'), 'Arn']),
          },
          CreateAuthChallenge: {
            'Fn::GetAtt': Match.arrayWith([Match.stringLikeRegexp('CreateChallenge'), 'Arn']),
          },
          VerifyAuthChallengeResponse: {
            'Fn::GetAtt': Match.arrayWith([Match.stringLikeRegexp('VerifyChallenge'), 'Arn']),
          },
        },
      });
    });

    test('AiStack Lambdas use ARM_64 architecture', () => {
      aiTemplate.hasResourceProperties('AWS::Lambda::Function', {
        Architectures: ['arm64'],
        MemorySize: 1024,
        Runtime: 'nodejs20.x',
      });
    });

    test('AiStack IAM role grants Bedrock InvokeModel for Claude models', () => {
      const json = aiTemplate.toJSON();
      const policies = Object.values(json.Resources as Record<string, any>).filter(
        (r: any) => r.Type === 'AWS::IAM::Policy',
      );

      // At least one inline policy must include bedrock:InvokeModel
      const bedrockPolicy = policies.find((p: any) => {
        const stmts: any[] = p.Properties?.PolicyDocument?.Statement ?? [];
        return stmts.some(
          (s: any) => Array.isArray(s.Action) && s.Action.includes('bedrock:InvokeModel'),
        );
      });
      expect(bedrockPolicy).toBeDefined();
    });

    test('ApiStack has AppSync GraphQL API with Cognito + API_KEY auth', () => {
      apiTemplate.hasResourceProperties('AWS::AppSync::GraphQLApi', {
        Name: 'wfl-api-dev',
        AuthenticationType: 'AMAZON_COGNITO_USER_POOLS',
        AdditionalAuthenticationProviders: [{ AuthenticationType: 'API_KEY' }],
        XrayEnabled: true,
      });
    });

    test('ApiStack AppSync schema file is attached to the API', () => {
      apiTemplate.resourceCountIs('AWS::AppSync::GraphQLSchema', 1);
    });

    test('ApiStack has CloudFront distribution in front of AppSync', () => {
      apiTemplate.resourceCountIs('AWS::CloudFront::Distribution', 1);
      apiTemplate.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: {
          DefaultCacheBehavior: {
            ViewerProtocolPolicy: 'https-only',
            Compress: true,
          },
        },
      });
    });

    test('ApiStack outputs include AppSyncApiUrl and CloudFrontApiUrl', () => {
      apiTemplate.hasOutput('AppSyncApiUrl', {
        Export: { Name: 'wfl-ApiUrl-dev' },
      });
      apiTemplate.hasOutput('CloudFrontApiUrl', {
        Export: { Name: 'wfl-CloudFrontApiUrl-dev' },
      });
    });
  });
});
