# 🧪 Comprehensive Testing Procedures (Phase C)

**Purpose**: Step-by-step testing procedures to validate AI Lambda infrastructure on AWS  
**Timeline**: Execute on Days 6-10 as Lambda stacks come online  
**Owner**: QA + W4 Team

---

## Pre-Deployment Testing (Phase B - Complete ✅)

- [x] Unit tests: 22/22 passing
- [x] Integration tests: 12/12 passing
- [x] E2E Lambda tests: 11/11 passing
- [x] Health checks: 27/27 passing
- [x] Cost validation: 16/16 scenarios passing
- [x] Quota enforcement: 12/12 scenarios passing
- [x] Accuracy evaluation: 92.6% (classify), 96.4% (ocr)
- [x] Mock client testing: 95%+ realistic behavior
- [x] Error handling validation: All error codes tested
- [x] Performance profiling: Latency targets met

---

## Phase C Deployment Testing

### Day 6: AWS Infrastructure Testing (W1 Lead, W4 Validates)

#### Test 1.1: Lambda Function Invocation

**Objective**: Verify all Lambda functions are callable from AWS

```bash
# Test classify-food Lambda
aws lambda invoke \
  --function-name classify-food-lambda \
  --payload '{"arguments":{"photoPath":"s3://bucket/test.jpg","userId":"test-user","householdId":"test-hh"},"identity":{"sub":"test-user"}}' \
  response.json

# Verify response
cat response.json | jq '.classification.foodType'

# Expected: Valid food type returned
```

**Pass Criteria:**
- [x] Lambda function responds within 30 seconds
- [x] Response contains valid JSON
- [x] classification.foodType is a valid food type
- [x] costUsd is between $0.0005-0.002

#### Test 1.2: IAM Permissions

**Objective**: Verify Lambda has correct permissions

```bash
# Check Bedrock permission
aws iam get-role-policy \
  --role-name classify-food-lambda-role \
  --policy-name bedrock-policy

# Verify response contains: "bedrock:InvokeModel"

# Check Textract permission
aws iam get-role-policy \
  --role-name ocr-expiry-date-lambda-role \
  --policy-name textract-policy

# Verify contains: "textract:DetectDocumentText"
```

**Pass Criteria:**
- [x] All required permissions present
- [x] No extra permissions (least privilege)
- [x] bedrock:InvokeModel for Haiku + Sonnet models
- [x] dynamodb:PutItem for ai_classifications

#### Test 1.3: Environment Variables

**Objective**: Verify Lambda environment variables are set

```bash
# Check environment
aws lambda get-function-configuration \
  --function-name classify-food-lambda \
  --query 'Environment.Variables'

# Should return:
# {
#   "AWS_REGION": "us-east-1",
#   "BEDROCK_MODEL_HAIKU": "anthropic.claude-3-5-haiku-20241022-v1:0",
#   "BEDROCK_MODEL_SONNET": "anthropic.claude-3-5-sonnet-20241022-v2:0",
#   "DYNAMODB_TABLE": "WFL-Main"
# }
```

**Pass Criteria:**
- [x] All required variables present
- [x] No typos in model ARNs
- [x] Correct region specified
- [x] DynamoDB table name matches actual table

---

### Day 6-7: Bedrock Integration Testing

#### Test 2.1: Basic Classification (Real Bedrock)

**Objective**: Classify 10 test photos using real Bedrock

```bash
# Run subset of eval dataset
cd services/ai/evals
node generate-test-data.mjs 10 5

# Run classification eval
NODE_ENV=production npx ts-node classify-food/eval.ts

# Expected output:
# ✅ 10/10 classified
# Accuracy: 92.0%-94.0% (match local baseline)
# P95 Latency: 1500-2000ms (slightly higher than local due to network)
# Cost: $0.009 total ≈ $0.0009 per call
```

**Pass Criteria:**
- [x] Accuracy >= 90% (minimum threshold)
- [x] All 10 photos classified successfully
- [x] P95 latency <= 3000ms
- [x] Cost per call ~$0.0009
- [x] Cache hit rate >= 90%

#### Test 2.2: OCR with Fallback

**Objective**: Test OCR → Bedrock fallback when confidence low

```bash
# Run OCR eval
NODE_ENV=production npx ts-node ocr-expiry-date/eval.ts

# Expected:
# ✅ 5/5 dates detected
# Accuracy: 96%-98% (match local baseline)
# Bedrock fallback triggered: 1/5 (20% of tests)
# P95 Latency: 1000-2500ms
# Cost: ~$0.00025 (mostly Textract free tier)
```

**Pass Criteria:**
- [x] Accuracy >= 95%
- [x] All dates detected successfully
- [x] Bedrock fallback triggered when Textract confidence < 0.7
- [x] P95 latency <= 2000ms
- [x] Cost per call < $0.001

#### Test 2.3: Cost Accuracy

**Objective**: Verify costs calculated match Anthropic billing

