# ⚙️ Lambda Configuration Reference (W1 CDK Deployment)

**Purpose**: Exact Lambda configuration parameters for AWS deployment  
**Owner**: W1 Infrastructure Team (CDK)  
**Validated by**: W4 AI Lambda Team  
**Status**: Phase C Ready

---

## Lambda Function Specifications

### 1. classify-food-lambda

**Basic Configuration:**

```
Function Name: classify-food-lambda
Runtime: Node.js 18.x (or 20.x)
Handler: index.handler
Role: classify-food-lambda-role (IAM)
Architecture: x86_64 (standard)
Timeout: 30 seconds
Memory: 512 MB
Ephemeral Storage: 512 MB (default)
```

**Environment Variables:**

```bash
# Bedrock configuration
AWS_REGION=us-east-1
BEDROCK_MODEL_HAIKU=anthropic.claude-3-5-haiku-20241022-v1:0
BEDROCK_MODEL_SONNET=anthropic.claude-3-5-sonnet-20241022-v2:0

# DynamoDB configuration
DYNAMODB_TABLE=ai_classifications

# Feature flags (Phase C: switch to false for real Bedrock)
USE_MOCK_BEDROCK=false
USE_MOCK_DYNAMODB=false

# Logging
LOG_LEVEL=info
NODE_ENV=production

# Performance
BEDROCK_TIMEOUT_MS=25000
DYNAMODB_TIMEOUT_MS=5000
S3_TIMEOUT_MS=5000

# Feature tuning
CONFIDENCE_THRESHOLD_PICKER=0.6
SYSTEM_PROMPT_VERSION=1
```

**VPC Configuration:**

```
VPC: NOT IN VPC (needed for Bedrock latency)
Security Groups: N/A
Subnets: N/A
NAT Gateway: N/A
```

**Reserved Concurrency:**

```
Reserved Concurrency: 0 (on-demand scaling)
Provisioned Concurrency: 0 (no always-warm instances)
Max Concurrent Executions: 1000 (account default)
```

**Logging Configuration:**

```
CloudWatch Log Group: /aws/lambda/classify-food-lambda
Log Retention: 30 days
Encryption: KMS (same as DynamoDB)
```

**Layers (Optional):**

```
Lambda Powertools Layer: arn:aws:lambda:us-east-1:017000801446:layer:AWSLambdaPowertoolsNodejsLatest:latest
Custom Monitoring Layer: (if needed for metrics)
```

**Aliases:**

```
LIVE alias → Latest version
DEV alias → Development version
STAGING alias → Pre-release testing
```

**Dead Letter Queue (DLQ):**

```
Type: SQS (optional, for Phase C+)
Queue: ai-lambda-dlq
Enabled: false (not required for Phase C)
```

---

### 2. ocr-expiry-date-lambda

**Basic Configuration:**

```
Function Name: ocr-expiry-date-lambda
Runtime: Node.js 18.x (or 20.x)
Handler: index.handler
Role: ocr-expiry-date-lambda-role (IAM)
Architecture: x86_64
Timeout: 30 seconds
Memory: 512 MB
Ephemeral Storage: 512 MB (default)
```

**Environment Variables:**

```bash
# Bedrock configuration
AWS_REGION=us-east-1
BEDROCK_MODEL_HAIKU=anthropic.claude-3-5-haiku-20241022-v1:0

# DynamoDB configuration
DYNAMODB_TABLE=ai_classifications

# Feature flags (Phase C: switch to false for real Textract)
USE_MOCK_TEXTRACT=false
USE_MOCK_DYNAMODB=false

# Logging
LOG_LEVEL=info
NODE_ENV=production

# Performance
TEXTRACT_TIMEOUT_MS=20000
BEDROCK_FALLBACK_TIMEOUT_MS=20000
DYNAMODB_TIMEOUT_MS=5000
S3_TIMEOUT_MS=5000

# OCR configuration
TEXTRACT_CONFIDENCE_THRESHOLD=0.7
```

**VPC Configuration:**

```
VPC: NOT IN VPC (needed for Textract latency)
```

**Reserved Concurrency:**

```
Reserved Concurrency: 0 (on-demand)
```

**Logging Configuration:**

