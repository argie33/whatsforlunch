# 26 — AWS Account Setup & Bootstrap

Complete one-time setup steps for the AWS account before deploying WhatsForLunch infrastructure.

## Prerequisites

- AWS account created
- AWS CLI v2 installed and configured
- User with `AdministratorAccess` permission
- Node.js 20+ and pnpm installed

## 1. Initial AWS account configuration

### 1.1 Set up IAM user for local development

Create an IAM user for developers to use locally (not for CI/CD):

```bash
aws iam create-user --user-name whatsforlunch-dev-user
aws iam attach-user-policy --user-name whatsforlunch-dev-user \
  --policy-arn arn:aws:iam::aws:policy/AdministratorAccess
aws iam create-access-key --user-name whatsforlunch-dev-user
```

Configure AWS CLI:

```bash
aws configure --profile wfl-dev
# Enter Access Key ID
# Enter Secret Access Key
# Default region: us-east-1
# Default output: json
```

### 1.2 Enable CloudTrail (required for security stack)

```bash
aws cloudtrail create-trail --name wfl-trail --s3-bucket-name wfl-cloudtrail-logs
aws cloudtrail start-logging --name wfl-trail
```

### 1.3 Request service limits (optional but recommended)

Bedrock model access:

```bash
# Go to AWS Console → Bedrock → Model access
# Request access to: Claude 3.5 Haiku, Claude 3.5 Sonnet
# Request takes ~30 seconds to approve
```

## 2. GitHub OIDC setup

Set up OpenID Connect (OIDC) for secure credential-less CI/CD from GitHub Actions.

### 2.1 Deploy OIDC infrastructure via CDK

```bash
cd infra/cdk
pnpm install
export AWS_PROFILE=wfl-dev
pnpm cdk deploy WFL-OIDC-stack --context env=dev
```

This creates:
- GitHub OIDC identity provider
- IAM role for staging deployments
- IAM role for production deployments

### 2.2 Add GitHub Actions secrets

In GitHub repository settings, add these secrets:

```
AWS_OIDC_ROLE_ARN_DEV=arn:aws:iam::ACCOUNT:role/wfl-github-actions-dev
AWS_OIDC_ROLE_ARN_STAGING=arn:aws:iam::ACCOUNT:role/wfl-github-actions-staging
AWS_OIDC_ROLE_ARN_PROD=arn:aws:iam::ACCOUNT:role/wfl-github-actions-prod
EXPO_TOKEN=<EAS token from Expo>
SNYK_TOKEN=<Snyk token>
SEMGREP_APP_TOKEN=<Semgrep token>
CODECOV_TOKEN=<Codecov token>
MAESTRO_CLOUD_API_KEY=<Maestro token>
CHROMATIC_TOKEN=<Chromatic token>
```

Retrieve OIDC role ARNs:

```bash
aws cloudformation describe-stacks --stack-name WFL-OIDC-stack \
  --query 'Stacks[0].Outputs'
```

## 3. Domain & DNS setup

### 3.1 Register domain

Buy a domain (e.g., `wfl.app`). Popular registrars:
- Route53 (AWS)
- Namecheap
- GoDaddy

### 3.2 Set up Route53 hosted zone

```bash
aws route53 create-hosted-zone --name wfl.app --caller-reference $(date +%s)
```

Get the hosted zone ID:

```bash
aws route53 list-hosted-zones-by-name --dns-name wfl.app
```

Update nameservers in your domain registrar with Route53 nameservers (visible in hosted zone details).

## 4. CDK bootstrap

Bootstrap CDK in your AWS account (one-time setup per region):

```bash
export AWS_PROFILE=wfl-dev
export AWS_REGION=us-east-1

# Bootstrap for dev environment
pnpm cdk bootstrap aws://<ACCOUNT_ID>/us-east-1 --context env=dev

# Bootstrap for staging
pnpm cdk bootstrap aws://<ACCOUNT_ID>/us-east-1 --context env=staging

# Bootstrap for prod
pnpm cdk bootstrap aws://<ACCOUNT_ID>/us-east-1 --context env=prod
```

Find your account ID:

```bash
aws sts get-caller-identity --query 'Account' --output text
```

## 5. Deploy core infrastructure

### 5.1 Deploy to dev (first deployment)

```bash
cd infra/cdk
export AWS_PROFILE=wfl-dev
pnpm cdk deploy --all --context env=dev --require-approval any
```

Approve all prompts. This creates:
- VPC, subnets, security groups
- DynamoDB table
- S3 buckets
- Cognito User Pool
- AppSync GraphQL API
- CloudWatch alarms
- KMS encryption keys
- All other infrastructure

Duration: ~15-30 minutes

### 5.2 Verify deployment

```bash
aws cloudformation describe-stacks \
  --query 'Stacks[?StackStatus==`CREATE_COMPLETE`].[StackName]'
```

All stacks should show `CREATE_COMPLETE`.

### 5.3 Deploy to staging (optional)

```bash
pnpm cdk deploy --all --context env=staging --require-approval any
```

### 5.4 Deploy to production (optional, do after MVP validation)

```bash
pnpm cdk deploy --all --context env=prod --require-approval any
```

## 6. Post-deployment validation

### 6.1 Check AppSync GraphQL endpoint

```bash
aws appsync list-graphql-apis --query 'graphqlApis[0].uris'
```

### 6.2 Test AppSync connectivity

```bash
curl -X POST https://api-dev.wfl.app/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"query{__typename}"}' \
  -H "Authorization: Bearer <COGNITO_TOKEN>"
```

### 6.3 Verify CloudWatch logs

```bash
aws logs describe-log-groups --query 'logGroups[*].logGroupName' | grep wfl
```

## 7. Backup strategy

### 7.1 Enable DynamoDB point-in-time recovery

Already enabled for prod by CDK. For dev/staging:

```bash
aws dynamodb update-continuous-backups \
  --table-name WFL-Main-dev \
  --point-in-time-recovery-specification PointInTimeRecoveryEnabled=true
```

### 7.2 Enable S3 versioning

Already enabled by CDK. Verify:

```bash
aws s3api get-bucket-versioning --bucket wfl-photos-dev
```

## Teardown (for cleanup/cost savings)

To destroy all infrastructure:

```bash
pnpm cdk destroy --all --context env=dev --force
pnpm cdk destroy --all --context env=staging --force
pnpm cdk destroy --all --context env=prod --force
```

⚠️ This deletes all data. Use only for dev testing.

## Common errors

| Error | Fix |
|---|---|
| `NotAuthorizedException` from Cognito | Check SES sending domain is verified |
| `AccessDeniedException` from DynamoDB | Check IAM role has `dynamodb:*` |
| `InvalidUserIdException` | Cognito User Pool doesn't exist; check deployment |
| CDK synthesis fails | Ensure all `@aws-cdk/*` deps are same version |

## Post-MVP (multi-account)

Once launched, migrate to AWS Organizations:

```
wfl-management  (root)
├── wfl-dev
├── wfl-staging
├── wfl-prod
└── wfl-security
```

Use CloudFormation StackSets for cross-account deployments. See [08_DEPLOYMENT.md](08_DEPLOYMENT.md) for details.
