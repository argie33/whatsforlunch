# AWS Deployment Guide - Phase B+

**Status**: Complete backend ready for AWS deployment  
**Estimated Deployment Time**: 2-3 hours  
**Cost Estimate**: ~$200-300/month (dev environment)

---

## Pre-Deployment Checklist

### AWS Account Setup
- [ ] AWS account created
- [ ] AWS CLI configured (`aws configure`)
- [ ] AWS credentials with appropriate IAM permissions
- [ ] Region selected (recommend `us-east-1` or `us-west-2`)

### Repository State
- [ ] All files committed to git
- [ ] No uncommitted changes (`git status` clean)
- [ ] Node.js >= 20.18.0 installed
- [ ] pnpm >= 9 installed

### Local Verification
- [ ] Local DynamoDB setup complete (`pnpm local:migrate`)
- [ ] Local tests passing (`pnpm test`)
- [ ] GraphQL schema valid (`pnpm graphql:validate`)

---

## Step 1: Install Dependencies

```bash
# Install workspace dependencies
pnpm install

# Install CDK dependencies
pnpm --filter @wfl/infra install

# Verify installation
aws --version  # Should show AWS CLI v2
pnpm list aws-cdk-lib  # Should show installed version
```

---

## Step 2: Prepare AWS Environment

### Create S3 Bucket for CDK (if new account)

```bash
# CDK uses S3 for artifact staging
export AWS_REGION=us-east-1
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

aws s3 mb s3://cdk-assets-${AWS_ACCOUNT_ID}-${AWS_REGION} \
  --region ${AWS_REGION}

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket cdk-assets-${AWS_ACCOUNT_ID}-${AWS_REGION} \
  --versioning-configuration Status=Enabled
```

### Bootstrap CDK (one-time per account+region)

```bash
pnpm --filter @wfl/infra cdk bootstrap \
  aws://${AWS_ACCOUNT_ID}/${AWS_REGION}
```

### Set Environment Variables

```bash
# Create .env.aws in infra/cdk directory
cat > infra/cdk/.env.aws << EOF
AWS_REGION=us-east-1
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ENVIRONMENT=dev
DOMAIN=whatsforlunch.app
EOF

# Source it
export $(cat infra/cdk/.env.aws | xargs)
```

---

## Step 3: Synthesize CloudFormation

```bash
# Generate CloudFormation templates
pnpm --filter @wfl/infra cdk synth

# Should output something like:
# ✓ Built successfully
# CloudFormation template written to: cdk.out/
```

---

## Step 4: Review Stack Differences

```bash
# See what will be created/modified
pnpm --filter @wfl/infra cdk diff

# Review the output carefully - look for:
# - New resources (should be all "Create")
# - No unexpected deletions
# - Correct IAM roles and permissions
```

---

## Step 5: Deploy Stacks

### Deploy in Order (dependencies)

```bash
# 1. Network stack (VPC, subnets)
pnpm --filter @wfl/infra cdk deploy WFL-Network-dev \
  --require-approval never

# 2. Data stack (DynamoDB, KMS, S3)
pnpm --filter @wfl/infra cdk deploy WFL-Data-dev \
  --require-approval never

# 3. Auth stack (Cognito)
pnpm --filter @wfl/infra cdk deploy WFL-Auth-dev \
  --require-approval never

# 4. AI stack (Bedrock, Lambda for W4)
pnpm --filter @wfl/infra cdk deploy WFL-AI-dev \
  --require-approval never

# 5. API stack (AppSync, GraphQL)
pnpm --filter @wfl/infra cdk deploy WFL-API-dev \
  --require-approval never

# 6. Notifications stack (SNS, EventBridge, Lambdas)
pnpm --filter @wfl/infra cdk deploy WFL-Notifications-dev \
  --require-approval never

# 7. Security stack (WAF, shields)
pnpm --filter @wfl/infra cdk deploy WFL-Security-dev \
  --require-approval never

# 8. Billing stack (RevenueCat, Delete Account flow)
pnpm --filter @wfl/infra cdk deploy WFL-Billing-dev \
  --require-approval never

# 9. Ops stack (Monitoring, logging)
pnpm --filter @wfl/infra cdk deploy WFL-Ops-dev \
  --require-approval never
```

**OR** deploy all at once:

```bash
# Deploy all stacks in dependency order
pnpm --filter @wfl/infra cdk deploy '*' \
  --require-approval never \
  --all
```

**Expected output**:
```
✓ WFL-Network-dev
✓ WFL-Data-dev
✓ WFL-Auth-dev
...
Deployments succeeded: 9/9
```

---

## Step 6: Verify Deployment

### Get Stack Outputs

```bash
# List all outputs
pnpm --filter @wfl/infra cdk outputs

# Or query specific stack
aws cloudformation describe-stacks \
  --stack-name WFL-API-dev \
  --query 'Stacks[0].Outputs'
```

