# 13 — Observability

If we can't see it, we can't fix it. Every feature is observable from day one.

## Tooling

| Concern | Tool |
|---|---|
| App crashes + errors | **Sentry** (mobile + Lambda) |
| Product analytics | **PostHog** |
| Infra metrics | **CloudWatch Metrics** + **Embedded Metric Format** |
| Infra logs | **CloudWatch Logs** (90-day hot, S3 archive) |
| Infra tracing | **AWS X-Ray** |
| AI eval tracking | **Langfuse** (self-hosted on AWS) or Braintrust |
| Synthetic monitoring | **CloudWatch Synthetics** canaries |
| Status page | **Instatus** (Wave 3+) |
| Alerting | **CloudWatch Alarms** → SNS → PagerDuty (or email at MVP) |

## Logging strategy

### Structured JSON logs

Use **AWS Lambda Powertools Logger** for all Lambda functions:

```typescript
import { Logger } from '@aws-lambda-powertools/logger';
const logger = new Logger({ serviceName: 'classify-food' });

logger.info('Photo classified', {
  itemId: '...',
  foodType: '...',
  confidence: 0.85,
  latencyMs: 1240,
  cacheHit: true,
});
```

Output (CloudWatch):
```json
{
  "level": "INFO",
  "message": "Photo classified",
  "service": "classify-food",
  "timestamp": "2026-04-26T18:00:00Z",
  "xray_trace_id": "1-...",
  "function_request_id": "...",
  "itemId": "...",
  "foodType": "...",
  "confidence": 0.85,
  "latencyMs": 1240,
  "cacheHit": true
}
```

### Mobile logs (Sentry breadcrumbs)

Auto-attached to Sentry events:
- Screen navigations
- API calls (with masked headers, no body)
- User actions (button presses on critical paths)
- State transitions

Custom breadcrumbs added for critical paths.

### What never gets logged (PII hygiene)

