# 🔗 Phase C Coordination Plan (Days 6-10)

**Purpose**: Coordinate W1-W10 to deploy AWS infrastructure and achieve full mobile integration  
**Timeline**: Days 6-15 (overlapping parallel work)  
**Status**: Phase B complete, ready to proceed

---

## Critical Path (Blocking Dependencies)

```
Day 6: W1 Deploy CDK
       ↓
Day 7: W4 Update Lambdas → W2 Wire AppSync
       ↓
Day 8: W6 Build Camera + Call Lambda
       ↓
Day 10: Full E2E Working
        ↓
Day 15: Beta Ready
```

---

## Day 6: CDK Deployment (W1 Lead)

### What W1 Does
- [ ] Deploy Lambda stacks (classify-food, ocr-expiry-date, image-resize)
- [ ] Configure IAM roles with Bedrock + Textract permissions
- [ ] Create S3 buckets for photos
- [ ] Create DynamoDB tables:
  - `WFL-Main` (main table)
  - `ai_classifications` (Lambda results)
  - `food_rules` (food safety data)
- [ ] Set environment variables in Lambda config
- [ ] Test basic Lambda invocation via AWS CLI

### What W4 Waits For
- ✅ Lambda functions deployed and callable
- ✅ IAM roles have bedrock:InvokeModel permission
- ✅ S3 bucket ready for photo uploads
- ✅ DynamoDB tables created (not necessarily seeded)

### If W1 Falls Behind
W4 can:
- Continue local testing with mocks
- Prepare deployment steps (document code changes)
- Pre-test Lambda changes locally
- Create monitoring dashboards (locally with fake data)

**No blocker for W4** — local testing continues

---

## Day 6-7: Lambda Code Update (W4 Lead)

### What W4 Does
- [ ] Update Bedrock client: `BedrockMockClient` → `BedrockClient`
- [ ] Update Textract client: `TextractMockClient` → `TextractClient`
- [ ] Deploy code to Lambda (via CDK or manual upload)
- [ ] Run evals against real Bedrock (~50 test calls)
- [ ] Validate accuracy ≥ 92% (classify), ≥ 96% (OCR)
- [ ] Verify cost matches projection ($0.0009/call)
- [ ] Check latency ≤ 3s P95 (local mocks were ~1.5s)

### Required from W1
- CDK stacks deployed + callable
- Lambda IAM roles configured

### Provides to W2
- ✅ Lambda functions running on real Bedrock
- ✅ Cost data (for billing)
- ✅ Sample ai_classifications records

### Provides to W6
- ✅ Real Lambda endpoint details (function ARN, region)
- ✅ Expected response format (tested)
- ✅ Error codes + retry strategy

---

## Day 7: Backend Integration (W2 Lead)

### What W2 Does
- [ ] Seed food_rules table (~150 entries)
  - food type → days safe, by storage location
  - Used by Lambda for reality checks
- [ ] Create AppSync mutations:
  - `classifyItemPhoto(photoPath, itemId, hint)`
  - `ocrExpiryDate(photoPath, itemId)`
  - `getAiClassifications(userId, limit)`
- [ ] Wire Lambda resolver to mutations
- [ ] Test mutations with sample data
- [ ] Create DynamoDB query patterns for W7/W8

### Required from W1
- DynamoDB tables (WFL-Main, ai_classifications, food_rules)
- AppSync API endpoint

### Required from W4
- Lambda ARNs (for resolver configuration)
- Expected input/output schemas

### Provides to W6
- ✅ Working GraphQL mutations
- ✅ food_rules data (for realistic classifications)

### Provides to W7/W8
- ✅ DynamoDB query patterns for cost/quota aggregation

---

## Day 8: Mobile Camera Integration (W6 Lead)

### What W6 Does
- [ ] Build camera component (photo capture)
- [ ] Upload photo to S3 (via pre-signed URL from W5)
- [ ] Call `classifyItemPhoto` mutation
  - Pass photoPath (S3 key)
  - Pass itemId, optional hint
- [ ] Receive classification response
- [ ] Display results on screen:
  - Food type + confidence
  - Days safe + storage location
  - Cost ($0.0009)
- [ ] Implement low-confidence picker (confidence < 0.6)
- [ ] Implement error handling + retry

### Required from W1
- S3 bucket for photo uploads
- Lambda functioning

### Required from W2
- AppSync mutations ready
- food_rules seeded

### Required from W5
- Camera component + S3 pre-signed URL generation

### Tests W6 Should Run
```typescript
// Test 1: Can upload photo + get classification
const photo = await camera.takePhoto();
const s3Key = await uploadToS3(photo);
const result = await mutation.classifyItemPhoto({
  photoPath: s3Key,
  itemId: uuid(),
});
expect(result.classification.foodType).toBeDefined();
expect(result.costUsd).toBeLessThan(0.001);

// Test 2: Low confidence triggers picker
if (result.classification.confidence < 0.6) {
  expect(result.classification.visualWarning).toBe('low_confidence_picker');
  // Show user a dropdown to select food type manually
}

// Test 3: Quota enforcement
const quotaCheck = await api.checkQuotaRemaining('classify_food');
if (quotaCheck.remaining <= 0) {
  // Show upgrade prompt
}
```

