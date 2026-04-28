# 🔐 Security Validation Checklist (Phase C Pre-Deployment)

**Purpose**: Verify all IAM policies, encryption, and data protection before production launch  
**Timeline**: Complete before Day 6 deployment  
**Owner**: W1 (CDK) + W4 (AI Lambda review)

---

## IAM Policy Validation

### classify-food-lambda Role

**Required Permissions:**

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
      "Resource": "arn:aws:dynamodb:us-east-1:ACCOUNT:table/ai_classifications"
    },
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject"],
      "Resource": "arn:aws:s3:::wfl-photos/items/*"
    },
    {
      "Effect": "Allow",
      "Action": ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"],
      "Resource": "arn:aws:logs:us-east-1:ACCOUNT:log-group:/aws/lambda/classify-food-lambda:*"
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

**Validation Steps:**

- [ ] No wildcard actions (bedrock:_, s3:_, dynamodb:\*)
- [ ] Resources scoped to specific table/bucket/models
- [ ] No `s3:*` or `s3:PutObject` (read-only for photos)
- [ ] CloudWatch scoped to CustomAI namespace only
- [ ] Logs scoped to specific Lambda log group

### ocr-expiry-date-lambda Role

**Required Permissions:**

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
      "Resource": "arn:aws:dynamodb:us-east-1:ACCOUNT:table/ai_classifications"
    }
  ]
}
```

**Validation Steps:**

- [ ] Textract resource is `*` (service doesn't support resource-level permissions)
- [ ] Bedrock limited to Haiku only (OCR fallback)
- [ ] No unnecessary DynamoDB permissions (PutItem + Query only, no Scan/Delete)
- [ ] S3 read-only (GetObject only)

### image-resize-lambda Role

**Required Permissions:**

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
      "Resource": "arn:aws:dynamodb:us-east-1:ACCOUNT:table/items"
    },
    {
      "Effect": "Allow",
      "Action": ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"],
      "Resource": "arn:aws:logs:us-east-1:ACCOUNT:log-group:/aws/lambda/image-resize-lambda:*"
    }
  ]
}
```

**Validation Steps:**

- [ ] S3 PutObject restricted to `-resized.jpg` suffix only (prevents overwriting originals)
- [ ] DynamoDB UpdateItem only (cannot delete/scan)
- [ ] No permission to write to ai_classifications table
- [ ] Logs scoped to specific Lambda

### AppSync Role

**Required Permissions (for Lambda resolvers):**

- [ ] `lambda:InvokeFunction` on classify-food-lambda ARN
- [ ] `lambda:InvokeFunction` on ocr-expiry-date-lambda ARN
- [ ] `dynamodb:Query` on ai_classifications table (for reading user classifications)

---

## Data Protection

### DynamoDB Encryption

**Verification:**

```bash
aws dynamodb describe-table --table-name ai_classifications \
  --query 'Table.SSEDescription'

# Should return:
# {
#   "Status": "ENABLED",
#   "SSEType": "KMS",
#   "KMSMasterKeyArn": "arn:aws:kms:us-east-1:ACCOUNT:key/..."
# }
```

**Checklist:**

- [ ] Encryption at rest enabled (KMS, not DEFAULT)
- [ ] Point-in-time recovery (PITR) enabled
- [ ] Backup enabled (daily automatic)
- [ ] Versioning NOT enabled (single-version append-only model)

### S3 Encryption

**Verification:**

```bash
aws s3api get-bucket-encryption --bucket wfl-photos
aws s3api get-bucket-versioning --bucket wfl-photos
aws s3api get-bucket-public-access-block --bucket wfl-photos
```

**Checklist:**

- [ ] Server-side encryption enabled (AES-256 or KMS)
- [ ] Versioning enabled (for recovery)
- [ ] Public access blocked (BlockPublicAcls, BlockPublicPolicy, IgnorePublicAcls, RestrictPublicBuckets)
- [ ] No CORS misconfiguration
- [ ] Lifecycle: Delete old versions after 30 days
- [ ] Lifecycle: Delete `-resized` images after 7 days (can regenerate)

### Logs Encryption

**Verification:**

```bash
aws logs describe-log-groups --log-group-name-prefix /aws/lambda/classify-food-lambda
```

**Checklist:**

- [ ] CloudWatch Logs encrypted with KMS
- [ ] Log retention set to 30 days (auto-delete after 30d)
- [ ] No sensitive data in logs (no credentials, no full request bodies)
- [ ] Log group policy restricts who can read logs

---

## Network Security

### VPC Configuration (If Applicable)

**Checklist:**

- [ ] Lambdas NOT in VPC (for Bedrock/Textract latency)
- [ ] If in VPC: NAT Gateway for outbound HTTPS to AWS services
- [ ] Security groups: Outbound HTTPS only (port 443)
- [ ] VPC endpoints for S3, DynamoDB (to avoid NAT costs)

### API Security (AppSync)

