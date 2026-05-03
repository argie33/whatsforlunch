# 13 — Cloud Deployment Playbook

This playbook provides step-by-step instructions for deploying WhatsFresh infrastructure to AWS (dev, staging, and production environments).

---

## Prerequisites

Before attempting any deployment, ensure the following are in place:

### AWS Account Setup

- [ ] **AWS Account created** and accessible
- [ ] **AWS Account ID known**: Log into AWS Console → Account Settings → copy Account ID (12 digits)
- [ ] **IAM user with Admin access** for bootstrapping and initial setup
  - User should have `AdministratorAccess` policy attached
  - Alternatively: PowerUser + IAMFullAccess
- [ ] **AWS CLI installed** and configured locally
  ```bash
  aws --version  # Should be 2.13+
  aws configure  # Set default region to us-east-1
  ```
- [ ] **AWS credentials configured locally**
  ```bash
  cat ~/.aws/credentials  # Verify [default] profile exists
  ```

### Repository Setup

- [ ] **Local git repository cloned and up-to-date**
  ```bash
  git clone https://github.com/anthropics/whatsfresh.git
  cd whatsfresh
  git branch -a  # Verify main branch visible
  ```
- [ ] **Node.js 20+ installed**
  ```bash
  node --version  # Should be v20.x or higher
  ```
- [ ] **pnpm 9+ installed**
  ```bash
  pnpm --version  # Should be 9.x or higher
  pnpm install  # Install all dependencies
  ```
- [ ] **Dependencies installed in infra/cdk**
  ```bash
  cd infra/cdk
  pnpm install
  ```

### Environment Variables

Create a `.env.local` file in the project root with:

```bash
# AWS Account Configuration
AWS_ACCOUNT_ID=123456789012  # Your 12-digit AWS Account ID
AWS_REGION=us-east-1

# Environment (dev, staging, or prod)
ENVIRONMENT=dev

# Optional: Git commit SHA for tagging (auto-filled by CI/CD)
GIT_COMMIT=$(git rev-parse HEAD)
GIT_BRANCH=$(git rev-parse --abbrev-ref HEAD)

# Optional: Slack notifications (for deployment alerts)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL  # Optional
```

### GitHub Actions / OIDC Setup (For CI/CD)

> **Note**: For local-only deployment, skip this section. For production deployments via GitHub Actions, follow these steps.

**Option A: AWS OIDC Provider (Recommended)**

1. In AWS Console, navigate to IAM → Identity providers
2. Create provider: Provider type = OpenID Connect
3. Provider URL: `https://token.actions.githubusercontent.com`
4. Audience: `sts.amazonaws.com`
5. Get the provider ARN: `arn:aws:iam::ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com`
6. Create IAM role with trust policy:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Principal": {
           "Federated": "arn:aws:iam::ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com"
         },
         "Action": "sts:AssumeRoleWithWebIdentity",
         "Condition": {
           "StringEquals": {
             "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
           },
           "StringLike": {
             "token.actions.githubusercontent.com:sub": "repo:anthropics/whatsfresh:ref:refs/heads/main"
           }
         }
       }
     ]
   }
   ```
7. Attach policy: `AdministratorAccess` (or scoped policy with CDK permissions)
8. Note the role ARN: `arn:aws:iam::ACCOUNT_ID:role/github-actions-deployment`
9. In GitHub repo settings → Secrets and variables → Actions, add:
   - `AWS_OIDC_ROLE_ARN_DEV`
   - `AWS_OIDC_ROLE_ARN_STAGING`
   - `AWS_OIDC_ROLE_ARN_PROD`

**Option B: AWS Access Keys (Not Recommended for Production)**

If OIDC is not available:

1. Create IAM user with CDK deployment permissions
2. Generate access keys
3. In GitHub repo settings → Secrets, add:
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`

### Secrets Management Setup

**AWS Secrets Manager**

1. Create secrets in AWS Secrets Manager for each environment:

   ```bash
   aws secretsmanager create-secret \
     --name whatsfresh/dev/database \
     --secret-string '{"password":"generated-random-32-char-password"}'

   aws secretsmanager create-secret \
     --name whatsfresh/dev/jwt-signing-key \
     --secret-string '{"key":"your-256-bit-hex-key"}'

   aws secretsmanager create-secret \
     --name whatsfresh/dev/anthropic-api-key \
     --secret-string '{"key":"sk-ant-..."}'
   ```

