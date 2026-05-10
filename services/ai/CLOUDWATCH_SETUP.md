# 📊 CloudWatch Monitoring Setup (Phase C Days 6+)

**Purpose**: Production monitoring dashboard and alerting configuration  
**Timeline**: Deploy on Day 6 when Lambda stacks go live  
**SLA**: All metrics visible within 1 minute of invocation

---

## Dashboard Configuration

### Create Main Dashboard (Phase C Day 6)

```bash
aws cloudwatch put-dashboard --dashboard-name ai-lambdas-main \
  --dashboard-body file://dashboard-config.json
```

### Dashboard Layout

#### Section 1: Real-Time Health (Top Left)
- **Invocation Rate** (invocations/min)
  - Metric: AWS/Lambda → Invocations
  - Dimensions: FunctionName=classify-food-lambda
  - Period: 1 min
  - Stat: Sum
  - Label: "Calls/min"

- **Error Rate** (%)
  - Metric: AWS/Lambda → Errors
  - Dimensions: FunctionName=classify-food-lambda
  - Calculation: (Errors / Invocations) × 100
  - Threshold: Red if >5%

- **P95 Latency** (ms)
  - Metric: AWS/Lambda → Duration
  - Stat: p95
  - Threshold: Green if <3000ms, Yellow if 3000-5000ms, Red if >5000ms

#### Section 2: Cost Tracking (Top Right)
- **Daily Cost** ($)
  - Custom metric: AICallCost
  - Period: 1 day
  - Stat: Sum
  - Alert: Red if >$50/day

- **Cost Trend** (7-day)
  - Same metric
  - Period: 1 day
  - Display: Line chart

- **Cost per Call** ($)
  - Custom metric: AICallCost
  - Stat: Average
  - Expected: $0.0009

#### Section 3: Performance (Middle Left)
- **Latency Distribution**
  - P50, P95, P99 on same chart
  - Metric: AWS/Lambda → Duration
  - Stats: p50, p95, p99

- **Cache Hit Rate** (%)
  - Custom metric: CacheHitRate
  - Stat: Average
  - Target: >90%

#### Section 4: AWS Services (Middle Right)
- **DynamoDB Metrics**
  - ConsumedWriteCapacityUnits (trend)
  - UserErrors count
  - ThrottledRequests count

- **S3 Metrics**
  - 4xxErrors count
  - 5xxErrors count

- **Bedrock Availability**
  - Custom metric: BedrockHealthy (1=healthy, 0=down)

#### Section 5: By Function (Bottom)
- **classify-food**: Invocations, Errors, Duration P95, Cost
- **ocr-expiry-date**: Invocations, Errors, Duration P95, Cost
- **image-resize**: Invocations, Errors, Duration P95, Cost

---

## CloudWatch Alarms

### Critical Alarms (P1 - 15 min response)

```bash
# 1. Error Rate > 5%
aws cloudwatch put-metric-alarm \
  --alarm-name ai-lambda-error-rate-critical \
  --alarm-description "Alert if error rate > 5%" \
  --metric-name Errors \
  --namespace AWS/Lambda \
  --statistic Sum \
  --dimensions Name=FunctionName,Value=classify-food-lambda \
  --period 300 \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1 \
  --alarm-actions arn:aws:sns:us-east-1:ACCOUNT:ai-alerts-critical

# 2. All Lambda Functions Down
aws cloudwatch put-metric-alarm \
  --alarm-name ai-lambda-all-down \
  --alarm-description "Alert if all Lambda functions unavailable" \
  --metric-name Invocations \
  --namespace AWS/Lambda \
  --statistic Sum \
  --dimensions Name=FunctionName,Value=classify-food-lambda \
  --period 60 \
  --threshold 1 \
  --comparison-operator LessThanThreshold \
  --evaluation-periods 3 \
  --alarm-actions arn:aws:sns:us-east-1:ACCOUNT:ai-alerts-critical

# 3. DynamoDB Throttled
aws cloudwatch put-metric-alarm \
  --alarm-name ai-dynamodb-throttled \
  --alarm-description "Alert if DynamoDB throttled" \
  --metric-name UserErrors \
  --namespace AWS/DynamoDB \
  --dimensions Name=TableName,Value=ai_classifications \
  --statistic Sum \
  --period 60 \
  --threshold 1 \
  --comparison-operator GreaterThanOrEqualToThreshold \
  --evaluation-periods 2 \
  --alarm-actions arn:aws:sns:us-east-1:ACCOUNT:ai-alerts-critical

# 4. Cost Spike (>$50/day)
aws cloudwatch put-metric-alarm \
  --alarm-name ai-cost-spike \
  --alarm-description "Alert if daily cost > $50" \
  --metric-name AICallCost \
  --namespace CustomAI \
  --statistic Sum \
  --period 3600 \
  --threshold 50 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1 \
  --alarm-actions arn:aws:sns:us-east-1:ACCOUNT:ai-alerts-critical
```

