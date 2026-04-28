# 💰 Cost Optimization Guide (Phase C + Production)

**Purpose**: Strategies to minimize Bedrock/Textract/AWS costs while maintaining quality  
**Target**: $1.80/month free tier, $180/month premium at 1000 calls/day  
**Owner**: W4 AI Team + Finance

---

## Current Cost Baseline

### Per-Call Breakdown (classify-food with 95%+ cache hit)

```
Bedrock Haiku (5000 input tokens, 500 output tokens):
  Input tokens (new):      5000 × $0.8/1M = $0.004
  Input tokens (cached):   5000 × 0.1/1M = $0.0005 (8x cheaper!)
  Output tokens:           500 × $4.0/1M = $0.002
  ─────────────────────────────────────────
  Average cost/call:       ~$0.0009 (with cache)
  Without cache:           ~$0.006 (6.7x more expensive)

OCR (Textract + optional Bedrock fallback):
  Textract (free tier):    $0.00
  Bedrock fallback (20%):  $0.00016 × 0.2 = $0.000032
  Average cost/call:       ~$0.000032

Image Resize (S3 + Lambda):
  S3 read + write:         $0.0009
  Lambda compute:          $0.0002
  Average cost/call:       ~$0.001
```

### Monthly Cost Projections

| Tier    | Calls/Day | classify-food | ocr-expiry | image-resize | Total/Month |
| ------- | --------- | ------------- | ---------- | ------------ | ----------- |
| Free    | 10        | $0.27         | $0.009     | $0.30        | **$0.58**   |
| Growth  | 100       | $2.70         | $0.096     | $3.00        | **$5.80**   |
| Premium | 1000      | $27.00        | $0.96      | $30.00       | **$57.96**  |
| Scale   | 10000     | $270.00       | $9.60      | $300.00      | **$579.60** |

---

## Strategy 1: Maximize Prompt Cache Hit Rate (Biggest ROI)

**Impact**: 6.7x cost reduction if cache hit rate goes from 10% to 95%

### Current Cache Performance

- System prompt: 2000 tokens (cached)
- User request: 500 tokens (varies per call)
- Cache hit rate: >90% (target: 95%+)
- Cost savings: 8x cheaper on cached tokens ($0.1/M vs $0.8/M)

### Optimization Tactics

**1.1: Stable System Prompt**

```typescript
// ✅ GOOD: Same system prompt for all calls
const systemPrompt = `You are a food safety expert...`; // 2000 tokens, cached

// ❌ BAD: System prompt varies per call
const systemPrompt = `You are a food safety expert for ${userLocation}...`; // Cache miss!
```

**Action**: Ensure system prompt is identical across all invocations

- Measure: CloudWatch metric CacheHitRate should be >90%
- If <80%, audit prompt generation code

**1.2: Consistent Cache Keys**

```typescript
// Cache key = model + system_prompt_hash + cache_control
// If any changes, cache is invalidated

// ✅ GOOD: Cache control consistent
const cacheControl = { type: 'ephemeral', ttl: 300 }; // 5 min

// ❌ BAD: Cache control varies
const cacheControl = { type: 'ephemeral', ttl: userSetting }; // Breaks cache
```

**Action**: Never vary cache control parameters per user

- Measure: CloudWatch cache hit rate (should be stable >90%)

**1.3: Minimize User Input Tokens**

```typescript
// ✅ GOOD: Compressed user input (100 tokens)
const userPrompt = `Photo: pasta. Location: fridge. Days to estimate: ?`;

// ❌ BAD: Verbose user input (800 tokens)
const userPrompt = `I have taken a photo of some leftover food. It appears to be pasta. 
It is stored in a fridge. The user's timezone is America/Los_Angeles. 
Please estimate how many days it will be safe to eat.`;
```

**Action**: Keep user input compact

- Measure: CloudWatch metric InputTokens (should be <500 per call)
- Target: Average 300-400 input tokens per call