2. Verify secrets are accessible:
   ```bash
   aws secretsmanager list-secrets --filters Key=name,Values=whatsfresh/dev
   ```

**GitHub Actions Secrets**

1. In GitHub repo settings → Secrets and variables → Actions, add:
   - `SENTRY_AUTH_TOKEN` (from sentry.io)
   - `SENTRY_ORG` (e.g., "whatsfresh")
   - `SENTRY_PROJECT_BACKEND` (e.g., "api")
   - `SLACK_DEPLOY_WEBHOOK` (optional, for deployment notifications)
   - `BEDROCK_MODEL_ID` (e.g., "anthropic.claude-3-5-sonnet-20241022-v2:0")

---

## Deployment Workflow

### Phase 0: Bootstrap AWS Account

> **Note**: Required only once per AWS account. The bootstrap creates CDK staging resources (S3 bucket, IAM roles).

```bash
# From project root
cd infra/cdk

# Bootstrap for your AWS account (do this once)
pnpm exec cdk bootstrap --profile default

# Expected output:
# ✓ Environment aws://ACCOUNT_ID/us-east-1 bootstrapped
```

If bootstrapping fails:

- Verify AWS credentials: `aws sts get-caller-identity`
- Verify account ID matches `AWS_ACCOUNT_ID` in `.env.local`
- Check IAM permissions: user should have `cloudformation:*` and `s3:*`

---

### Phase 1: Development Environment Deployment

**Goal**: Deploy infrastructure to AWS dev environment for testing.

**Duration**: ~45-60 minutes (first-time; subsequent deploys: ~15-20 min)

**Steps**:

1. **Verify configuration**

   ```bash
   cd infra/cdk
   cat cdk.json  # Verify context defaults
   pnpm exec cdk list --context env=dev  # List all stacks for dev
   ```

2. **Synthesize CloudFormation templates** (optional, but recommended)

   ```bash
   pnpm exec cdk synth --context env=dev
   # Creates cdk.out/ directory with CloudFormation templates
   ```

3. **Review changes** (dry-run)

   ```bash
   pnpm exec cdk diff --context env=dev > /tmp/cdk-diff.txt
   cat /tmp/cdk-diff.txt
   # Review new resources, IAM permissions, etc.
   ```

4. **Deploy development infrastructure**

   ```bash
   pnpm cdk:deploy --context env=dev --require-approval never

   # Expected output:
   # WFL-Network-dev: creating CloudFront distribution...
   # WFL-Data-dev: creating DynamoDB table...
   # WFL-Auth-dev: creating Cognito user pool...
   # WFL-API-dev: creating AppSync API...
   # ...
   # ✓ 15 stacks deployed successfully
   ```

5. **Capture outputs**

   ```bash
   pnpm exec cdk list --context env=dev --long
   # Copy stack outputs (Cognito IDs, AppSync URL, etc.) to .env.local
   ```

6. **Validate infrastructure**

   ```bash
   # Check DynamoDB table exists
   aws dynamodb list-tables --region us-east-1 | grep WFL-Main-dev

   # Check Cognito user pool exists
   aws cognito-idp list-user-pools --max-results 10 --region us-east-1 | grep wfl-dev

   # Check AppSync API exists
   aws appsync list-graphql-apis --region us-east-1 | grep api-dev
   ```

7. **Post-deployment configuration**

   a) **Create test user in Cognito**:

   ```bash
   aws cognito-idp admin-create-user \
     --user-pool-id us-east-1_XXXXX \
     --username testuser@whatsfresh.app \
     --message-action SUPPRESS \
     --region us-east-1

   # Set temporary password
   aws cognito-idp admin-set-user-password \
     --user-pool-id us-east-1_XXXXX \
     --username testuser@whatsfresh.app \
     --password "TempPassword123!" \
     --permanent \
     --region us-east-1
   ```

   b) **Seed test data to DynamoDB**:

   ```bash
   # If seed script exists
   pnpm seed:dev

   # Or manually verify table structure
   aws dynamodb describe-table \
     --table-name WFL-Main-dev \
     --region us-east-1
   ```