```
CloudWatch Log Group: /aws/lambda/ocr-expiry-date-lambda
Log Retention: 30 days
```

---

### 3. image-resize-lambda

**Basic Configuration:**

```
Function Name: image-resize-lambda
Runtime: Node.js 18.x (or 20.x)
Handler: index.handler
Role: image-resize-lambda-role (IAM)
Architecture: x86_64
Timeout: 60 seconds (higher than classify, needs Sharp)
Memory: 1024 MB (image processing needs more RAM)
Ephemeral Storage: 1024 MB (for temporary image processing)
```

**Environment Variables:**

```bash
# AWS configuration
AWS_REGION=us-east-1

# S3 configuration
S3_BUCKET=wfl-photos
S3_RESIZED_SUFFIX=-resized

# DynamoDB configuration
DYNAMODB_TABLE=items

# Feature flags
USE_MOCK_S3=false
USE_MOCK_DYNAMODB=false

# Logging
LOG_LEVEL=info
NODE_ENV=production

# Image processing
IMAGE_MAX_WIDTH=1024
IMAGE_QUALITY=70
IMAGE_FORMAT=jpeg

# Performance
S3_TIMEOUT_MS=10000
SHARP_TIMEOUT_MS=30000
```

**VPC Configuration:**

```
VPC: OPTIONAL (needed if DynamoDB in VPC, otherwise not)
VPC Endpoints: S3, DynamoDB (recommended to avoid NAT costs)
```

**Reserved Concurrency:**

```
Reserved Concurrency: 0 (on-demand)
```

**Logging Configuration:**

```
CloudWatch Log Group: /aws/lambda/image-resize-lambda
Log Retention: 30 days
```

**S3 Event Configuration:**

```
Trigger: S3 bucket: wfl-photos
Events: s3:ObjectCreated:*
Filter Rules:
  - Prefix: items/
  - Suffix: .jpg, .png, .webp
Destination: Lambda function (this)
```

---

## IAM Role Configuration

### classify-food-lambda Role

**Trust Policy (AssumeRole):**

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
```

**Permissions Policy:**

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["bedrock:InvokeModel"],
      "Resource": [
        "arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-3-5-haiku-20241022-v1:0",
        "arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-3-5-sonnet-20241022-v2:0"
      ]
    },
    {
      "Effect": "Allow",
      "Action": ["dynamodb:PutItem", "dynamodb:GetItem", "dynamodb:Query"],
      "Resource": "arn:aws:dynamodb:us-east-1:ACCOUNT_ID:table/ai_classifications"
    },
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject"],
      "Resource": "arn:aws:s3:::wfl-photos/items/*"
    },
    {
      "Effect": "Allow",
      "Action": ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"],
      "Resource": "arn:aws:logs:us-east-1:ACCOUNT_ID:log-group:/aws/lambda/classify-food-lambda:*"
    },
    {
      "Effect": "Allow",
      "Action": ["cloudwatch:PutMetricData"],
      "Resource": "*",
      "Condition": {
        "StringEquals": {
          "cloudwatch:namespace": "CustomAI"
        }
      }
    },
    {
      "Effect": "Allow",
      "Action": ["kms:Decrypt", "kms:DescribeKey"],
      "Resource": "arn:aws:kms:us-east-1:ACCOUNT_ID:key/*",
      "Condition": {
        "StringEquals": {
          "kms:ViaService": ["dynamodb.us-east-1.amazonaws.com", "s3.us-east-1.amazonaws.com"]
        }
      }
    }
  ]
}
```

### ocr-expiry-date-lambda Role

**Trust Policy:** (same as above)