**Expected Savings**: 6-7x reduction in Bedrock costs

---

## Strategy 2: Textract Free Tier Optimization (OCR)

**Impact**: Free tier provides 1000 pages/month, so low cost for typical usage

### Current OCR Cost Model

- Textract free tier: 1000 pages/month = $0
- Textract paid: $1 per page (after free tier)
- Bedrock fallback: Only when Textract confidence <0.7

### Optimization Tactics

**2.1: Use Textract Confidence Threshold**

```typescript
// ✅ GOOD: Only fallback when truly uncertain
if (textractConfidence < 0.7) {
  // Use Bedrock fallback (~0.0008 per call)
}

// ❌ BAD: Always fallback (wastes money)
// Use Bedrock for every OCR (adds $0.0008 to every call)
```

**Action**: Keep Textract confidence threshold at 0.7 (current setting)

- Measure: CloudWatch metric "BedrockFallback" (should be 15-25% of OCR calls)
- Too high (<10%): Might be missing valid dates
- Too low (>40%): Wasting Bedrock on low-confidence cases

**2.2: Batch OCR When Possible**

```typescript
// ✅ GOOD: Batch process multiple items
async function ocrBatch(items) {
  const results = await Promise.all(
    items.map((item) => textract.detectDocumentText(item.photoPath)),
  );
  // 100 items: ~$0 (within free tier)
}

// ❌ BAD: Individual OCR per item
// 100 items: 100 × $1 = $100 (if over free tier)
```

**Action**: Use batching for bulk OCR operations

- Measure: Monitor OCR calls per day (target: <1000 to stay in free tier)

**Expected Savings**: Stay within free tier, avoid overage charges

---

## Strategy 3: Lambda Efficiency (Compute Costs)

**Impact**: ~10% of total cost, but easy wins available

### Current Lambda Configuration

- Memory: 512 MB (classify-food, ocr-expiry-date)
- Timeout: 30 seconds
- Concurrency: Reserved = 0 (on-demand), Provisioned = 0 (no warm instances)

### Optimization Tactics

**3.1: Optimal Memory Size**

```bash
# Current: 512 MB
# AWS Lambda pricing: (memory / 1024) × execution time × $0.0000166667

# Test with different memory sizes:
# 256 MB:   Slower (more GC pauses), cheaper per ms
# 512 MB:   Current, good balance
# 1024 MB:  Faster (less GC), costs 2x per ms
# 1536 MB:  Max, but overkill for I/O-bound Bedrock calls

# For I/O-bound workloads (waiting on Bedrock):
# 512 MB is optimal (no need for higher memory)
```

**Action**: Keep Lambda memory at 512 MB for classify-food/ocr-expiry-date

- Don't increase to 1024 MB (Bedrock latency dominates, not CPU)
- Measure: CloudWatch metric MaxDuration (should be <3000ms for P95)

**3.2: Cold Start Optimization**

```typescript
// ✅ GOOD: Minimal initialization
const bedrock = new BedrockClient(); // Lazy init

// ❌ BAD: Heavy initialization
const bedrock = new BedrockClient();
await bedrock.warmup(); // Unnecessary 500ms on every cold start
```

**Action**: Minimize Lambda initialization time

- Measure: CloudWatch log "Lambda initialization duration"
- Target: <1000ms cold start
- Use provisioned concurrency = 0 (on-demand is cheaper for variable load)

**3.3: Connection Pooling**

```typescript
// ✅ GOOD: Reuse connections across invocations
const bedrock = new BedrockClient();
export const handler = async (event) => {
  // Reuse bedrock client (warm connection)
};

// ❌ BAD: Create new client every invocation
export const handler = async (event) => {
  const bedrock = new BedrockClient(); // New connection every time
};
```

**Action**: Verify Lambda uses connection reuse

- Bedrock client is created once, reused across invocations

**Expected Savings**: 5-10% Lambda compute reduction

---

