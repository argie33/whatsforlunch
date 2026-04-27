# 🚨 Incident Response Playbook (Phase C Production)

**Purpose**: Quick resolution steps for common AI Lambda issues in production  
**Audience**: On-call engineers, DevOps team  
**Updated**: 2026-04-27

---

## Incident Severity Levels

| Level | Impact | SLA | Example |
|-------|--------|-----|---------|
| P1 (Critical) | All users affected | 15 min response, 30 min fix | Lambda throwing errors, Bedrock unavailable |
| P2 (High) | Most users affected | 30 min response, 2 hour fix | Cost spike, accuracy drop, latency > 5s |
| P3 (Medium) | Some users affected | 2 hour response, 4 hour fix | Cache not working, quota enforcement failing |
| P4 (Low) | Minimal impact | Next business day | Logging issues, minor latency increase |

---

## Quick Diagnostics (First 5 Minutes)

### Check CloudWatch Dashboard
```bash
# 1. Open CloudWatch console
# 2. Go to: Dashboards > ai-lambdas
# 3. Look at:
#    - Invocations: Should show steady traffic
#    - Duration: Should be within P95 target
#    - Errors: Should be <1%
#    - Cost: Should match projection (no spikes)
#    - CacheHitRate: Should be >90%
```

### Check Lambda Logs
```bash
aws logs tail /aws/lambda/classify-food-lambda --follow --since 5m

# Look for:
# - ERROR lines (error code + message)
# - WARN lines (degraded performance)
# - Missing log entries (Lambda not executing)
```

### Check DynamoDB Metrics
```bash
aws cloudwatch get-metric-statistics \
  --namespace AWS/DynamoDB \
  --metric-name ConsumedWriteCapacityUnits \
  --dimensions Name=TableName,Value=ai_classifications \
  --start-time $(date -u -d '5 min ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 60 \
  --statistics Maximum,Average
```

### Run Health Check
```bash
cd services/ai
node health-check.mjs

# Output shows:
# - ✅ All services healthy → likely a data/code issue
# - ❌ Bedrock service → API issue, call AWS support
# - ❌ DynamoDB slow → throttling, increase capacity
# - ❌ Latency exceeded → cold start or CPU bottleneck
```

---

## Incident: Lambda Errors (P1)

**Symptoms**: Invocation errors > 5%, error rate increasing

### Step 1: Identify Error Type
```bash
# From CloudWatch logs, look for error pattern
# Common errors:
# - "rate limit" → Bedrock rate limited (P2)
# - "InvalidInput" → Bad request data (P3)
# - "Timeout" → Bedrock slow (P2)
# - "DynamoDB throttled" → Capacity exceeded (P1)
# - "AccessDenied" → IAM permissions issue (P1)
```

### Step 2: If DynamoDB Throttled
```bash
# 1. Check current throughput
aws dynamodb describe-table --table-name ai_classifications \
  --query 'Table.BillingModeSummary'

# 2. If using provisioned mode, increase capacity
aws dynamodb update-table \
  --table-name ai_classifications \
  --billing-mode PAY_PER_REQUEST

# Alternative: Scale provisioned capacity
aws dynamodb update-table \
  --table-name ai_classifications \
  --provisioned-throughput ReadCapacityUnits=400,WriteCapacityUnits=400
```

### Step 3: If AccessDenied
```bash
# 1. Check Lambda IAM role
aws iam get-role-policy --role-name classify-food-lambda-role \
  --policy-name bedrock-policy

# 2. If missing, attach policy:
aws iam put-role-policy --role-name classify-food-lambda-role \
  --policy-name bedrock-policy \
  --policy-document file://bedrock-policy.json
```

### Step 4: If Bedrock Timeout
```bash
# 1. Check Bedrock service status (AWS console)
# 2. If service healthy but timeouts continue:
#    - Increase Lambda timeout from 30s → 60s
aws lambda update-function-configuration \
  --function-name classify-food-lambda \
  --timeout 60

# 3. Monitor improvement
aws logs tail /aws/lambda/classify-food-lambda --follow
```

### Resolution Verification
```bash
# After fix, monitor for 5 minutes
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Errors \
  --dimensions Name=FunctionName,Value=classify-food-lambda \
  --start-time $(date -u -d '5 min ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 60 \
  --statistics Sum

# Should show error rate declining to <1%
```

---

## Incident: Bedrock Rate Limiting (P2)

**Symptoms**: Latency spike, error code `BEDROCK_RATE_LIMIT`, cost spike

### Step 1: Check Current Usage
```bash
# Get invocations in last hour
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Invocations \
  --dimensions Name=FunctionName,Value=classify-food-lambda \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Sum
```

### Step 2: Check Bedrock Quota
```bash
# Check Bedrock rate limits
# (Currently: 20,000 requests/minute for Haiku per region)
# If exceeding, implement backoff:

# Temporary mitigation: Add jitter to retry
# In Lambda code: exponential backoff with 100-5000ms delays
```