### Check Key Resources

```bash
# Verify DynamoDB table
aws dynamodb describe-table \
  --table-name wfl-main-dev \
  --query 'Table.TableStatus'
# Should output: ACTIVE

# Verify AppSync API
aws appsync list-graphql-apis \
  --query 'graphqlApis[?name==`wfl-api-dev`]'

# Verify Lambda functions
aws lambda list-functions \
  --query 'Functions[?contains(FunctionName, `wfl-`)].[FunctionName]'

# Verify Step Function
aws stepfunctions list-state-machines \
  --query 'stateMachines[?contains(name, `delete-account`)]'
```

---

## Step 7: Configure AppSync

### Create API Key (for development)

```bash
# Get GraphQL API ID
API_ID=$(aws appsync get-graphql-api \
  --name wfl-api-dev \
  --query 'graphqlApi.apiId' \
  --output text)

# Create API key (valid for 7 days)
aws appsync create-api-key \
  --api-id ${API_ID} \
  --description "Development testing key"
```

### Test GraphQL Endpoint

```bash
# Get GraphQL endpoint
GRAPHQL_URL=$(aws appsync get-graphql-api \
  --name wfl-api-dev \
  --query 'graphqlApi.uris.GRAPHQL' \
  --output text)

echo "GraphQL URL: ${GRAPHQL_URL}"

# Test with a simple query
curl -X POST "${GRAPHQL_URL}" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{"query":"query { me { id name } }"}'
```

---

## Step 8: Seed Test Data

### Option A: Deploy Seed Lambda

```bash
# Create Lambda to seed data
aws lambda create-function \
  --function-name wfl-seed-data-dev \
  --runtime nodejs20.x \
  --role arn:aws:iam::ACCOUNT_ID:role/YOUR_LAMBDA_ROLE \
  --handler seed-local-data.handler \
  --zip-file fileb://scripts/seed-local-data.js
```

### Option B: Use AppSync Console

```bash
# 1. Navigate to AppSync console
# 2. Select wfl-api-dev API
# 3. Go to Queries section
# 4. Run mutations to create test data
```

---

## Step 9: Configure Mobile Push

### Apple Push Notification Service (APNs)

```bash
# Create SNS platform application for APNs
aws sns create-platform-application \
  --name wfl-apns-dev \
  --platform APNS \
  --attributes PlatformCredential=YOUR_CERTIFICATE_KEY,\
    PlatformPrincipal=YOUR_CERTIFICATE_CERT,\
    EventEndpointCreated=arn:aws:sns:REGION:ACCOUNT:YOUR_TOPIC,\
    EventEndpointDeleted=arn:aws:sns:REGION:ACCOUNT:YOUR_TOPIC,\
    EventEndpointUpdated=arn:aws:sns:REGION:ACCOUNT:YOUR_TOPIC,\
    EventDeliveryFailure=arn:aws:sns:REGION:ACCOUNT:YOUR_TOPIC
```

### Google Cloud Messaging (FCM)

```bash
# Create SNS platform application for FCM
aws sns create-platform-application \
  --name wfl-fcm-dev \
  --platform GCM \
  --attributes PlatformCredential=YOUR_FCM_KEY
```

---

## Step 10: Monitor Deployment

### CloudWatch Dashboard

```bash
# View Lambda execution
aws logs tail /aws/lambda/wfl-notify-expiring-dev --follow

# View AppSync logs
aws logs tail /aws/appsync/wfl-api-dev --follow

# View Step Function logs
aws logs tail /aws/stepfunctions/wfl-delete-account-dev --follow
```

### Set Up Alarms

```bash
# Lambda error rate
aws cloudwatch put-metric-alarm \
  --alarm-name wfl-lambda-errors-dev \
  --alarm-description "Alert on Lambda errors" \
  --metric-name Errors \
  --namespace AWS/Lambda \
  --statistic Sum \
  --period 300 \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1
```

---

## Step 11: Run Smoke Tests

### Test Resolvers

```bash
# Create test user (use Cognito auth)
curl -X POST \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  "${GRAPHQL_URL}" \
  -d '{
    "query": "query { me { id email name } }"
  }'

# Create household
curl -X POST \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  "${GRAPHQL_URL}" \
  -d '{
    "query": "mutation { createHousehold(input: { name: \"Test\" }) { id name } }"
  }'
```

### Test Lambdas

```bash
# Invoke notify-expiring Lambda
aws lambda invoke \
  --function-name wfl-notify-expiring-dev \
  --invocation-type RequestResponse \
  response.json

# Check result
cat response.json

# Invoke food-rules Lambda
aws lambda invoke \
  --function-name wfl-food-rules-dev \
  --payload '{
    "action": "stats"
  }' \
  response.json
```

### Test Step Function