**Verification:**

```bash
aws appsync get-graphql-api --api-id YOUR_API_ID \
  --query 'graphqlApi.authenticationType'

# Should return: AMAZON_COGNITO_USER_POOLS or OPENID_CONNECT
```

**Checklist:**

- [ ] Authentication required (not API_KEY or ALLOW_PUBLIC_UNAUTHENTICATED)
- [ ] Authorization enforced per mutation (classifyItemPhoto checks userId)
- [ ] HTTPS only (no HTTP)
- [ ] Rate limiting on mutations (CloudWatch alarm if >10 req/sec per user)

---

## Input Validation & Injection Prevention

### Lambda Input Validation

**Verification** (in services/ai/src/index.ts):

```typescript
// ✅ All inputs validated with Zod
const requestSchema = z.object({
  arguments: z.object({
    photoPath: z.string().regex(/^s3:\/\/[a-z0-9\-._]+\/[a-zA-Z0-9\-._\/]+$/),
    userId: z.string().uuid(),
    householdId: z.string().uuid(),
  }),
});
```

**Checklist:**

- [ ] All inputs validated with Zod (not manual if/else)
- [ ] S3 path regex prevents directory traversal
- [ ] User IDs validated as UUIDs (no arbitrary strings)
- [ ] Photo path only allows lowercase alphanumeric + hyphens (no ../ or \\)
- [ ] No shell commands executed with user input

### Output Sanitization

**Checklist:**

- [ ] JSON responses don't include raw system prompts
- [ ] Error messages don't expose AWS credentials or internal paths
- [ ] Cost calculations shown to user don't leak Bedrock model details
- [ ] Cache hit status shown but not cache content

### SQL Injection (DynamoDB)

**Verification** (ai_classifications writes):

```typescript
// ✅ Using DynamoDB document client (not query builder)
await dynamodb
  .putItem({
    TableName: 'ai_classifications',
    Item: {
      userId: { S: userId }, // Parameterized
      timestamp: { S: new Date().toISOString() },
      classification: { M: response },
    },
  })
  .promise();
```

**Checklist:**

- [ ] All DynamoDB queries use parameterized APIs
- [ ] No string concatenation in query expressions
- [ ] KeyConditionExpression and FilterExpression use :placeholder syntax
- [ ] No eval() or dynamic code execution

---

## Error Handling & Information Disclosure

### Error Messages

**Verification** (in services/ai/src/error-handling.ts):

```typescript
// ❌ BAD: Exposes internal details
throw new Error(`Failed to invoke ${model} with ${JSON.stringify(request)}`);

// ✅ GOOD: User-friendly message only
throw new AIError('CLASSIFICATION_FAILED', 'Unable to classify image. Please try again.');
```

**Checklist:**

- [ ] Error responses don't include stack traces
- [ ] Error messages don't include AWS ARNs, credentials, or model IDs
- [ ] Error codes are generic (CLASSIFICATION_FAILED, not BEDROCK_INVOKE_ERROR)
- [ ] No logging of full request/response payloads to client
- [ ] Logs on server include details, but not returned to client

### CloudWatch Log Redaction

**Verification:**

```bash
# Check logs for sensitive data
aws logs tail /aws/lambda/classify-food-lambda --since 1h | grep -i "password\|secret\|credential"
```

**Checklist:**

- [ ] No credentials logged (AWS keys, API keys, tokens)
- [ ] No full photo S3 paths logged (log pattern, not full paths)
- [ ] No user PII logged beyond userId
- [ ] Cost data logged (ok, not sensitive)
- [ ] Token counts logged (ok, not sensitive)

---

## Rate Limiting & DoS Prevention

### Lambda Concurrency Limits

**Verification:**

```bash
aws lambda get-function-concurrency --function-name classify-food-lambda
aws lambda get-account-settings --query 'AccountUsage'

# Concurrent executions limit: 1000 default
# Set reserved concurrency: 100 per Lambda (to prevent runaway costs)
```

**Checklist:**

- [ ] Reserved concurrency set to 100 (or lower) per Lambda
- [ ] Provisioned concurrency = 0 (scale on demand, not always-on)
- [ ] Lambda timeout 30s (prevents hanging connections)
- [ ] API Gateway throttling set (if using)

### AppSync Rate Limiting

**Checklist:**

- [ ] Query complexity limits set (prevent expensive queries)
- [ ] Rate limiting: Max 10 requests/second per authenticated user
- [ ] Burst allowance: Max 100 requests over 10 seconds
- [ ] Alert if user exceeds rate limit (CloudWatch alarm)

### Bedrock Rate Limiting

**Checklist:**

- [ ] Account limit: 20,000 requests/minute (monitored)
- [ ] Circuit breaker implemented (in services/ai/src/bedrock-client.ts)
- [ ] Fallback to mock client if rate limited
- [ ] Alerts for approaching rate limit (>15,000 req/min)

---

## Dependency & Supply Chain Security