8. **Update mobile app configuration**

   Copy stack outputs to `apps/mobile/.env.local`:

   ```bash
   # Get outputs from CDK deployment
   pnpm exec cdk list --context env=dev --long > /tmp/outputs.txt

   # Update apps/mobile/.env.local with:
   EXPO_PUBLIC_API_URL=https://api-dev.whatsfresh.app/graphql
   EXPO_PUBLIC_COGNITO_REGION=us-east-1
   EXPO_PUBLIC_COGNITO_CLIENT_ID=xxxxx
   EXPO_PUBLIC_COGNITO_USER_POOL_ID=us-east-1_xxxxx
   EXPO_PUBLIC_COGNITO_DOMAIN=https://whatsfresh-dev.auth.us-east-1.amazoncognito.com
   EXPO_PUBLIC_S3_BUCKET=wfl-photos-dev
   EXPO_PUBLIC_S3_REGION=us-east-1
   ```

9. **Test connectivity from mobile app**
   ```bash
   cd apps/mobile
   pnpm dev
   # Launch Expo dev client
   # Test login → should authenticate with dev Cognito
   # Test dashboard → should load containers from dev DynamoDB
   ```

---

### Phase 2: Staging Environment Deployment

**Goal**: Deploy to staging for pre-production validation and integration testing.

**Duration**: ~15-20 minutes

**Prerequisites**:

- Development deployment successful
- All tests passing (`pnpm test`)
- Code reviewed and merged to main branch

**Steps**:

1. **Verify main branch is ready**

   ```bash
   git status  # Should be clean
   git pull origin main
   git log -1 --oneline  # Verify latest commit
   ```

2. **Deploy staging infrastructure**

   ```bash
   cd infra/cdk
   pnpm cdk:deploy --context env=staging --require-approval never
   ```

3. **Validate staging deployment**

   ```bash
   aws dynamodb list-tables --region us-east-1 | grep WFL-Main-staging
   aws appsync list-graphql-apis --region us-east-1 | grep api-staging
   ```

4. **Update mobile staging configuration**

   ```bash
   # apps/mobile/.env.staging
   EXPO_PUBLIC_API_URL=https://api-staging.whatsfresh.app/graphql
   EXPO_PUBLIC_COGNITO_DOMAIN=https://whatsfresh-staging.auth.us-east-1.amazoncognito.com
   # ... (other config)
   ```

5. **Deploy web app to staging**

   ```bash
   cd apps/web
   pnpm build
   pnpm deploy:staging  # Uses staging AppSync endpoint
   ```

6. **Run integration tests against staging**
   ```bash
   pnpm test:integration --environment staging
   ```

---

### Phase 3: Production Environment Deployment

**Goal**: Deploy to production for live users.

**Duration**: ~20-30 minutes

**Prerequisites**:

- Staging deployment successful and tested for 24+ hours
- All production secrets configured in AWS Secrets Manager
- Production domain (api.whatsfresh.app) configured in Route53
- Production SSL certificate issued via ACM

> **WARNING**: Production deployments are irreversible at scale. Do not proceed without:
>
> - Runbook for rollback (see "Troubleshooting" section)
> - On-call engineer availability
> - Monitoring dashboards active (CloudWatch, Sentry, PostHog)
> - Incident response procedures in place

**Steps**:

1. **Final pre-deployment checks**

   ```bash
   # Run all tests
   pnpm test:all

   # Check no uncommitted changes
   git status  # Must be clean

   # Verify production secrets
   aws secretsmanager list-secrets --filters Key=name,Values=whatsfresh/prod

   # Verify monitoring is active
   # Check Sentry project is enabled
   # Check CloudWatch dashboards exist
   # Check PostHog analytics pipeline is running
   ```

2. **Create pre-deployment backup**

   ```bash
   # Export prod DynamoDB table (if migrating from old schema)
   aws dynamodb export-table-to-pointin-time \
     --table-arn arn:aws:dynamodb:us-east-1:ACCOUNT_ID:table/WFL-Main-prod \
     --s3-bucket wfl-backups-prod \
     --s3-prefix backup-$(date +%Y%m%d-%H%M%S)
   ```

3. **Deploy production infrastructure**

   ```bash
   cd infra/cdk

   # Important: require-approval=any means you review each resource change
   pnpm cdk:deploy --context env=prod --require-approval any

   # Review each stack change carefully:
   # - No critical data should be deleted
   # - IAM role permissions should be as expected
   # - Encryption keys should be in place

   # Type "y" to approve each stack
   ```

4. **Validate production deployment**

   ```bash
   # Check tables
   aws dynamodb list-tables --region us-east-1 | grep WFL-Main-prod

   # Check API is responding
   curl -X POST https://api.whatsfresh.app/graphql \
     -H "Content-Type: application/json" \
     -d '{"query":"{__typename}"}'

   # Should return GraphQL schema, not error
   ```

