# WhatsFresh Production Setup Guide

## Phase: Wave 1 Polish → Production Ready

This guide covers production setup for Wave 1 features: photo uploads, food classification, and image serving.

---

## 1. Image CDN Setup (CloudFront + S3)

### 1.1 Create S3 Bucket for Images

```bash
aws s3api create-bucket \
  --bucket wfl-images-prod \
  --region us-east-1
```

### 1.2 Configure S3 for CloudFront

```bash
# Block public access
aws s3api put-public-access-block \
  --bucket wfl-images-prod \
  --public-access-block-configuration \
  "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket wfl-images-prod \
  --versioning-configuration Status=Enabled

# Set CORS for uploads
aws s3api put-bucket-cors --bucket wfl-images-prod --cors-configuration '{
  "CORSRules": [{
    "AllowedOrigins": ["*"],
    "AllowedMethods": ["GET", "PUT", "HEAD"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3000
  }]
}'
```

### 1.3 Create CloudFront Distribution

1. Go to AWS CloudFront Console
2. Create Distribution
3. Origin: Select `wfl-images-prod.s3.us-east-1.amazonaws.com`
4. Origin Access Identity: Create new OAI for S3
5. Cache Behavior:
   - Path: `/resize/*` → Lambda@Edge for image resizing
   - TTL: 31536000 (1 year, images are immutable)
6. Get domain: `d1234abcd.cloudfront.net`

### 1.4 Set Environment Variables

```bash
# In your deployment CI/CD (GitHub Actions, etc.)
EXPO_PUBLIC_CDN_DOMAIN=d1234abcd.cloudfront.net

# For Lambda (image-resize service)
IMAGE_BUCKET=wfl-images-prod
CLOUDFRONT_DOMAIN=d1234abcd.cloudfront.net
```

---

## 2. Classification Logging to S3

### 2.1 Create S3 Bucket for Classification Logs

```bash
aws s3api create-bucket \
  --bucket wfl-classification-logs-prod \
  --region us-east-1

# Lifecycle: Move to Glacier after 90 days
aws s3api put-bucket-lifecycle-configuration \
  --bucket wfl-classification-logs-prod \
  --lifecycle-configuration '{
    "Rules": [{
      "Status": "Enabled",
      "Prefix": "classifications/",
      "Transitions": [{
        "Days": 30,
        "StorageClass": "STANDARD_IA"
      }, {
        "Days": 90,
        "StorageClass": "GLACIER"
      }],
      "Expiration": {
        "Days": 2555
      }
    }]
  }'
```

### 2.2 Set Lambda Environment Variables

```bash
CLASSIFICATION_LOGS_BUCKET=wfl-classification-logs-prod
```

---

## 3. Food Classification (Bedrock + Claude Fallback)

### 3.1 Enable Bedrock Models

```bash
# In AWS Console: Bedrock → Model access
# Request access to:
# - Claude 3 Haiku (for classification)
# - Claude 3 Sonnet (optional, for complex cases)
```

### 3.2 Set Claude API Key

```bash
# In GitHub Secrets or your deployment system
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxx
```

### 3.3 Lambda Configuration

```bash
# In CDK or CloudFormation:
# classify-food Lambda should have:
# - IAM: bedrock:InvokeModel on Claude models
# - Timeout: 30 seconds
# - Memory: 512 MB
# - Environment:
#   - ANTHROPIC_API_KEY (for fallback)
#   - CLASSIFICATION_LOGS_BUCKET
#   - DYNAMODB_TABLE
```

---

## 4. DynamoDB Classification Audit Trail

### 4.1 Verify Table Setup

```bash
# Table should exist with:
aws dynamodb describe-table --table-name wfl-main-prod

# TTL configured for cleanup (90 days)
# GSI: AICLASS#householdId → for fast queries
```

### 4.2 Monitoring

```bash
# CloudWatch Metrics:
# - classify-food Lambda: Duration, Errors, Throttles
# - DynamoDB: Consumed capacity, throttles
# - S3: Upload success rate (CloudTrail)
```

---

## 5. Verification Checklist

- [ ] S3 image bucket created and CORS configured
- [ ] CloudFront distribution active (note domain)
- [ ] Classification logs bucket with lifecycle policies
- [ ] Bedrock model access requested and approved
- [ ] Environment variables set in deployment system
- [ ] classify-food Lambda has Bedrock + Claude permissions
- [ ] DynamoDB audit trail table has TTL enabled
- [ ] CloudWatch alarms configured for failures
- [ ] Test photo upload end-to-end
- [ ] Test food classification with Bedrock
- [ ] Verify S3 export contains classification logs
- [ ] Check CloudFront serving images (cache hits)

---

## 6. Post-Deployment Monitoring

### CloudWatch Alarms

```bash
# Create alarms for:
# - classify-food Lambda errors > 1% of requests
# - Classification S3 export failures
# - Image upload failures > 5%
# - DynamoDB throttles
# - CloudFront 5xx errors
```

### Logs to Monitor

```bash
# CloudWatch Logs:
# /aws/lambda/classify-food
# /aws/lambda/uploadImage
# /aws/lambda/deleteAccount
# /aws/lambda/exportData

# Key metrics:
# - Bedrock fallback rate (should be < 1%)
# - Classification latency (p99 < 3s)
# - Cache hit ratio on CloudFront (target: > 90%)
```

---

## 7. Cost Estimation

| Service                | Monthly Estimate | Notes                  |
| ---------------------- | ---------------- | ---------------------- |
| CloudFront             | $5-20            | 1TB/month egress       |
| S3 (images)            | $5-15            | 1TB storage + requests |
| S3 (logs)              | $2-5             | 100GB logs/month       |
| Lambda (classify-food) | $10-30           | ~50k invocations       |
| DynamoDB (on-demand)   | $5-10            | Light read/write       |
| **Total**              | **$27-80**       | Scales with usage      |

---

## 8. Rollback Plan

If issues occur:

1. **Image Upload Fails**: Route to backup S3 bucket, keep serving from CloudFront
2. **Bedrock Fails**: Claude API fallback handles automatically
3. **S3 Export Fails**: Classifications still logged to DynamoDB (primary)
4. **CloudFront Down**: Serve from S3 directly (slower, but functional)

---

## Next Steps

After Wave 1 polish is complete:

- [ ] Wave 2: Household sync, recipe ratings
- [ ] Wave 2: Preference learning (ML pipeline from S3 logs)
- [ ] Wave 3: Analytics dashboard
- [ ] Store submission (App Store, Play Store)