**Permissions Policy:**

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["textract:DetectDocumentText"],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": ["bedrock:InvokeModel"],
      "Resource": "arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-3-5-haiku-20241022-v1:0"
    },
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject"],
      "Resource": "arn:aws:s3:::wfl-photos/items/*"
    },
    {
      "Effect": "Allow",
      "Action": ["dynamodb:PutItem", "dynamodb:Query"],
      "Resource": "arn:aws:dynamodb:us-east-1:ACCOUNT_ID:table/ai_classifications"
    },
    {
      "Effect": "Allow",
      "Action": ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"],
      "Resource": "arn:aws:logs:us-east-1:ACCOUNT_ID:log-group:/aws/lambda/ocr-expiry-date-lambda:*"
    },
    {
      "Effect": "Allow",
      "Action": ["cloudwatch:PutMetricData"],
      "Resource": "*",
      "Condition": {
        "StringEquals": {
          "cloudwatch:namespace": "CustomAI"
        }
      }
    }
  ]
}
```

### image-resize-lambda Role

**Trust Policy:** (same)

**Permissions Policy:**

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject"],
      "Resource": "arn:aws:s3:::wfl-photos/items/*"
    },
    {
      "Effect": "Allow",
      "Action": ["s3:PutObject"],
      "Resource": "arn:aws:s3:::wfl-photos/items/*-resized.jpg"
    },
    {
      "Effect": "Allow",
      "Action": ["dynamodb:UpdateItem"],
      "Resource": "arn:aws:dynamodb:us-east-1:ACCOUNT_ID:table/items"
    },
    {
      "Effect": "Allow",
      "Action": ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"],
      "Resource": "arn:aws:logs:us-east-1:ACCOUNT_ID:log-group:/aws/lambda/image-resize-lambda:*"
    }
  ]
}
```

---

## DynamoDB Table Configuration

### Table: ai_classifications

**Key Schema:**

```
Partition Key (PK): userId (String)
Sort Key (SK): classification_id (String, format: "classification-{uuid}")
```

**Attribute Definitions:**

```
userId (String) - Partition key
classification_id (String) - Sort key
createdAt (String) - For GSI
taskType (String) - For filtering
```

**Billing Mode:**

```
Billing Mode: PAY_PER_REQUEST (on-demand)
Read Capacity: Auto-scaling (no manual provisioning)
Write Capacity: Auto-scaling (no manual provisioning)
```

**Global Secondary Indexes (GSI):**

**GSI 1: createdAt-index**

```
Partition Key: createdAt (String, ISO8601 format)
Sort Key: userId (String)
Projection: ALL
Billing: On-demand (inherit from table)
```

**GSI 2: taskType-index (Optional)**

```
Partition Key: taskType (String)
Sort Key: createdAt (String)
Projection: ALL (or KEYS_ONLY for cost savings)
Billing: On-demand
```

**TTL (Time To Live):**

```
Attribute Name: expiresAt (Number, epoch timestamp)
TTL: Enabled (auto-delete records after 90 days)
Set expiresAt = createdAt + 90 days
```

**Point-in-Time Recovery (PITR):**

```
Status: ENABLED
Retention Period: 35 days
Cost: Included in on-demand pricing
```

**Encryption:**

```
Encryption at Rest: KMS (AWS-owned key or customer-managed)
Encryption in Transit: HTTPS (automatic)
Key: Shared with CloudWatch logs
```

**Backup:**

```
Continuous Backups: ENABLED
On-Demand Backups: Manual as needed
AWS Backup: Can be configured separately
```

**Stream Specification (For W8 Sync):**

```
Stream Enabled: YES
Stream View Type: NEW_AND_OLD_IMAGES
Used by: W8 for WatermelonDB sync
Consumers: W8 sync service
```

---

## CloudWatch Configuration

### Log Groups

**classify-food-lambda:**

```
Log Group: /aws/lambda/classify-food-lambda
Retention: 30 days
Encryption: KMS
Search Pattern: All logs
```

**ocr-expiry-date-lambda:**

```
Log Group: /aws/lambda/ocr-expiry-date-lambda
Retention: 30 days
Encryption: KMS
```

**image-resize-lambda:**

```
Log Group: /aws/lambda/image-resize-lambda
Retention: 30 days
Encryption: KMS
```

### Custom Metrics

**Namespace:** `CustomAI`

**Metrics Published by Lambda:**

```
CustomAI/AICallCost          (Unit: None, aggregated Sum)
CustomAI/CacheHitRate        (Unit: Percent, aggregated Average)
CustomAI/InputTokens         (Unit: Count, aggregated Average)
CustomAI/OutputTokens        (Unit: Count, aggregated Average)
CustomAI/ClassificationAccuracy (Unit: Percent, aggregated Average)
CustomAI/LatencyMs           (Unit: Milliseconds, aggregated Average)
```

---

## X-Ray Configuration (Optional, for tracing)

**X-Ray Tracing:**