5. **Smoke test with production user**

   ```bash
   # Create prod test user
   aws cognito-idp admin-create-user \
     --user-pool-id us-east-1_PROD_POOL_ID \
     --username prodtest@whatsfresh.app \
     --message-action SUPPRESS \
     --region us-east-1

   # Set password (temporary)
   aws cognito-idp admin-set-user-password \
     --user-pool-id us-east-1_PROD_POOL_ID \
     --username prodtest@whatsfresh.app \
     --password "ProdTest123!" \
     --permanent
   ```

6. **Enable app store redirect**
   ```bash
   # Once live, verify:
   # - Deep links work: whatsfresh.app/c/token → routes to container
   # - OAuth redirects work: Cognito → app
   # - API calls from iOS/Android reach correct endpoint
   ```

---

## Post-Deployment Validation

### Checklist

- [ ] **Network**: CloudFront distribution is active
- [ ] **Auth**: Cognito user pools created (dev, staging, prod)
- [ ] **Data**: DynamoDB tables created with correct schema
- [ ] **API**: AppSync GraphQL API responding
- [ ] **AI**: Lambda function can invoke Bedrock
- [ ] **Notifications**: SNS topics created for push notifications
- [ ] **Monitoring**: CloudWatch dashboards showing metrics
- [ ] **Security**: WAF rules active, GuardDuty enabled
- [ ] **Logging**: CloudTrail logging all API calls
- [ ] **Backup**: DynamoDB point-in-time recovery enabled

### Validation Commands

```bash
#!/bin/bash

REGION=us-east-1
ENV=dev

echo "🔍 Validating WhatsFresh Infrastructure ($ENV)"

# Check DynamoDB
echo "✓ DynamoDB Tables:"
aws dynamodb list-tables --region $REGION | \
  jq '.TableNames[] | select(contains("WFL-Main"))'

# Check Cognito
echo "✓ Cognito User Pools:"
aws cognito-idp list-user-pools --max-results 10 --region $REGION | \
  jq '.UserPools[] | select(.Name | contains("wfl")) | {Name, Id}'

# Check AppSync
echo "✓ AppSync APIs:"
aws appsync list-graphql-apis --region $REGION | \
  jq '.graphqlApis[] | select(.name | contains("wfl")) | {name, apiId, uris}'

# Check Lambda
echo "✓ Lambda Functions:"
aws lambda list-functions --region $REGION | \
  jq '.Functions[] | select(.FunctionName | contains("wfl")) | {FunctionName}'

# Check CloudWatch Alarms
echo "✓ CloudWatch Alarms:"
aws cloudwatch describe-alarms --region $REGION | \
  jq '.MetricAlarms[] | select(.AlarmName | contains("wfl")) | {AlarmName, StateValue}'

# Test GraphQL endpoint
echo "✓ GraphQL API Health:"
curl -s -X POST https://api-${ENV}.whatsfresh.app/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{__typename}"}' | jq .
```

---

## Troubleshooting

### Common Issues and Solutions

**Issue 1: Bootstrap fails**

```
Error: Unable to create S3 bucket
```

**Solution**:

- Verify AWS credentials: `aws sts get-caller-identity`
- Check S3 bucket naming: CDK uses `cdk...` prefix, must be globally unique
- Delete conflicting bucket if it exists: `aws s3 rb s3://cdk-bucket-name --force`
- Re-run bootstrap

---

**Issue 2: Insufficient IAM permissions**

```
Error: User is not authorized to perform: dynamodb:CreateTable
```

**Solution**:

- Attach `AdministratorAccess` to IAM user (temporary, for deployment only)
- Or create scoped policy with DynamoDB, Lambda, AppSync, etc. permissions
- Verify policy is attached: `aws iam list-attached-user-policies --user-name USERNAME`

---

**Issue 3: DynamoDB table creation timeout**

```
Error: Stack update failed: DynamoDB table creation timed out
```

**Solution**:

- This is rare but can happen on large tables
- Check CloudFormation events: `aws cloudformation describe-stack-events --stack-name WFL-Data-dev`
- Wait for completion: `aws cloudformation wait stack-create-complete --stack-name WFL-Data-dev`
- If truly stuck, manually delete stack and redeploy: `aws cloudformation delete-stack --stack-name WFL-Data-dev`