### Dependencies Audit

**Verification:**

```bash
cd services/ai
npm audit

# Should show: 0 vulnerabilities
```

**Checklist:**

- [ ] npm audit shows 0 vulnerabilities
- [ ] No high/critical severity deps
- [ ] Lock files committed (package-lock.json)
- [ ] Dependencies pinned to exact versions (not ^1.0.0)
- [ ] No untracked/dev deps in production bundle

### Third-Party Services

**Checklist:**

- [ ] Bedrock: AWS-owned, no third-party risk
- [ ] Textract: AWS-owned, no third-party risk
- [ ] Sharp (image resize): MIT licensed, widely used, monitored
- [ ] Zod (validation): MIT licensed, widely used
- [ ] AWS SDK: Official SDK, monthly security updates

---

## Compliance & Audit

### GDPR Compliance (If Applicable)

**Checklist:**

- [ ] User data retention: Delete after 30 days (auto via DynamoDB TTL)
- [ ] User deletion: Cascade delete from ai_classifications on user delete
- [ ] Data export: API endpoint to export user classifications
- [ ] Consent: Terms of service mentions AI classification
- [ ] No tracking beyond necessary (no user agent, no IP logging)

### HIPAA Compliance (If Applicable)

**Checklist:**

- [ ] Encryption in transit (HTTPS only)
- [ ] Encryption at rest (KMS)
- [ ] Audit logging enabled (CloudTrail)
- [ ] Access controls (IAM roles)
- [ ] Data integrity (no tampering detection needed for food classification)

### CCPA Compliance (California)

**Checklist:**

- [ ] "Do not sell my data" endpoint
- [ ] User can request all personal data
- [ ] User can delete all personal data
- [ ] Privacy policy updated

---

## Post-Deployment Validation

### Day 6 Security Audit

**Steps:**

1. Run security group audit (verify no overly permissive rules)
2. Check CloudTrail for any unauthorized access attempts
3. Verify all Lambda env vars are set (not empty/hardcoded)
4. Test error handling (trigger INVALID_INPUT, verify no stack traces returned)
5. Scan S3 bucket for public objects (should be 0)

**Command:**

```bash
# Check for public S3 objects
aws s3api list-objects-v2 --bucket wfl-photos \
  --output text --query 'Contents[].Key' | \
  while read obj; do
    acl=$(aws s3api get-object-acl --bucket wfl-photos --key "$obj" | \
      grep -c 'AllUsers\|AuthenticatedUsers')
    if [ $acl -gt 0 ]; then echo "❌ PUBLIC: $obj"; fi
  done
```

### Week 1 Security Review

**Weekly Checklist:**

- [ ] Review CloudTrail for unusual API calls
- [ ] Check CloudWatch for error spikes (could indicate attack)
- [ ] Audit IAM role assignments (no new roles created)
- [ ] Review S3 access logs for unusual patterns
- [ ] Check DynamoDB for unusual query patterns (scans = bad)

---

## Security Incident Response

### If Credentials Compromised

1. **Immediate (< 5 min)**
   - Rotate AWS credentials
   - Invalidate all sessions
   - Disable Lambda execution role temporarily

2. **Within 1 hour**
   - Review CloudTrail logs for unauthorized access
   - Check if any data was exfiltrated
   - Update security group rules

3. **Within 24 hours**
   - Audit all IAM roles and policies
   - Review S3 bucket access logs
   - Notify affected users if data was exposed

### If Data Breach Suspected

1. **Immediate**
   - Isolate affected Lambda (disable execution)
   - Enable DynamoDB backup (PITR to point before incident)
   - Alert security team

2. **Investigation**
   - Query CloudTrail for what data was accessed
   - Review DynamoDB transaction logs
   - Check if exported data contains PII

3. **Notification**
   - Notify users if PII was exposed
   - Follow GDPR/CCPA breach notification requirements
   - Post-incident review with team

---

## Security Sign-Off

- [ ] All IAM policies reviewed and least-privilege enforced
- [ ] Encryption at rest enabled (KMS for DynamoDB/S3)
- [ ] Encryption in transit enforced (HTTPS only)
- [ ] Input validation with Zod on all Lambda inputs
- [ ] Error messages sanitized (no internal details)
- [ ] Sensitive data not logged
- [ ] Rate limiting configured (Lambda concurrency, AppSync, Bedrock)
- [ ] Dependencies audited (npm audit = 0 vulnerabilities)
- [ ] No public S3 objects
- [ ] CloudTrail enabled for audit
- [ ] Incident response procedures documented

**Security Review Approval:**

- [ ] Approved by: **\*\*\*\***\_**\*\*\*\*** (Security Lead)
- [ ] Date: **\*\*\*\***\_**\*\*\*\***
- [ ] Ready for: Production Launch Day 6

---

**Last Updated**: 2026-04-27  
**Next Review**: Weekly during Phase C  
**Owner**: W4 AI Team + Security Lead