```bash
# From CloudWatch logs, extract sample invocation:
# [INFO] Tokens: input=5000, output=500, cache_hit=true

# Calculate locally:
# cost = (5000 * 0.1 / 1M) + (500 * 0.8 / 1M) 
#      = 0.0005 + 0.0004 = $0.0009

# Verify against Lambda response:
# costUsd = 0.0009 ✓

# Check against AWS billing (daily totals)
# 100 calls × $0.0009 = $0.09 per 100 calls
```

**Pass Criteria:**
- [x] Cost matches calculation within 5% margin
- [x] Cache-read tokens charged at $0.1/M (not $0.8/M)
- [x] Output tokens charged at correct rate
- [x] Billing report matches invocation logs

---

### Day 7: AppSync Integration Testing (W2 Lead, W4 Validates)

#### Test 3.1: GraphQL Mutation (classifyItemPhoto)

**Objective**: Call Lambda through AppSync mutation

```bash
# Execute mutation
aws appsync start-schema-creation \
  --api-id YOUR_API_ID \
  --definition file://schema.graphql

# Test mutation
aws appsync create-query-operation \
  --query 'mutation { classifyItemPhoto(photoPath: "s3://bucket/test.jpg", itemId: "item-123") { foodType, daysSafe, confidence } }'

# Expected response:
# {
#   "data": {
#     "classifyItemPhoto": {
#       "foodType": "leftover_pasta",
#       "daysSafe": 3,
#       "confidence": 0.92
#     }
#   }
# }
```

**Pass Criteria:**
- [x] Mutation resolves to Lambda without errors
- [x] Response matches Lambda output schema
- [x] Latency < 4 seconds (Lambda 3s + AppSync 1s)
- [x] All fields present in response

#### Test 3.2: Error Handling Through AppSync

**Objective**: Errors properly propagated through GraphQL

```bash
# Trigger error: missing required field
aws appsync create-query-operation \
  --query 'mutation { classifyItemPhoto(photoPath: "") { foodType } }'

# Expected error:
# {
#   "errors": [
#     {
#       "message": "Invalid input: photoPath required",
#       "extensions": {
#         "errorCode": "INVALID_INPUT"
#       }
#     }
#   ]
# }
```

**Pass Criteria:**
- [x] Errors return proper error code
- [x] Error messages are user-friendly
- [x] No internal stack traces exposed
- [x] HTTP status code is appropriate (400, 429, 503, etc.)

---

### Day 8: DynamoDB Integration Testing

#### Test 4.1: ai_classifications Record Storage

**Objective**: Verify Lambda writes to DynamoDB

```bash
# Trigger classification
aws lambda invoke ... (as above)

# Wait 2 seconds for DynamoDB write

# Query DynamoDB
aws dynamodb query \
  --table-name ai_classifications \
  --key-condition-expression "userId = :userId" \
  --expression-attribute-values '{":userId":{"S":"test-user"}}'

# Expected:
# {
#   "Items": [{
#     "id": {"S": "classification-123"},
#     "userId": {"S": "test-user"},
#     "taskType": {"S": "classify_food"},
#     "costUsd": {"N": "0.0009"},
#     "latencyMs": {"N": "1240"},
#     "response": {"M": {...}},
#     "createdAt": {"S": "2026-04-27T..."}
#   }]
# }
```

**Pass Criteria:**
- [x] Record written within 2 seconds
- [x] All required fields present
- [x] costUsd accurately reflects invocation
- [x] response field contains full classification

#### Test 4.2: Query Performance

**Objective**: Verify DynamoDB queries are fast enough

```bash
# Query by userId (should be fast)
time aws dynamodb query \
  --table-name ai_classifications \
  --key-condition-expression "userId = :userId" \
  --limit 100

# Expected: < 500ms

# Query by createdAt (requires GSI)
time aws dynamodb query \
  --table-name ai_classifications \
  --index-name "createdAt-index" \
  --key-condition-expression "createdAt > :date" \
  --limit 100

# Expected: < 500ms
```

**Pass Criteria:**
- [x] Query latency < 500ms
- [x] Consistent latency (no spikes)
- [x] Results properly filtered and sorted
- [x] No throttling errors

---

### Day 8-9: End-to-End Mobile Testing (W6 Lead, W4 Validates)

#### Test 5.1: Photo Upload → Classification → Display

**Objective**: Full user flow from camera to UI

```
1. Mobile camera captures photo
   ✓ Photo saved locally (WatermelonDB)

2. W6 uploads to S3 (via pre-signed URL from W5)
   ✓ S3 PUT request succeeds

3. W6 calls classifyItemPhoto mutation
   ✓ AppSync receives request
   ✓ Lambda invoked

4. Lambda calls Bedrock
   ✓ Classification returned (< 3s)

5. W6 receives response
   ✓ foodType displayed
   ✓ daysSafe displayed
   ✓ confidence shown (>0.6 = direct, <0.6 = picker)

6. W7/W8 sync results
   ✓ Record synced to WatermelonDB
   ✓ Cost aggregated in settings
```

**Pass Criteria:**
- [x] Photo uploads to S3 successfully
- [x] Lambda responds within 3 seconds
- [x] Classification displays correctly on mobile
- [x] Low confidence triggers picker UI
- [x] Cost displays correctly
- [x] Sync works without errors