---

**Issue 4: Cognito user pool creation fails**

```
Error: User pool name already exists
```

**Solution**:

- Check if user pool already exists: `aws cognito-idp list-user-pools --max-results 10`
- If it's from a previous failed deployment, delete it: `aws cognito-idp delete-user-pool --user-pool-id us-east-1_XXXXX`
- Redeploy

---

**Issue 5: AppSync resolver errors**

```
Error: Cannot query field 'container' on type 'Query'
```

**Solution**:

- This means schema mismatch between client and API
- Regenerate schema from AppSync console
- Verify resolver mapping templates are deployed
- Check CloudWatch logs: `aws logs tail /aws/appsync/api-dev/QueryResolver --follow`

---

**Issue 6: Mobile app can't reach API**

```
Error: Failed to connect to api-dev.whatsfresh.app
```

**Solution**:

- Verify domain is configured in Route53: `aws route53 list-hosted-zones`
- Verify CloudFront distribution is active: `aws cloudfront list-distributions`
- Check DNS resolution: `nslookup api-dev.whatsfresh.app`
- Verify mobile app has correct endpoint in `.env.local`
- Check firewall/VPN isn't blocking request

---

**Issue 7: Bedrock API not available**

```
Error: Model access not granted. Your account doesn't have permission to use Claude
```

**Solution**:

- Bedrock requires opt-in per model per region
- In AWS Console: Bedrock → Model access → Request model access for claude-3.5-sonnet
- Wait for approval (usually immediate)
- Verify access: `aws bedrock list-foundation-models --region us-east-1`

---

**Issue 8: S3 bucket permissions denied**

```
Error: Access Denied to s3://wfl-photos-dev
```

**Solution**:

- Verify bucket policy allows Lambda to write: `aws s3api get-bucket-policy --bucket wfl-photos-dev`
- Verify Lambda IAM role has S3 permissions
- Check bucket doesn't have block-all-public-access enabled (unless intentional)

---

### Rollback Procedures

**If deployment is broken, rollback to previous version**:

```bash
# Option 1: Revert to previous CloudFormation stack
aws cloudformation cancel-update-stack --stack-name WFL-API-dev

# Option 2: Manually revert Lambda code
aws lambda update-function-code \
  --function-name wfl-item-classifier-dev \
  --s3-bucket cdk-assets-bucket \
  --s3-key previous-version.zip

# Option 3: Full stack rollback (nuclear option)
aws cloudformation delete-stack --stack-name WFL-Data-dev
# Then redeploy from git
```

---

## Deployment Timeline

| Phase                  | Duration       | Critical Path                         |
| ---------------------- | -------------- | ------------------------------------- |
| Bootstrap              | 5-10 min       | One-time setup                        |
| Dev deployment         | 45-60 min      | First-time slow due to table creation |
| Dev validation         | 10-15 min      | Test connectivity                     |
| Staging deployment     | 15-20 min      | Reuses bootstrapped resources         |
| Staging validation     | 10 min         | E2E test suite                        |
| Staging soak           | 24+ hours      | Monitoring for issues                 |
| Production deployment  | 20-30 min      | With approval step                    |
| Production validation  | 10-15 min      | Smoke tests                           |
| **Total (first-time)** | **~2-3 hours** |                                       |
| **Total (subsequent)** | **~1 hour**    | Dev + staging only                    |

---

## Next Steps

1. **Verify prerequisites** (AWS account, credentials, Node.js)
2. **Create `.env.local`** with AWS account ID and region
3. **Bootstrap AWS account**: `pnpm cdk bootstrap`
4. **Deploy dev**: `pnpm cdk:deploy --context env=dev`
5. **Validate and test** against dev environment
6. **Deploy staging**: `pnpm cdk:deploy --context env=staging`
7. **Run integration tests** against staging
8. **Deploy production** (after 24-hour staging soak): `pnpm cdk:deploy --context env=prod`

---

## Resources

- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/)
- [AWS CDK CLI Reference](https://docs.aws.amazon.com/cdk/latest/guide/cli.html)
- [CloudFormation Troubleshooting](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/troubleshooting.html)
- [DynamoDB Best Practices](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/best-practices.html)
- [Cognito Security Best Practices](https://docs.aws.amazon.com/cognito/latest/developerguide/best-practices.html)
- [AppSync Troubleshooting](https://docs.aws.amazon.com/appsync/latest/devguide/troubleshooting.html)