```bash
# Start delete account flow (test mode)
aws stepfunctions start-execution \
  --state-machine-arn arn:aws:states:REGION:ACCOUNT:stateMachine:WFL-DeleteAccount-dev \
  --input '{
    "userId": "test-user-123",
    "householdIds": ["test-house-1"],
    "retentionWindowSeconds": 10
  }'

# Check status
EXECUTION_ARN=arn:aws:states:REGION:ACCOUNT:execution:WFL-DeleteAccount-dev:test-1
aws stepfunctions describe-execution \
  --execution-arn ${EXECUTION_ARN} \
  --query 'status'
```

---

## Rollback Procedure

If deployment fails or you need to rollback:

```bash
# View rollback stacks
pnpm --filter @wfl/infra cdk list

# Destroy a specific stack
pnpm --filter @wfl/infra cdk destroy WFL-API-dev

# Destroy all stacks (careful!)
pnpm --filter @wfl/infra cdk destroy '*'

# Confirm deletion (will ask for confirmation)
# Type 'y' to confirm
```

**Note**: DynamoDB data will be retained (RemovalPolicy.RETAIN) unless explicitly removed.

---

## Production Deployment

For staging/production, follow the same steps but:

```bash
# Use staging environment
export ENVIRONMENT=staging
export DOMAIN=staging.whatsforlunch.app

# Deploy with approval
pnpm --filter @wfl/infra cdk deploy '*' \
  --require-approval always

# This will show changes and ask for approval before deploying
```

---

## Cost Estimation

### Monthly Costs (Approximate)

| Service | Dev | Staging | Prod |
|---------|-----|---------|------|
| DynamoDB | $5 | $20 | $100 |
| Lambda | $10 | $30 | $100 |
| AppSync | $9 | $30 | $100 |
| SNS | $2 | $5 | $20 |
| EventBridge | $1 | $2 | $5 |
| CloudWatch | $5 | $10 | $20 |
| **Total** | **~$32** | **~$97** | **~$345** |

### Cost Optimization Tips

- Use DynamoDB on-demand (pay-per-request) for dev/staging
- Use provisioned capacity for production with auto-scaling
- Enable S3 lifecycle policies to archive old logs
- Use CloudWatch Logs Insights instead of storing raw logs
- Set CloudWatch Logs retention (7 days for dev, 30 for prod)

---

## Troubleshooting

### Common Issues

#### "Account not bootstrapped"

```bash
# Re-run bootstrap
pnpm --filter @wfl/infra cdk bootstrap
```

#### "DynamoDB table already exists"

```bash
# Import existing table instead of creating new
# Update data-stack.ts to use TableFromAttributes()
```

#### "Lambda code path not found"

```bash
# Verify Lambda function files exist
ls -la infra/cdk/lib/appsync/lambdas/

# Ensure relative path is correct in CDK
# Should be: lambda.Code.fromAsset(path.join(__dirname, "../appsync/lambdas"))
```

#### "AppSync resolver errors"

```bash
# Check resolver mapping templates
aws appsync get-resolver \
  --api-id ${API_ID} \
  --type-name Query \
  --field-name me

# View CloudWatch logs for errors
aws logs tail /aws/appsync/wfl-api-dev --follow
```

#### "Step Function stuck in RUNNING state"

```bash
# Stop execution
aws stepfunctions stop-execution \
  --execution-arn ${EXECUTION_ARN}

# Check logs
aws logs tail /aws/stepfunctions/wfl-delete-account-dev --follow
```

---

## Next Steps

After successful deployment:

1. **Configure Mobile App**
   - Update API endpoint in mobile app config
   - Generate GraphQL types: `pnpm graphql:codegen`
   - Build and test mobile app

2. **Setup Monitoring**
   - Create CloudWatch dashboard
   - Set up SNS alerts for critical metrics
   - Configure log aggregation (CloudWatch Insights)

3. **Performance Testing**
   - Load test with k6 or artillery
   - Optimize resolver performance
   - Monitor DynamoDB throttling

4. **Security Hardening**
   - Enable WAF rules
   - Configure rate limiting stricter for production
   - Audit IAM roles
   - Enable MFA for AWS account

5. **Release Preparation**
   - Staging deployment validation
   - Beta testing with real users
   - Update documentation
   - Prepare rollback plan

---

## Support

For deployment issues:

1. Check CloudWatch logs
2. Review CDK stack events
3. Verify IAM permissions
4. Check AWS service quotas/limits
5. Reference AWS CDK documentation

**Documentation**:
- [AWS CDK Guide](https://docs.aws.amazon.com/cdk/)
- [AppSync Guide](https://docs.aws.amazon.com/appsync/)
- [DynamoDB Guide](https://docs.aws.amazon.com/dynamodb/)
- [Lambda Guide](https://docs.aws.amazon.com/lambda/)

---

**Deployment Guide Created**: Phase B+ (April 27, 2026)  
**Status**: Ready for AWS deployment