## Strategy 4: DynamoDB Optimization (Storage)

**Impact**: ~2% of total cost, but scaling matters

### Current DynamoDB Configuration

- Billing mode: On-demand (pay per request)
- Table: ai_classifications (write-optimized, append-only)
- TTL: 90 days (auto-delete old records)

### Optimization Tactics

**4.1: Keep On-Demand Billing (Not Provisioned)**

```bash
# On-demand pricing: $1.25 per million write units
# At 1000 calls/day = 30,000 writes/month = $0.0375

# Provisioned pricing: 400 WCU × $1.25/hour × 24 × 30 = $36,000/month
# Only cheaper if consistently >30k writes/day (way above our scale)
```

**Action**: Maintain on-demand billing mode

- Much cheaper for variable/unpredictable load

**4.2: Enable TTL (Data Cleanup)**

```bash
# Current: TTL = 90 days
# Without TTL: Table grows unbounded, storage costs increase

# With TTL:
# - Automatic deletion after 90 days
# - No manual cleanup
# - Costs: ~1/100th of on-demand write cost for cleanup
```

**Action**: Ensure TTL is enabled on createdAt attribute

- Storage cost: ~$0.25/GB/month for DynamoDB
- At 1000 calls/day: ~10 MB/month = negligible

**4.3: Compression (Optional)**

```typescript
// ✅ If response is large (>1KB), compress
const compressed = gzip(JSON.stringify(response));

// ❌ If response is small (<500 bytes), don't compress
// Compression overhead > savings
```

**Action**: Responses are small (~500 bytes), no compression needed

**Expected Savings**: Already minimal, focus on cache hits instead

---

## Strategy 5: S3 Optimization (Image Storage)

**Impact**: ~5% of total cost, but grows with image volume

### Current S3 Configuration

- Bucket: wfl-photos
- Lifecycle: Delete -resized images after 7 days (regenerate on demand)
- Versioning: Enabled for recovery
- Class: Standard (frequent access)

### Optimization Tactics

**5.1: Image Lifecycle Management**

```bash
# Original images (-resized removed): Keep indefinitely
# Resized images (-resized suffix):  Delete after 7 days
# Rationale: Resized can be regenerated, originals are ground truth

# Lifecycle rule:
# Prefix: items/*-resized.jpg
# Expiration: 7 days
```

**Action**: Verify lifecycle rule is active

- Measure: S3 bucket size over time (should be stable after 7 days)
- Verify: No 7+-day-old -resized images in bucket

**5.2: Intelligent-Tiering (Optional)**

```bash
# Standard storage: $0.023/GB for first 50GB/month
# Intelligent-Tiering: $0.0125/GB with auto-transition to Infrequent Access

# Only beneficial if:
# - Accessing <30% of data per month
# - Data volume >50GB

# Current usage: ~1GB/month (too small for Intelligent-Tiering)
```

**Action**: Keep S3 in Standard class (no auto-tiering)

- Too small to benefit from Intelligent-Tiering
- Revisit if data grows to >50GB/month

**5.3: S3 Request Optimization**

```typescript
// ✅ GOOD: Single GetObject per photo
const photo = await s3.getObject({ Bucket, Key });

// ❌ BAD: ListObjects on entire bucket (slow, expensive)
// const items = await s3.listObjects({ Bucket });
```

**Action**: Verify Lambda uses direct S3 key lookup (not bucket listing)

- Current implementation: ✅ Direct key lookup

**Expected Savings**: Already minimal with current lifecycle

---

## Strategy 6: Monitoring & Alerting for Cost Anomalies

**Impact**: Catch cost spikes early (prevent runaway costs)

### Cost Monitoring Setup

**6.1: CloudWatch Daily Cost Metric**

```bash
# Metric: CustomAI/AICallCost
# Dimension: Empty (total all services)
# Aggregation: Sum per day
# Alert: If >$5/day (email oncall@company.com)

# Thresholds:
# Free tier:    Alert if >$1/day (suggests code bug)
# Growth tier:  Alert if >$10/day (unexpected spike)
# Premium tier: Alert if >$100/day (5x normal)
```