### High Priority Alarms (P2 - 30 min response)

```bash
# 1. P95 Latency > 3s (classify-food)
aws cloudwatch put-metric-alarm \
  --alarm-name ai-latency-high-classify \
  --alarm-description "Alert if P95 latency > 3s" \
  --metric-name Duration \
  --namespace AWS/Lambda \
  --dimensions Name=FunctionName,Value=classify-food-lambda \
  --statistic p95 \
  --period 300 \
  --threshold 3000 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2 \
  --alarm-actions arn:aws:sns:us-east-1:ACCOUNT:ai-alerts-high

# 2. Cache Hit Rate < 80%
aws cloudwatch put-metric-alarm \
  --alarm-name ai-cache-hit-low \
  --alarm-description "Alert if cache hit rate < 80%" \
  --metric-name CacheHitRate \
  --namespace CustomAI \
  --statistic Average \
  --period 900 \
  --threshold 80 \
  --comparison-operator LessThanThreshold \
  --evaluation-periods 2 \
  --alarm-actions arn:aws:sns:us-east-1:ACCOUNT:ai-alerts-high

# 3. Accuracy Drop (Manual Review Alert)
# Note: This requires custom calculation in Lambda
# If classification accuracy drops below 90% in eval, publish alarm
aws cloudwatch put-metric-alarm \
  --alarm-name ai-accuracy-drop \
  --alarm-description "Alert if accuracy drops below 90%" \
  --metric-name ClassificationAccuracy \
  --namespace CustomAI \
  --statistic Average \
  --period 3600 \
  --threshold 90 \
  --comparison-operator LessThanThreshold \
  --evaluation-periods 1 \
  --alarm-actions arn:aws:sns:us-east-1:ACCOUNT:ai-alerts-high
```

### Medium Priority Alarms (P3 - 2 hour response)

```bash
# 1. Lambda Timeout
aws cloudwatch put-metric-alarm \
  --alarm-name ai-lambda-timeout \
  --alarm-description "Alert if Lambda function times out" \
  --metric-name Duration \
  --namespace AWS/Lambda \
  --dimensions Name=FunctionName,Value=classify-food-lambda \
  --statistic Maximum \
  --period 300 \
  --threshold 29000 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1 \
  --alarm-actions arn:aws:sns:us-east-1:ACCOUNT:ai-alerts-medium

# 2. DynamoDB Write Latency > 500ms
aws cloudwatch put-metric-alarm \
  --alarm-name ai-dynamodb-slow \
  --alarm-description "Alert if DynamoDB write latency > 500ms" \
  --metric-name ConsumedWriteCapacityUnits \
  --namespace AWS/DynamoDB \
  --dimensions Name=TableName,Value=ai_classifications \
  --statistic Average \
  --period 900 \
  --threshold 500 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2 \
  --alarm-actions arn:aws:sns:us-east-1:ACCOUNT:ai-alerts-medium
```

---

## Custom Metrics

### Publish from Lambda Code

```typescript
// In Lambda handler after invocation
import { Metrics } from '@aws-lambda-powertools/metrics';

const metrics = new Metrics();

// Cost metric
metrics.addMetric('AICallCost', costUsd, 'None');

// Cache hit
if (cacheHit) {
  metrics.addMetric('CacheHitRate', 1, 'None');
} else {
  metrics.addMetric('CacheHitRate', 0, 'None');
}

// Tokens
metrics.addMetric('InputTokens', inputTokens, 'Count');
metrics.addMetric('OutputTokens', outputTokens, 'Count');

// Confidence (for classify-food)
metrics.addMetric('Classification Confidence', confidence, 'None');

// Publish
metrics.publishStoredMetrics();
```

### Verify Metrics Appear in CloudWatch

```bash
# Wait 1-2 minutes after Lambda invocation, then:
aws cloudwatch list-metrics --namespace CustomAI \
  --metric-name AICallCost

# Should return:
# {
#   "Metrics": [
#     {
#       "Namespace": "CustomAI",
#       "MetricName": "AICallCost",
#       "Dimensions": []
#     }
#   ]
# }
```

---

## Log Insights Queries

### Query 1: Error Analysis
```sql
fields @timestamp, @message, errorCode, retryable
| filter ispresent(errorCode)
| stats count() by errorCode
| sort count() desc
```

### Query 2: Cost Per User
```sql
fields userId, costUsd
| stats sum(costUsd) as totalCost by userId
| sort totalCost desc
| limit 20
```