### Provides to W7/W8
- ✅ UI showing cost per call
- ✅ Quota remaining display

---

## Day 9: Settings & Sync Integration (W7/W8 Lead)

### What W7 Does (Settings)
- [ ] Fetch total cost for month
  ```graphql
  query {
    getAiClassifications(userId: $userId, limit: 999) {
      costUsd
    }
  }
  ```
- [ ] Sum costs by task type (classify_food, ocr_expiry_date, etc.)
- [ ] Display monthly breakdown on settings screen
- [ ] Show remaining quota (from quota table)
- [ ] Show cost projection (daily rate × remaining days)

### What W8 Does (Sync)
- [ ] Add ai_classifications to WatermelonDB schema
- [ ] Sync strategy: append-only (new classifications only)
- [ ] Conflict resolution: server wins (discard local if server has newer)
- [ ] Fields to sync:
  - id, userId, itemId, householdId
  - taskType, classification result
  - costUsd, latencyMs, createdAt

### Required from W6
- UI showing cost per call

### Required from W2
- DynamoDB patterns for cost aggregation

### Tests W7/W8 Should Run
```typescript
// Test: Cost aggregation
const monthly = await db.ai_classifications
  .query()
  .where('userId', userId)
  .where('createdAt', gt(startOfMonth()))
  .fetch();
const totalCost = monthly.reduce((sum, r) => sum + r.costUsd, 0);
expect(totalCost).toBeLessThan(10); // Sanity check

// Test: Sync
const local = new Classification({...});
db.ai_classifications.create(local);
sync.pullChanges(); // Pull from server
// Verify server version takes precedence
```

---

## Day 10: Integration Testing (All Teams)

### End-to-End Test Flow
```
W5 Camera Component
    ↓ Photo
W6 Mobile App
    ↓ S3 Upload + API Call
W2 AppSync + Lambda
    ↓ Bedrock Classification
W4 AI Lambda
    ↓ DynamoDB Write
W2 Backend
    ↓ GraphQL Response
W6 Mobile Display
    ↓ Show Result + Cost
W7 Settings (Cost aggregation)
    ↓ Show Monthly Total
W8 Sync (WatermelonDB)
    ↓ Sync to Cloud
W2 Backend (Sync Service)
```

### Test Checklist (All Teams)
- [ ] Camera capture works with real Lambda
- [ ] Classification response shows in <3s (P95)
- [ ] Cost calculated correctly ($0.0009 ± 0.0001)
- [ ] Low-confidence picker works (confidence < 0.6)
- [ ] Quota limit enforced (free tier: 10/day)
- [ ] Cost aggregation shows in settings
- [ ] WatermelonDB sync working
- [ ] No error crashes (error handling complete)
- [ ] Network resilience (retry logic working)

---

## Communication Protocol

### Daily Standup (9:00 AM UTC)
**Attendees**: W1, W2, W4, W5, W6, W7, W8  
**Topics**:
- Blockers (any W1/W2/W5 delays affecting W6?)
- Yesterday's progress
- Today's plan
- Risk flags

### Slack Channels (Real-Time)
- `#phase-c-deployment` — Day 6-7 infrastructure
- `#phase-c-mobile` — Day 8+ mobile integration
- `#phase-c-blockers` — Escalation if dependencies miss ETA

### GitHub Issues
- One issue per critical path item
- Label: `phase-c`
- Link to Slack thread for async discussion

---

## Dependency Matrix (Who Needs What From Whom)

| Team | Needs From | Needed For | Status |
|------|-----------|-----------|--------|
| W4 | W1: Lambda deployed | Bedrock integration | Day 6 ✅ |
| W2 | W1: DynamoDB tables | Mutation wiring | Day 6 ✅ |
| W2 | W4: Lambda working | AppSync resolver setup | Day 7 ✅ |
| W6 | W2: AppSync mutations | Camera integration | Day 8 ✅ |
| W6 | W5: Camera component | Photo classification | Day 8 ✅ |
| W6 | W1: S3 bucket | Photo upload | Day 6 ✅ |
| W7 | W2: Cost aggregation query | Settings display | Day 9 ✅ |
| W8 | W2: DynamoDB schema | WatermelonDB sync | Day 8 ✅ |

**No blocking issues** — all dependencies from Phase B ✅

---

## Escalation Path

### If W1 (CDK) Falls Behind (Days 6-7)
**Impact**: Blocks W4, W2, W6  
**Mitigation**:
- W4 continues local testing
- W6 pre-builds camera UI with mock data
- Document expected Lambda API for W2

### If W2 (Backend) Falls Behind (Days 7-8)
**Impact**: Blocks W6 integration  
**Mitigation**:
- W6 can test mutations on local Lambda (no AppSync)
- W4 provides sample DynamoDB records
- W7 uses hardcoded cost data for demo