### Step 3: Implement Circuit Breaker
```bash
# If rate limiting persists, activate circuit breaker:
# - Return cached response for 30 seconds
# - Gradually reduce request rate by 10% every 30s
# - Resume when error rate drops below 1%
```

### Step 4: Fallback Strategy
```typescript
// If Bedrock rate limited, use mock client temporarily
const client = errorRate > 0.05 
  ? new BedrockMockClient()  // Fallback to mock
  : new BedrockClient();       // Resume production

// Users get instant response (mock)
// No delays, no lost requests
```

### Resolution
```bash
# Monitor error rate
aws logs tail /aws/lambda/classify-food-lambda --follow \
  --filter-pattern "BEDROCK_RATE_LIMIT"

# Should show rate limit errors decreasing
# Within 5 minutes, should return to <1% error rate
```

---

## Incident: Cost Spike (P2)

**Symptoms**: Daily cost > 2x projection, high token usage

### Step 1: Check Cost Dashboard
```bash
# AWS Cost Explorer → Filter by service → Bedrock
# Look for:
# - Abnormal usage pattern
# - Cache hit rate dropped
# - Token count per call increased
```

### Step 2: Analyze Token Usage
```bash
# From CloudWatch logs:
# [INFO] Tokens: input=5000, output=500, cache_hit=true

# Calculate cost: (5000 * 0.8 / 1M) + (500 * 4.0 / 1M) = $0.0044

# If input tokens > 10,000:
# - Check system prompt size (should be <2000 tokens)
# - Check user input (should be <500 tokens)
# - Trim unnecessary context
```

### Step 3: Check Cache Hit Rate
```bash
# From CloudWatch metrics:
# CacheHitRate should be >90%

# If <50%, check:
# - Are cache keys changing per request? (should be stable)
# - Is system prompt consistent? (should not vary)
# - Are we hitting max cache age (5 min)?

# Fix: Ensure stable cache keys
```

### Step 4: Enable Cost Alerts
```bash
# Set budget alarm
aws budgets create-budget \
  --account-id $(aws sts get-caller-identity --query Account --output text) \
  --budget '{
    "BudgetName": "AI-Lambda-Daily-Limit",
    "BudgetLimit": { "Amount": "10", "Unit": "USD" },
    "TimeUnit": "DAILY",
    "BudgetType": "COST"
  }'
```

---

## Incident: Accuracy Drop (P3)

**Symptoms**: Classification accuracy < 90%, OCR accuracy < 95%

### Step 1: Run Sample Evaluation
```bash
# Run quick eval on 10 random examples
cd services/ai/evals
node generate-test-data.mjs 10 5

# Run eval
npx ts-node classify-food/eval.ts
npx ts-node ocr-expiry-date/eval.ts

# Check accuracy against baseline (92%, 96%)
```

### Step 2: Check Model Changes
```bash
# Verify model version hasn't changed
aws lambda get-function-configuration \
  --function-name classify-food-lambda \
  --query 'Environment.Variables' | grep BEDROCK_MODEL

# Expected: anthropic.claude-3-5-haiku-20241022-v1:0

# If changed, rollback to previous version:
aws lambda update-function-code \
  --function-name classify-food-lambda \
  --s3-bucket wfl-lambdas \
  --s3-key classify-food-v1.2.0.zip
```

### Step 3: Check Prompt Version
```bash
# In CloudWatch logs, look for:
# [INFO] Prompt version: 1

# If version changed recently, may have degraded accuracy
# Rollback to previous prompt version in code
```

### Step 4: Validate Ground Truth
```bash
# Check if ground-truth dataset is representative
# Sample 20 recent classifications and manually verify

# If 3+ are wrong, may indicate:
# - Model degradation
# - Dataset shift (different food types)
# - Bedrock behavior change
```

### Resolution
```bash
# If accuracy remains low:
# 1. Increase temperature (more creative, but might be less accurate)
# 2. Add more examples to prompt (but increases cost)
# 3. Fine-tune system prompt based on failures
# 4. Consider switching to Sonnet (more capable but 3.75x cost)
```

---

## Incident: High Latency (P2)

**Symptoms**: P95 latency > 5s, user complaints about slowness

### Step 1: Check Bedrock Latency
```bash
# From X-Ray trace or CloudWatch Insights:
# Look for Bedrock invoke time

# If >3s:
# - Check Bedrock service status
# - May indicate overload or model timeout
# - Implement request timeout of 25s (5s buffer before Lambda 30s timeout)
```

### Step 2: Check Cold Starts
```bash
# From CloudWatch logs, look for:
# [INFO] Lambda initialization duration: 2500ms

# If cold start > 1s:
# - Enable Lambda provisioned concurrency (minimum 1)
aws lambda put-provisioned-concurrency-config \
  --function-name classify-food-lambda \
  --provisioned-concurrent-executions 1 \
  --qualifier LIVE
```

