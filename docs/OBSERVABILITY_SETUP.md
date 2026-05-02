# Observability Setup (W5)

Comprehensive error tracking, performance monitoring, and analytics for WhatsFresh.

## Architecture

Three-tier observability:

```
┌─────────────────────────────┐
│  Mobile App (React Native)  │
│  - Sentry (error tracking)  │
│  - PostHog (analytics)      │
│  - Performance monitoring   │
└────────────┬────────────────┘
             │
      ┌──────▼───────┐
      │  Backend API │
      │  - CloudWatch│
      │  - AppSync   │
      │  - Lambda    │
      └──────┬───────┘
             │
  ┌──────────┼──────────┐
  │          │          │
┌─┴──┐   ┌──┴──┐   ┌───┴───┐
│AWS │   │SNS  │   │Metrics│
│    │   │Alerts│   │CloudW │
└────┘   └─────┘   └───────┘
```

## 1. Sentry (Error Tracking)

### Setup

Create account at https://sentry.io/

```bash
# Install Sentry CLI
npm install -g @sentry/cli

# Create auth token
sentry auth login
```

### Configuration

**Mobile (React Native):**

```typescript
// apps/mobile/src/services/monitoring/sentry.ts
import * as Sentry from "@sentry/react-native";

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV || "development",
  tracesSampleRate: 0.1,
  integrations: [
    new Sentry.Native.LocalStorage(),
  ],
  beforeSend: (event) => {
    // Scrub PII (user data, auth tokens)
    if (event.request?.url) {
      event.request.url = event.request.url.replace(/token=[^&]*/g, 'token=***');
    }
    return event;
  },
});
```

**Backend (Lambda):**

```typescript
// services/ai/shared/sentry-middleware.ts
import * as Sentry from "@sentry/aws-serverless";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.ENVIRONMENT || "development",
  tracesSampleRate: 0.1,
});

export const handler = Sentry.wrapHandler(async (event) => {
  // Your Lambda handler
});
```

### Environment Variables

```bash
# .env (mobile)
EXPO_PUBLIC_SENTRY_DSN=https://<key>@<org>.ingest.sentry.io/<projectId>

# AWS Lambda (via Secrets Manager or SSM Parameter Store)
SENTRY_DSN=https://<key>@<org>.ingest.sentry.io/<projectId>
```

### Dashboards

**Error Dashboard:**
- New errors (last 24h)
- Error trends by release
- Top 10 errors
- Error rates by endpoint

**Release Health:**
- Crash-free rate (%) — target 99.5%+
- Session count
- User adoption per release

**Performance:**
- Slowest transactions
- P95 latency trends
- Transaction samples

### Alerting

Automatic alerts on:
- New errors in production
- Error rate spike (>5%)
- Crash rate >1%
- Slow transactions (>5s)

---

## 2. PostHog (Product Analytics)

### Setup

Create account at https://posthog.com/

```bash
# Install SDK
npm install posthog-js posthog-react-native
```

### Configuration

**Mobile (React Native):**

```typescript
// apps/mobile/src/services/analytics/posthog.ts
import PostHog from "posthog-js/react-native";

PostHog.init(process.env.EXPO_PUBLIC_POSTHOG_KEY, {
  host: "https://app.posthog.com",
  opt_in_site_apps: true,
  capture_pageview: true,
  loaded: (ph) => {
    // User identification
    ph.identify(userId, {
      email: userEmail,
      household: householdId,
      subscription: tier,
    });
  },
});
```

**Example Events:**

```typescript
import PostHog from "posthog-js/react-native";

// Food item created
PostHog.capture("item_created", {
  foodName: item.foodName,
  category: item.category,
  location: item.location,
  source: "manual|ocr|ai_classification",
});

// Photo upload
PostHog.capture("photo_uploaded", {
  file_size: sizeInBytes,
  duration_ms: uploadTime,
  success: true,
});

// AI classification
PostHog.capture("ai_classification", {
  model: "claude-haiku",
  confidence: 0.95,
  cache_hit: true,
  cost_usd: 0.0001,
});

// Scan completed
PostHog.capture("barcode_scan", {
  barcode_format: "EAN-13",
  found_in_db: true,
  items_created: 1,
});

// Sync completed
PostHog.capture("sync_completed", {
  items_synced: 5,
  duration_ms: 250,
  conflicts_resolved: 0,
});
```

### Environment Variables

```bash
EXPO_PUBLIC_POSTHOG_KEY=phc_<key>
EXPO_PUBLIC_POSTHOG_HOST=https://app.posthog.com
```

### Dashboards

**User Behavior:**
- Daily active users (DAU)
- Session length distribution
- Feature adoption (% using feature)
- Retention curves (1d, 7d, 30d)

**Funnel Analysis:**
- Sign-up → Create Household → Add Item
- Photo Upload → Classification → Review
- Barcode Scan → Item Creation

**Core Metrics:**
- Items created per day
- Photos per day
- AI classifications (cost/day)
- Average session duration
- Churn rate