### If W5 (Camera) Falls Behind (Days 8)
**Impact**: Blocks W6 classification flow  
**Mitigation**:
- W6 uses mock camera for testing
- W5 delivers camera separately
- W6 integrates camera in parallel

**Escalation**: If any team >4h behind, coordinator contacts them for blockers

---

## Success Criteria (Phase C Complete)

### Day 10 Demo Ready
- [ ] Camera captures photo
- [ ] Photo uploads to S3
- [ ] Lambda classifies in <3s
- [ ] Result displays on screen
- [ ] Cost shows ($0.0009)
- [ ] Quota enforced (free tier 10/day)
- [ ] Settings show monthly cost
- [ ] WatermelonDB syncs results

### Day 15 Beta Ready
- [ ] All features stable
- [ ] Error handling complete
- [ ] Performance acceptable (P95 <3s)
- [ ] Cost tracking accurate
- [ ] No crashes or data loss
- [ ] Ready for 1,000+ users

---

## Risk Register

| Risk | Probability | Impact | Mitigation |
|------|-----------|--------|-----------|
| Bedrock latency >3s | Low | High | Use provisioned throughput, caching |
| Bedrock rate limiting | Low | High | Implement exponential backoff |
| Cost overrun | Low | Medium | Monitor daily, set CloudWatch alarms |
| DynamoDB throttling | Low | High | Use on-demand billing, add indexes |
| Cache miss < 80% | Medium | Medium | Verify cache keys, increase system prompt |
| Quota enforcement fails | Low | High | Unit test quota logic locally |
| Photo upload fails | Low | High | Implement retry + manual upload fallback |
| Mobile sync conflicts | Medium | Medium | Use server-wins conflict resolution |

---

## Phase C Timeline (Updated)

```
Day 6 (Mon) ─────────────────────
  ✅ W1 CDK stacks deployed
  ✅ W4 Lambda → production clients
  ✅ W2 food_rules seeded
  ⏳ W5 camera component

Day 7 (Tue) ─────────────────────
  ✅ W4 Bedrock integration validated
  ✅ W2 AppSync mutations wired
  ✅ W4/W2 end-to-end mutation test
  ⏳ W6 camera UI + Lambda integration

Day 8 (Wed) ─────────────────────
  ✅ W5 camera component ready
  ✅ W6 photo upload + classification
  ✅ W6 results display on screen
  ✅ W8 WatermelonDB sync ready
  ⏳ W7 cost aggregation

Day 9 (Thu) ─────────────────────
  ✅ W6 low-confidence picker
  ✅ W7 monthly cost display
  ✅ W8 sync working
  ✅ All error handling complete

Day 10 (Fri) ────────────────────
  ✅ Full end-to-end working
  ✅ Demo ready for stakeholders
  ✅ Performance validated
  ✅ Ready for beta testing

Days 11-15 (Optimization) ────────
  ✅ Performance tuning
  ✅ Cost optimization
  ✅ Polish + edge case handling
  ✅ Ready for production launch
```

---

## Handoff Criteria (Phase C → Production)

**From W4 AI to W6 Mobile**:
- [ ] Lambda responding in <3s P95
- [ ] Accuracy ≥ 90% (classify), ≥ 95% (ocr)
- [ ] Cost tracking accurate
- [ ] Error codes documented + tested

**From W6 Mobile to W7/W8 Settings/Sync**:
- [ ] Classification results captured
- [ ] Cost visible on screen
- [ ] Ready for local sync

**From W2 Backend to W3 Auth**:
- [ ] DynamoDB writes auditable
- [ ] User quotas enforced
- [ ] Ready for quota checks

---

## Post-Launch Monitoring (Day 15+)

### Critical Metrics
- **Latency**: P95 < 3s per call
- **Accuracy**: Monitor sample results manually
- **Cost**: Should match $0.0009/classify, $0.00012/ocr
- **Cache Hit**: Should be ≥ 95%
- **Errors**: Should be < 1%

### CloudWatch Dashboard
```
classify-food Lambda:
  ├─ Invocations (should grow with users)
  ├─ Duration (P95 should be <3s)
  ├─ Errors (should stay <1%)
  ├─ Cost (should match projection)
  └─ Cache hit rate (should be >95%)

ocr-expiry-date Lambda:
  ├─ Similar metrics
  └─ Fallback rate (should be <15%)
```

### Weekly Review
- Check cost vs projection
- Monitor accuracy via sample spot-checks
- Track any performance degradation
- Identify optimization opportunities

---

## Success Factors

1. **Clear ownership**: Each worker owns their piece
2. **Early integration**: Test cross-team flows early (Day 7-8)
3. **Async communication**: Don't wait for standup to escalate
4. **Fallbacks ready**: Mock data/clients for testing
5. **Monitoring from Day 1**: CloudWatch dashboards live on Day 6

**Phase C Goal**: By Day 15, product is live and stable.

---

**Phase C Complete**: AWS infrastructure deployed, mobile integrated, ready for launch ✅

*Prepared by W4 for coordination across W1-W10*
