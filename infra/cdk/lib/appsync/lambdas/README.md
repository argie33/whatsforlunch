# Lambda Functions

Production-grade Lambda functions for WhatsFresh backend.

## Functions

### delete-account-handler.js

Two-phase account deletion with GDPR compliance.

**Triggers**:
- Step Function: delete-account-flow.json
- Manual invocation via AWS CLI

**Phases**:
1. **Soft Delete** (immediate)
   - Marks profile as deleted
   - Soft-deletes all household memberships
   - Soft-deletes all items created by user
   - Soft-deletes household invites
   - Soft-deletes mobile devices
   - Logs to UserEvent entity

2. **Hard Purge** (after 30-day retention)
   - Permanently deletes profile
   - Permanently deletes memberships
   - Permanently deletes items
   - Permanently deletes invites
   - Logs to PurgeEvent for audit

**Timeout**: 120 seconds  
**Memory**: 512 MB  
**Cost**: ~$0.0000166667 per GB-second

### notify-expiring-handler.js

Sends push notifications for items expiring soon.

**Triggers**:
- EventBridge scheduled rule (every 6 hours)
- Manual invocation for testing

**Features**:
- Queries GSI2 for items expiring within 72 hours
- Sends Expo push notifications
  - Red emoji (🔴) for items expiring in <24 hours
  - Orange emoji (🟠) for items expiring in <72 hours
- Batch logging of notification results
- Graceful error handling (failures logged, not fatal)
- SNS fallback for critical failures

**Timeout**: 60 seconds  
**Memory**: 256 MB  
**Schedule**: Every 6 hours (0, 6, 12, 18 UTC)  
**Cost**: ~$0.0000166667 per GB-second

### food-rules-publish-handler.js

Manages food spoilage rules catalog.

**Triggers**:
- Admin action via Step Function
- Manual invocation for batch updates

**Actions**:
- `publish`: Batch publish food rules
  - Validates rule consistency
  - Creates FOODRULES#CATALOG entries
  - Logs batch to DynamoDB
- `stats`: Get rule catalog statistics

**Rule Fields**:
```javascript
{
  foodType: "banana",          // required
  category: "produce",         // optional
  fridgeDaysSafe: 5,          // default 7
  freezerDaysSafe: 180,       // default 180
  pantryDaysSafe: 30,         // default 30
  counterHoursSafe: 2,        // default 2
  notes: "..."                // optional
}
```

**Validation**:
- fridgeDaysSafe <= freezerDaysSafe (frozen lasts longer)
- All durations within reasonable ranges
- Warnings logged but don't block publish

**Timeout**: 60 seconds  
**Memory**: 256 MB  
**Cost**: ~$0.0000166667 per GB-second

---

## Deployment

### Local Testing

```bash
# Install dependencies in infra package
cd infra && pnpm install

# Synthesize CDK (generates CloudFormation)
pnpm cdk:synth

# Deploy to AWS
pnpm cdk:deploy

# View outputs
pnpm cdk:outputs
```

### Manual Invocation

```bash
# Delete account (soft phase)
aws lambda invoke \
  --function-name wfl-delete-account-dev \
  --payload '{
    "userId": "user123",
    "householdIds": ["house1", "house2"],
    "purge": false
  }' \
  response.json

# Delete account (hard purge phase)
aws lambda invoke \
  --function-name wfl-delete-account-dev \
  --payload '{
    "userId": "user123",
    "householdIds": ["house1", "house2"],
    "purge": true
  }' \
  response.json

# Publish food rules
aws lambda invoke \
  --function-name wfl-food-rules-dev \
  --payload '{
    "action": "publish",
    "rules": [
      {
        "foodType": "milk",
        "fridgeDaysSafe": 7,
        "freezerDaysSafe": 180,
        "pantryDaysSafe": 30,
        "counterHoursSafe": 2
      }
    ]
  }' \
  response.json
```

---

## Error Handling

### delete-account-handler

**Errors**:
- Missing `userId` parameter → 400
- Missing/invalid `householdIds` → 400
- DynamoDB failures → 500
- Step Function retries on Lambda.ServiceException

**Handling**:
- Logs all operations to UserEvent/PurgeEvent
- Continues even if some operations fail
- Returns summary of success/failure counts

### notify-expiring-handler

**Errors**:
- No devices registered → skips user (not fatal)
- Expo API errors → logged, continues
- SNS fallback for critical errors

**Handling**:
- Logs notification batch results
- Returns summary with success/failure counts
- Gracefully degrades if Expo unavailable

### food-rules-publish-handler

**Errors**:
- Invalid rule format → returns error list
- Validation warnings → logged but continue
- DynamoDB failures → 500

**Handling**:
- Publishes valid rules even if some fail
- Returns published + error arrays
- Maintains event log for audit

---

## Monitoring

### CloudWatch Logs

All Lambda functions log to CloudWatch with prefix `/aws/lambda/wfl-{function}-{env}`.

### Key Metrics

- **delete-account**: Duration (should be <5s soft, <120s hard)
- **notify-expiring**: NotificationsSent, NotificationsFailed
- **food-rules**: RulesPublished, RulesFailed

### Alarms (recommended)

```typescript
// High error rate
metricErrorRate > 5% → Alert

// High duration
p95Duration > 30000ms → Warn

// DynamoDB throttling
ConsumedWriteCapacityUnits > capacity → Alert
```

---

## Performance

### delete-account-handler
- Soft delete: 1-2 seconds (depends on item count)
- Hard purge: 5-10 seconds (full scan + delete)
- Scales with: number of items created by user

### notify-expiring-handler
- Query GSI2: 100-500ms
- Send notifications: 50-100ms per device
- Batch processing: 5-30 seconds total

### food-rules-publish-handler
- Validation: <100ms
- Publish: 50-100ms per rule
- Batch (100 rules): 5-10 seconds

---

## Future Enhancements

- [ ] Async notification sending (SQS batching)
- [ ] Parallel household deletion for faster purges
- [ ] Rule templates for common food types
- [ ] Batch export to S3 before hard delete
- [ ] Deletion confirmation email
- [ ] Rule versioning and rollback

---

## Related Files

- **Step Function**: infra/cdk/lib/stepfunctions/delete-account-flow.json
- **CDK Stack**: infra/cdk/lib/stacks/notifications-stack.ts
- **Event Logging**: infra/cdk/lib/appsync/resolvers/event-logger.js
- **Error Codes**: docs/RESOLVER_API_REFERENCE.md

---

**Created**: Phase B+ (April 27, 2026)  
**Status**: Production-ready for AWS deployment