**Action**: Deploy cost spike alert (CLOUDWATCH_SETUP.md)

- Detects: Runaway classification loops, cache invalidation bugs, prompt size explosion

**6.2: Cost Per Call Tracking**

```bash
# Metric: AICallCost divided by Invocations
# Target: $0.0009/call (classify), $0.000032/call (OCR)
# Alert: If cost/call > 2x normal (indicates cache miss or large tokens)
```

**Action**: Monitor cost-per-call trend

- If increasing: Investigate cache hit rate, token usage
- If stable: Good health indicator

**6.3: Token Usage Anomalies**

```bash
# Metric: CustomAI/InputTokens (average per call)
# Target: 300-500 tokens
# Alert: If >1000 tokens (suggests system prompt size issue)
```

**Action**: Add InputTokens monitoring

- Catch: System prompt bloat, verbose user inputs

**6.4: Cache Hit Rate Monitoring**

```bash
# Metric: CustomAI/CacheHitRate (percentage)
# Target: >90%
# Alert: If <80% (investigate cache key stability)
```

**Action**: Monitor cache hit rate weekly

- If dropping: Review code changes that might vary system prompt

---

## Strategy 7: Feature-Specific Optimizations

### Low-Confidence Picker (Smart Fallback)

**Cost Impact**: When confidence <0.6, show user picker instead of guessing

- Avoids: Paying Bedrock to improve marginal cases
- Benefit: User picks correct answer (higher quality)

```typescript
// ✅ GOOD: Accept low confidence, let user pick
if (confidence < 0.6) {
  return { alternatives, visualWarning: 'low_confidence_picker' };
}

// ❌ BAD: Increase tokens to improve confidence (costs more)
// const detailedPrompt = `${systemPrompt}\n${userContext}...`;
```

**Action**: Keep picker threshold at 0.6 (current setting)

### Batch Processing for Mobile Sync

**Cost Impact**: Sync multiple records in one Lambda invocation

- Reduces: Lambda cold starts (1 cold start per batch vs per item)
- Benefit: Lower Lambda compute costs

```typescript
// ✅ GOOD: Batch sync
const items = [item1, item2, item3]; // 3 items
await classifyItems(items); // 1 Lambda invocation, 1 cold start

// ❌ BAD: Individual sync
await classifyItem(item1); // Cold start #1
await classifyItem(item2); // Cold start #2
await classifyItem(item3); // Cold start #3
```

**Action**: W8 mobile sync should batch requests when possible

- Target: 10-50 items per Lambda invocation (balance latency vs cost)

---

## Cost Reduction Roadmap

### Phase C (Days 6-15)

- [x] Monitor costs in real-time (CloudWatch alarms)
- [x] Validate cache hit rate >90%
- [x] Ensure Textract free tier is not exceeded
- [x] Lambda memory = 512 MB (optimal)

### Production (Week 2+)

- [ ] Run cost audit (week 1): Any anomalies?
- [ ] Optimize prompts if cache hit <85%
- [ ] Monitor token usage trend (should be stable)
- [ ] Review cost-per-call monthly

### Growth Phase (>1000 calls/day)

- [ ] Consider Sonnet for complex classifications (cost trade-off)
- [ ] Evaluate S3 Intelligent-Tiering (if image volume >50GB)
- [ ] Batch OCR processing for bulk operations
- [ ] Consider DynamoDB provisioned mode (if calls >30k/day)

---

## Cost Monitoring Dashboard

### Weekly Cost Review (Every Monday)