- Full email addresses (use SHA-256 hash + per-env salt)
- Auth tokens
- Photo bytes
- Bedrock prompts containing user content
- Names of food items (loose privacy — what's in your fridge is private)
- IP addresses (CloudFront logs them, but app logs don't)

Logger wrapper auto-redacts known PII fields.

## Metrics

### Custom CloudWatch metrics via Embedded Metric Format

```typescript
import { Metrics } from '@aws-lambda-powertools/metrics';
const metrics = new Metrics({
  namespace: 'WhatsFresh',
  serviceName: 'classify-food',
});

metrics.addMetric('ClassificationLatency', 'Milliseconds', latencyMs);
metrics.addMetric('CacheHit', 'Count', cacheHit ? 1 : 0);
metrics.addMetric('Confidence', 'None', confidence);
metrics.publishStoredMetrics();
```

EMF is cheaper than `PutMetricData` calls (no per-API cost).

### Key metrics tracked

#### Per-Lambda
- Invocations, errors, throttles, concurrent executions
- Duration p50/p95/p99
- Memory usage
- Cold starts vs warm

#### Per-feature
- `classify-food`: invocations, latency, cost per call, override rate
- `ocr-expiry-date`: invocations, latency, fallback rate
- `suggest-recipes`: invocations, cache hit rate, average recipe count
- `delete-account`: invocations, completion latency

#### Business
- DAU / MAU
- New signups (per day)
- Items created (per day)
- AI classifications (per day)
- Conversion (free → paid trial)
- Trial → paid
- Subscription churn (monthly)

## Tracing

### AWS X-Ray on every Lambda + AppSync + DynamoDB

Enabled in CDK:
```typescript
new lambda.Function(this, 'ClassifyFood', {
  ...
  tracing: lambda.Tracing.ACTIVE,
});
```

Trace fields automatically captured:
- AWS SDK calls (Dynamo, S3, Bedrock)
- HTTP calls (Google Places)
- Custom subsegments via Powertools Tracer

### Mobile tracing (Sentry Performance)

```typescript
const transaction = Sentry.startTransaction({ name: 'classify-photo' });
// ...
transaction.finish();
```

Track end-to-end latency (button press → response visible).

## Alerting

### CloudWatch Alarms

| Trigger | Severity | Notify |
|---|---|---|
| Lambda error rate > 1% (5min) | High | PagerDuty + email |
| Lambda duration p95 > 5s | Medium | Email |
| AppSync 5xx > 0.5% (5min) | High | PagerDuty + email |
| AppSync 4xx > 5% (5min) | Medium | Email |
| DynamoDB throttling (any) | High | PagerDuty |
| KMS Decrypt denies | High | PagerDuty |
| Bedrock invocation rate 10x baseline | High | PagerDuty |
| Per-user AI cost > $5/day | Medium | Email (potential abuse) |
| Cognito CompromisedCredentials event | High | PagerDuty |
| > 5 failed logins / user / 5min | Medium | Email |
| WAF blocked requests > 1000/5min spike | High | PagerDuty |
| GuardDuty HIGH severity finding | High | PagerDuty |
| AWS cost > 20% above baseline (daily) | Medium | Email |
| Sentry: > 100 new errors in 1h | Medium | PagerDuty |
| Sentry: any CRITICAL crash | High | PagerDuty |

### CloudWatch Synthetics canaries

Run every 5 minutes from us-east-1 (and us-west-2 once multi-region):

| Canary | Asserts |
|---|---|
| `auth-flow` | Sign-in works end-to-end |
| `create-item` | Creating an item via API succeeds |
| `classify-photo` | AI classification returns valid response |
| `delete-account` | Deletion API works (test account) |

Failure → CloudWatch Alarm → PagerDuty.

### Status page (Wave 3+)

Auto-update from CloudWatch:
- Green: all systems normal
- Yellow: degraded performance (high latency, partial outage)
- Red: outage

Use **Instatus** or **Better Stack**. Subscribe via email, RSS, Twitter.

## Dashboards

### CloudWatch dashboard per environment

Sections:
- **Health**: error rates, latencies, throttles
- **Business**: DAU, signups, items created
- **AI**: classification rate, cost per day, override rate
- **Cost**: per-service spend, anomalies
- **Security**: failed logins, GuardDuty, WAF blocks

### PostHog dashboards

- **Funnel**: install → signup → first item → 5+ items → 30-day active
- **Retention**: cohort retention curves
- **Feature usage**: which features are used by which tiers
- **A/B test results**: paywall variants

### Sentry dashboard

- **Release tracking**: errors per release
- **User feedback**: ratings
- **Performance**: slowest transactions

### Bedrock cost dashboard

- Custom dashboard tracking Bedrock spend per Lambda, per user, per day
- Powered by `ai_classifications.costUsd` aggregations

## Distributed tracing across systems

Correlation ID propagated through:
- Mobile request: generate UUID, send as `x-request-id` header
- API Gateway / AppSync: forwards to Lambda
- Lambda: logs with correlation ID; passes to downstream calls
- Sentry: captures correlation ID in tags

Search by correlation ID across CloudWatch + Sentry to trace any request end-to-end.

## Cost observability

- **AWS Cost Explorer**: weekly review
- **AWS Budgets**: $50/$100/$500/$1000 alarms
- **Anomaly detection**: alert if any service spikes > 20%
- **Per-tag attribution**: every resource tagged `Environment`, `Service`, `Owner`
- **Bedrock cost per user**: tracked in `ai_classifications.costUsd`; aggregated daily

## Mobile observability

### Sentry React Native SDK

Captures:
- Crashes (native + JS)
- Unhandled promise rejections
- Network errors
- Performance transactions
- User context (hashed user ID, tier, device)
- Session replay (sampled, sensitive UI masked)

### PostHog mobile SDK

Captures:
- Screen views (auto)
- Custom events (item_created, item_eaten, item_classified, ai_overrode)
- User properties (tier, household_count, dietary_prefs)
- Feature flag exposures
- Session recordings (sampled, sensitive UI masked)

### Mobile-specific metrics

- Cold start time
- Frame rate during animations
- Memory usage
- Battery impact (per-screen)

## Logging at scale

When MAU > 10K:
- Audit log strategy: stream DynamoDB to S3 + Athena for querying
- Long-term log retention: 90-day CloudWatch hot, 7-year S3 archive (compliance)
- Log analysis: Athena queries for trend analysis

## Privacy in observability

We process Tier 1 PII through Sentry + PostHog. Both are configured:
- DSN in Secrets Manager
- DPA signed
- EU users → EU regions
- Sensitive UI masked (input fields, photo previews) in session replays

## On-call rotations (post-launch)

When team grows:
- PagerDuty rotation (start with one person)
- Runbooks for top 10 alerts (one per alert type)
- Quarterly chaos drills (delete a database, kill a Lambda, simulate AWS region failure)

## Cross-references

- Architecture for tracing → [01_ARCHITECTURE.md](01_ARCHITECTURE.md)
- Security incident response → [04_SECURITY.md](04_SECURITY.md)
- Customer support tickets → [12_SUPPORT.md](12_SUPPORT.md)