```
Enabled: false (not required for Phase C, can add for debugging)

If enabled:
- Active Tracing: ON
- Sampling Rate: 10% (0.1)
- X-Ray Service Map visible in AWS Console
```

---

## API Gateway / AppSync Integration

### AppSync Data Source Configuration

**Lambda Data Source for classify-food-lambda:**

```
Name: ClassifyFoodLambda
Type: AWS Lambda
Region: us-east-1
Function ARN: arn:aws:lambda:us-east-1:ACCOUNT:function:classify-food-lambda
Invocation Type: Request-response
Timeout: 30000 ms (match Lambda timeout)
```

**Lambda Data Source for ocr-expiry-date-lambda:**

```
Name: OcrExpiryDateLambda
Type: AWS Lambda
Function ARN: arn:aws:lambda:us-east-1:ACCOUNT:function:ocr-expiry-date-lambda
Timeout: 30000 ms
```

**Resolver Mapping:**

```
Mutation.classifyItemPhoto:
  Type: Lambda
  Data Source: ClassifyFoodLambda
  Request Mapping: $input.arguments
  Response Mapping: $util.parseJson($ctx.result.Payload)

Mutation.ocrExpiryDate:
  Type: Lambda
  Data Source: OcrExpiryDateLambda
  Request Mapping: $input.arguments
  Response Mapping: $util.parseJson($ctx.result.Payload)
```

---

## Performance Targets

### Latency SLA

```
classify-food-lambda:
  P50:  700ms
  P95:  1800ms  (target: <3000ms)
  P99:  2500ms
  Max:  30000ms (timeout)

ocr-expiry-date-lambda:
  P50:  400ms
  P95:  1200ms  (target: <2000ms)
  P99:  1500ms
  Max:  30000ms

Bedrock invocation: 800-1500ms (network latency)
DynamoDB write:     10-50ms
S3 read:            10-50ms
```

### Cost Targets

```
classify-food cost: $0.0009/call (with 95%+ cache hit)
ocr-expiry-date cost: $0.000032/call
image-resize cost: $0.001/call
```

### Error Rate SLA

```
Target: <1% error rate
Alert: >5% errors in 5-minute window
```

---

## Deployment Instructions (W1 CDK)

**Phase C Day 6 - Initial Deployment:**

```bash
# 1. Build Lambda code
cd services/ai/classify-food
npm run build
# Produces: dist/index.js

# 2. Deploy with CDK
cd infra/cdk
npx cdk deploy AiLambdasStack \
  --require-approval=never

# 3. Verify deployment
aws lambda get-function-configuration \
  --function-name classify-food-lambda \
  --region us-east-1

# 4. Run health check
node services/ai/health-check.mjs

# Expected: All 27 checks passing
```

**Phase C Day 6 - Configuration Verification:**

```bash
# 1. Verify environment variables
aws lambda get-function-configuration \
  --function-name classify-food-lambda \
  --query 'Environment.Variables' | jq

# Expected:
# {
#   "AWS_REGION": "us-east-1",
#   "BEDROCK_MODEL_HAIKU": "anthropic.claude-3-5-haiku-20241022-v1:0",
#   "USE_MOCK_BEDROCK": "false",
#   ...
# }

# 2. Verify IAM permissions
aws iam get-role-policy \
  --role-name classify-food-lambda-role \
  --policy-name bedrock-policy

# 3. Verify DynamoDB access
aws lambda invoke \
  --function-name classify-food-lambda \
  --payload '{"arguments": {"photoPath": "s3://...", ...}}' \
  /tmp/test-response.json
```

---

## Rollback Procedure

**If deployment fails:**

```bash
# 1. Identify issue in CloudWatch logs
aws logs tail /aws/lambda/classify-food-lambda --follow

# 2. Fix Lambda code or configuration

# 3. Redeploy with CDK
npx cdk deploy AiLambdasStack

# Alternative: Roll back to previous version
aws lambda update-alias \
  --function-name classify-food-lambda \
  --name LIVE \
  --function-version <previous-version-number>
```

---

**Last Updated**: 2026-04-28  
**Phase C Target**: Day 6 AWS Deployment  
**Prepared by**: W4 AI Team  
**Deployed by**: W1 Infrastructure Team