### Step 3: Check DynamoDB Latency
```bash
# From X-Ray trace:
# Look for DynamoDB write time

# If >500ms:
# - Check if table is being scanned (slow)
# - Use query with partition key only
# - Verify indexes are in use
```

### Step 4: Profile CPU Usage
```bash
# Check if Lambda memory is insufficient
# Increase from 512MB → 1024MB
aws lambda update-function-configuration \
  --function-name classify-food-lambda \
  --memory-size 1024

# Monitor latency improvement
```

---

## Incident: Quota Enforcement Failing (P3)

**Symptoms**: Users exceeding daily quota limits, no enforcement

### Step 1: Check Quota Table
```bash
# Verify quota is being tracked
aws dynamodb get-item \
  --table-name WFL-Main \
  --key '{"PK":{"S":"QUOTA#user-123#classify_food"}}'

# Should show today's usage count
```

### Step 2: Check Quota Reset Logic
```bash
# Quota should reset daily at midnight UTC
# Verify in Lambda code:

// Lambda handler
const today = new Date().toISOString().split('T')[0];
const quotaKey = `QUOTA#${userId}#${taskType}#${today}`;

// Should create new quota entry each day
```

### Step 3: Reset Quota Manually (If Needed)
```bash
# Delete stale quota entries
aws dynamodb delete-item \
  --table-name WFL-Main \
  --key '{"PK":{"S":"QUOTA#user-123#classify_food#2026-04-26"}}'

# Will trigger new quota on next request
```

---

## Post-Incident Actions

### For All Incidents
1. [ ] Document root cause in incident log
2. [ ] Update runbook if steps were unclear
3. [ ] Add automated alert if not already present
4. [ ] Review logs for similar issues in past 7 days
5. [ ] Brief team in next standup
6. [ ] Schedule follow-up if fix was temporary

### Update Monitors
```bash
# If new issue detected:
# Add CloudWatch alarm
aws cloudwatch put-metric-alarm \
  --alarm-name classify-food-error-rate-high \
  --alarm-description "Alert if error rate > 5%" \
  --metric-name Errors \
  --namespace AWS/Lambda \
  --statistic Sum \
  --period 300 \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold \
  --alarm-actions arn:aws:sns:us-east-1:ACCOUNT:ai-alerts
```

---

## On-Call Schedule

| Time | Owner | Escalation |
|------|-------|-----------|
| Business hours | AI team lead | CTO |
| After hours | On-call rotation | AI team lead + CTO |
| Critical (24/7) | Whoever answers | All hands |

### Escalation Criteria
- [ ] Error rate > 10% for > 5 minutes
- [ ] Cost spike > 5x daily projection
- [ ] Accuracy drop > 10% from baseline
- [ ] All Lambdas unresponsive
- [ ] Data corruption suspected

---

## Recovery Time Objectives (RTO)

| Incident | RTO | Notes |
|----------|-----|-------|
| Lambda errors | 15 min | Quick fix, or fallback to mock |
| Bedrock rate limit | 30 min | Backoff + retry, or circuit breaker |
| Cost spike | 1 hour | Analyze + optimize |
| Accuracy drop | 2 hours | Investigate + rollback if needed |
| DynamoDB issues | 30 min | Increase capacity or migrate |

---

## Monitoring & Alerting Setup

### Essential Alerts
```bash
# 1. Error rate > 5%
# 2. P95 latency > 3s (classify) or 2s (ocr)
# 3. Cost > $5/day
# 4. Cache hit rate < 80%
# 5. DynamoDB throttle
# 6. Lambda timeout
# 7. Bedrock availability
```

### Dashboard Refresh
- Real-time: Every 5 seconds
- Trends: Every 1 minute
- Historical: Every 5 minutes

---

## Contact List

| Role | Name | Slack | Phone |
|------|------|-------|-------|
| AI Team Lead | [Name] | @ai-lead | +1-XXX-XXX-XXXX |
| DevOps Lead | [Name] | @devops-lead | +1-XXX-XXX-XXXX |
| CTO | [Name] | @cto | +1-XXX-XXX-XXXX |
| AWS Support | Enterprise | N/A | 1-800-AMAZON-1 |

---

## Testing Incident Response

### Monthly Drill
- Simulate Bedrock outage (use mock client)
- Measure response time to identify issue
- Verify fix resolves issue
- Document learnings

### Automated Tests
```bash
# Run health check daily
0 0 * * * cd /home/deploy/services/ai && node health-check.mjs

# Run evals weekly
0 2 * * 0 cd /home/deploy/services/ai && npx ts-node evals/classify-food/eval.ts
```

---

**Last Updated**: 2026-04-27  
**Next Review**: 2026-05-27 (monthly)  
**Version**: 1.0