**Cohort Analysis:**
- Early users (first week retention)
- Heavy users (10+ items)
- Premium subscribers

---

## 3. CloudWatch (Infrastructure Monitoring)

Handled by OpsStack — see `infra/cdk/lib/stacks/ops-stack.ts`

**Dashboards:**
- API latency, errors, throughput
- Lambda duration, error rate
- DynamoDB consumed capacity, throttling
- AI cost per day

**Alarms:**
- Lambda error rate > 1%
- AppSync 5xx > 5/min
- DynamoDB throttling
- Bedrock cost spike

---

## 4. Integrations

### PagerDuty (Critical Alerts)

Connect SNS topics to PagerDuty for on-call escalation:

```bash
# In production:
# - Set SNS subscription to PagerDuty
# - Configure incident routing by severity
# - Escalation policy after 5 min
```

### Slack (Notifications)

```typescript
// Send alerts to Slack
import { IncomingWebhook } from "@slack/webhook";

const webhook = new IncomingWebhook(process.env.SLACK_WEBHOOK_URL);

await webhook.send({
  text: "⚠️ Production Alert",
  blocks: [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Error Rate Spike*\nLambda errors > 5%\nAction required`,
      },
    },
  ],
});
```

---

## 5. Testing & Validation

### Send Test Errors

```typescript
// Sentry
Sentry.captureException(new Error("Test error from mobile app"));

// PostHog  
PostHog.capture("test_event", { test: true });

// CloudWatch (Lambda)
console.error("Test error for CloudWatch", { context: "test" });
```

### Verify Dashboard Data

```bash
# Sentry
sentry releases list

# PostHog
curl https://app.posthog.com/api/events/?limit=10 \
  -H "Authorization: Bearer <personal_api_key>"

# CloudWatch
aws cloudwatch list-metrics --namespace WhatsFresh
```

---

## 6. Best Practices

### Do's ✅
- **Sample at appropriate rates** (10% for high-volume, 100% for errors)
- **Identify users** with household/subscription info for cohort analysis
- **Tag releases** (git commit hash) for tracking fixes
- **Monitor costs** (Sentry, PostHog billing)
- **Rotate secrets** (API keys, DSNs)
- **Test in staging** before production deployment

### Don'ts ❌
- **Don't log PII** (passwords, tokens, credit cards)
- **Don't sample errors** (always capture 100%)
- **Don't ignore warnings** (CloudWatch alarms)
- **Don't modify system critical paths** for monitoring overhead
- **Don't send raw user data** (scrub in beforeSend hooks)

---

## 7. Rollout Plan

### Phase 1: Foundation (This Sprint)
- ✅ Sentry error tracking (mobile + Lambda)
- ✅ PostHog analytics (mobile)
- ✅ CloudWatch dashboards (infrastructure)

### Phase 2: Production (Week 2)
- PagerDuty integration for critical alerts
- Slack notifications for warnings
- Team access setup
- Retention monitoring

### Phase 3: Advanced (Week 3+)
- Distributed tracing across services
- Custom metrics for business KPIs
- Anomaly detection
- Cost optimization analysis

---

## 8. Monitoring Checklist

Production readiness:

- [ ] Sentry project created + DSN configured
- [ ] PostHog project created + API key configured
- [ ] Dashboards reviewed and bookmarked
- [ ] Alarms tested (CloudWatch, PagerDuty)
- [ ] Team access granted
- [ ] Slack/email notifications working
- [ ] Data retention policies set
- [ ] Privacy compliance reviewed (PII scrubbing)
- [ ] Cost budgets set ($50/month estimated)
- [ ] Release tracking configured

---

## 9. Troubleshooting

### No errors showing in Sentry
```bash
# Check DSN is correct
grep SENTRY_DSN .env

# Check network access
curl -X POST https://<org>.ingest.sentry.io/api/9999/store/ -d '{"message":"test"}'
```

### PostHog events not appearing
```bash
# Check API key
grep POSTHOG_KEY .env

# Check events are being fired
PostHog.capture("debug_event", { debug: true });

# Look in Network tab (browser dev tools)
```

### CloudWatch alarms not triggering
```bash
# Check alarm state
aws cloudwatch describe-alarms --region us-east-1

# Check SNS subscription
aws sns list-subscriptions-by-topic --topic-arn <arn>
```

---

## 10. Cost Analysis

**Estimated monthly costs:**

- **Sentry**: $29/month (5M events, team plan)
- **PostHog**: $20/month (1M events)
- **AWS CloudWatch**: ~$5/month (logs + alarms)
- **PagerDuty**: $40/month (on-call)

**Total**: ~$94/month

**Optimization strategies:**
- Sample non-error transactions at 10% (vs 100%)
- Prune old data after 90 days
- Monitor and cap PostHog event volume

---

## Questions?

- Sentry docs: https://docs.sentry.io/platforms/react-native/
- PostHog docs: https://posthog.com/docs
- CloudWatch docs: https://docs.aws.amazon.com/cloudwatch/