```bash
# 1. Check CloudWatch custom metrics
aws cloudwatch get-metric-statistics \
  --namespace CustomAI \
  --metric-name AICallCost \
  --start-time $(date -u -d '7 days ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 86400 \
  --statistics Sum

# 2. Compare to projection
# Free tier:   Should be ~$1.80 for 300 calls (10/day × 30)
# Premium:     Should be ~$180 for 30,000 calls (1000/day × 30)

# 3. Check cache hit rate
aws cloudwatch get-metric-statistics \
  --namespace CustomAI \
  --metric-name CacheHitRate \
  --start-time $(date -u -d '7 days ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 86400 \
  --statistics Average

# Target: >90%

# 4. Check token usage
aws cloudwatch get-metric-statistics \
  --namespace CustomAI \
  --metric-name InputTokens \
  --start-time $(date -u -d '7 days ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 86400 \
  --statistics Average

# Target: 300-500 tokens/call
```

### Monthly Cost Report (1st of month)

```bash
#!/bin/bash

echo "=== AI Lambda Monthly Cost Report ==="
echo "Date: $(date +%Y-%m-%d)"
echo ""

# Total API calls
CALLS=$(aws logs insights --log-group-name /aws/lambda/classify-food-lambda \
  --query 'fields @timestamp | stats count() as total')
echo "Total calls: $CALLS"

# Total cost
COST=$(aws logs insights --log-group-name /aws/lambda/classify-food-lambda \
  --query 'fields costUsd | stats sum(costUsd) as total')
echo "Total cost: $COST"

# Average cost/call
AVG=$(echo "$COST / $CALLS" | bc -l)
echo "Avg cost/call: \$$AVG"

# Cache hit rate
CACHE=$(aws logs insights --log-group-name /aws/lambda/classify-food-lambda \
  --query 'fields cacheHit | stats avg(cacheHit) * 100 as percent')
echo "Cache hit rate: $CACHE%"

# Comparison to projection
PROJECTED=$((CALLS * 30 / 1000 * 180))  # Assuming $180/month at 1000 calls/day
echo "Projected cost (if this rate all month): \$$PROJECTED"
```

---

## Emergency Cost Controls

**If daily cost > 5x projection:**

1. **Immediate (< 5 minutes)**
   - Check CloudWatch dashboard for spikes
   - Review Lambda logs for error loops (bad prompt?)
   - Check cache hit rate (should be >80%)

2. **Quick Fix (< 30 minutes)**

   ```bash
   # Flip to mock client (instant, no charges)
   # Update Lambda code:
   # const USE_MOCK_BEDROCK = true;
   # Deploy: aws lambda update-function-code ...
   ```

3. **Investigation (1 hour)**
   - What changed in last 24 hours? (code, prompts, traffic)
   - Are tokens per call abnormal? (check CloudWatch metrics)
   - Is cache working? (should be >90%)

4. **Resolution (2 hours)**
   - Fix root cause (code bug, prompt size, etc.)
   - Verify fix (run health check)
   - Monitor for 1 hour before resuming

---

## ROI Summary

| Strategy                                | Effort | Cost Savings         | ROI         | Priority |
| --------------------------------------- | ------ | -------------------- | ----------- | -------- |
| Maximize cache hit rate (>90%)          | Low    | 6.7x on cache tokens | Excellent   | P0       |
| Stable system prompt                    | Low    | 6-7x                 | Excellent   | P0       |
| Textract free tier (stay <1000/mo)      | Low    | Free OCR             | Excellent   | P1       |
| Lambda 512 MB (not 1024)                | None   | 10% compute          | Good        | P1       |
| S3 lifecycle (delete -resized after 7d) | Low    | 50% storage          | Good        | P1       |
| Cost monitoring & alerts                | Medium | Prevent spikes       | Excellent   | P1       |
| Batch mobile sync                       | High   | 20% Lambda           | Good        | P2       |
| Intelligent-Tiering (if >50GB)          | Low    | TBD                  | Conditional | P3       |

---

**Last Updated**: 2026-04-27  
**Next Review**: Monthly with cost report  
**Owner**: W4 AI Team + Finance Team