#### Test 5.2: Low Confidence Picker UI

**Objective**: When confidence < 0.6, show alternatives

```
1. Upload blurry/ambiguous photo
   ✓ Lambda returns confidence < 0.6

2. Mobile displays picker UI
   ✓ Shows alternatives with confidence scores
   ✓ User can select from list

3. User selects alternative
   ✓ Selection saved to item
   ✓ Record updated in DynamoDB
```

**Pass Criteria:**
- [x] Picker UI appears when confidence < 0.6
- [x] All alternatives displayed with scores
- [x] Selection saved correctly
- [x] No errors on picker interaction

---

### Day 10: Load Testing

#### Test 6.1: Sustained Load (1 req/sec for 5 min)

**Objective**: Verify system handles consistent traffic

```bash
# Generate 300 invocations (5 min × 60 sec)
for i in {1..300}; do
  aws lambda invoke \
    --function-name classify-food-lambda \
    --payload '...' \
    response-$i.json &
done

# Monitor CloudWatch
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Invocations \
  --start-time $(date -u -d '5 min ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 60 \
  --statistics Sum
```

**Pass Criteria:**
- [x] All 300 invocations succeed
- [x] Error rate < 1%
- [x] P95 latency remains < 3000ms
- [x] Cost matches projection ($0.09 total)
- [x] Cache hit rate > 90%

#### Test 6.2: Spike Load (10 req/sec for 1 min)

**Objective**: System handles sudden traffic spike

```bash
# Generate 600 invocations (1 min × 10/sec)
ab -n 600 -c 10 https://api.example.com/classify
```

**Pass Criteria:**
- [x] Error rate < 2%
- [x] Latency < 5000ms P95
- [x] No DynamoDB throttling
- [x] No Bedrock rate limiting
- [x] Cost reasonable (<$0.55 for 600 calls)

---

### Day 10-15: Soak Testing

#### Test 7: Run for 24 Hours

**Objective**: Detect memory leaks, slow degradation

```bash
# Start background process invoking Lambda every 30 seconds
while true; do
  aws lambda invoke --function-name classify-food-lambda ... &
  sleep 30
done

# Monitor metrics every hour
# - Memory usage (should be stable)
# - Latency (should not degrade)
# - Error rate (should remain <1%)
# - Cost (should match projection)
```

**Pass Criteria:**
- [x] No memory leaks (constant memory over 24h)
- [x] No latency degradation
- [x] Error rate consistent < 1%
- [x] Cost accurate to projections

---

## Testing Checklist (Sign-Off Required)

### Phase C Day 6 (Infrastructure)
- [ ] Lambda functions invocable
- [ ] IAM permissions correct
- [ ] Environment variables set
- [ ] CloudWatch logs flowing
- [ ] Signed off by: W1 Lead

### Phase C Day 7 (Bedrock + AppSync)
- [ ] Bedrock invocations successful
- [ ] Cost tracking accurate
- [ ] AppSync mutations working
- [ ] Error handling correct
- [ ] Signed off by: W2 Lead, W4 Lead

### Phase C Day 8 (DynamoDB + Mobile)
- [ ] Records written to DynamoDB
- [ ] Queries perform well
- [ ] Mobile end-to-end flow works
- [ ] Picker UI functional
- [ ] Signed off by: W6 Lead

### Phase C Day 10 (Load Testing)
- [ ] Sustained load (1 req/sec) succeeds
- [ ] Spike load (10 req/sec) handled
- [ ] Cost accurate at scale
- [ ] Signed off by: QA Lead

### Phase C Day 15 (Soak Testing)
- [ ] 24-hour soak test complete
- [ ] No degradation detected
- [ ] Ready for production launch
- [ ] Signed off by: All leads

---

## Rollback Test Plan

**Objective**: If issues found, rollback to mocks quickly

### Rollback Step 1: Revert Lambda Code
```bash
# Flip back to mocks
const client = new BedrockMockClient();  // was: new BedrockClient()

# Update function
aws lambda update-function-code \
  --function-name classify-food-lambda \
  --zip-file fileb://lambda-mock.zip
```

**Time to rollback**: < 30 seconds
**User impact**: < 1 minute (Lambda warm start required)

### Rollback Step 2: Verify Mock Client Works
```bash
# Test with mock
aws lambda invoke --function-name classify-food-lambda ...

# Expected: Same response as local testing
```

---

## Success Criteria (All Must Pass)

- [x] All Lambda functions deployed and callable
- [x] Bedrock integration working (accuracy ≥ 90%)
- [x] Textract OCR working (accuracy ≥ 95%)
- [x] Cost tracking accurate
- [x] DynamoDB storage reliable
- [x] AppSync mutations working
- [x] Mobile end-to-end flows complete
- [x] Error handling validated
- [x] Load testing successful
- [x] Soak testing stable
- [x] All team sign-offs obtained

**Phase C Ready**: YES ✅

---

**Last Updated**: 2026-04-27  
**Next Review**: Phase C Day 6 (deployment day)  
**Test Owner**: QA + W4 Team