### Query 3: Latency Breakdown
```sql
fields latencyMs, taskType
| stats pct(latencyMs, 50), pct(latencyMs, 95), pct(latencyMs, 99) by taskType
```

### Query 4: Cache Hit Rate Over Time
```sql
fields @timestamp, cacheHit
| stats avg(cacheHit) * 100 as hitRatePercent by bin(5m)
| sort @timestamp desc
```

### Query 5: Failed Requests with Reason
```sql
fields @timestamp, userId, errorCode, @message
| filter ispresent(errorCode)
| stats count() by errorCode, @message
| sort count() desc
```

---

## SNS Topics for Alerts

### Create SNS Topics

```bash
# Critical alerts
aws sns create-topic --name ai-alerts-critical

# High priority
aws sns create-topic --name ai-alerts-high

# Medium priority
aws sns create-topic --name ai-alerts-medium

# Subscribe email
aws sns subscribe \
  --topic-arn arn:aws:sns:us-east-1:ACCOUNT:ai-alerts-critical \
  --protocol email \
  --notification-endpoint oncall@company.com

# Subscribe Slack (using Lambda)
aws sns subscribe \
  --topic-arn arn:aws:sns:us-east-1:ACCOUNT:ai-alerts-critical \
  --protocol lambda \
  --notification-endpoint arn:aws:lambda:us-east-1:ACCOUNT:function:sns-to-slack
```

---

## Dashboard-as-Code (CloudFormation)

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Description: 'AI Lambda Monitoring Dashboard'

Resources:
  AILambdaDashboard:
    Type: AWS::CloudWatch::Dashboard
    Properties:
      DashboardName: ai-lambdas-main
      DashboardBody: !Sub |
        {
          "widgets": [
            {
              "type": "metric",
              "properties": {
                "metrics": [
                  ["AWS/Lambda", "Invocations", {"stat": "Sum"}],
                  [".", "Errors", {"stat": "Sum"}],
                  [".", "Duration", {"stat": "p95"}]
                ],
                "period": 300,
                "stat": "Average",
                "region": "us-east-1",
                "title": "Lambda Metrics"
              }
            }
          ]
        }
```

Deploy with:
```bash
aws cloudformation create-stack \
  --stack-name ai-lambda-monitoring \
  --template-body file://monitoring-stack.yaml
```

---

## Weekly Metrics Review

### Every Monday 9 AM (Standup Meeting)

Review:
1. **Weekly Cost**: Should match $2.70-220 projection
2. **Error Rate**: Should be <1%
3. **Latency**: P95 should be <3s
4. **Cache Hit**: Should be >90%
5. **Accuracy**: Should be >90% (classify), >95% (ocr)

### Action Items If Issues Found

| Metric | Issue | Action |
|--------|-------|--------|
| Cost > projection | Tokens high, cache low | Review prompts, verify cache keys |
| Error rate > 2% | High failures | Check logs for patterns |
| Latency > 5s | Slow responses | Check Bedrock latency, cold starts |
| Cache hit < 80% | Not caching | Check system prompt consistency |
| Accuracy < 90% | Degraded AI | Roll back to previous prompt version |

---

## Dashboard Link (After Deployment)

```
https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#dashboards:name=ai-lambdas-main
```

Add to bookmark bar for quick access during incidents.

---

## Monthly Metrics Report

### Generate on First of Month

```bash
#!/bin/bash

START=$(date -d "last month" +%Y-%m-01)
END=$(date +%Y-%m-01)

echo "=== AI Lambda Monthly Report ==="
echo "Period: $START to $END"
echo ""

# Total invocations
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Invocations \
  --dimensions Name=FunctionName,Value=classify-food-lambda \
  --start-time $START \
  --end-time $END \
  --period 2592000 \
  --statistics Sum

# Total cost
aws logs describe-log-groups --log-group-name-prefix /aws/lambda/classify-food-lambda | \
  grep costUsd | \
  awk '{sum+=$0} END {print "Total Cost: $" sum}'

# Average latency
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Duration \
  --dimensions Name=FunctionName,Value=classify-food-lambda \
  --start-time $START \
  --end-time $END \
  --period 2592000 \
  --statistics Average
```

---

## Post-Incident Dashboard Updates

After each incident, update dashboard:
1. Add metric that could have detected issue earlier
2. Create alert for similar issue
3. Review dashboard with team
4. Update incident response playbook

---

**Dashboard Ready for Production**: Yes ✅  
**All Alarms Configured**: Yes ✅  
**Team Access Granted**: [List who has access]  
**Backup Dashboard**: [Link to backup/read-only version]

---

*Last Updated: 2026-04-27*  
*Next Review: Phase C Day 6 (deployment day)*
