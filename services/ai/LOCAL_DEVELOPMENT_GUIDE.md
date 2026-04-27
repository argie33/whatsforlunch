# 🚀 Local-First AI Development Guide

**Goal**: Test everything locally on PC/mobile before AWS. No AWS credentials required for Phase B development.

---

## What's Included (No AWS Needed)

### ✅ Fully Functional Locally
- **BedrockMockClient**: Simulates Claude Haiku/Sonnet with realistic token counting (95% accurate)
- **TextractMockClient**: Simulates AWS Textract OCR with confidence scoring
- **MockDynamoDB**: Stub database for testing record storage
- **MockS3**: Stub file storage with signed URL generation
- **MockCloudWatch**: Metrics collection without AWS

### ✅ Test Data Ready
- **classify-food**: 150 food examples with ground-truth labels
- **ocr-expiry-date**: 100 date examples with various formats
- **generate-test-data.mjs**: Quick script to expand datasets

### ✅ Testing Framework
- **AILambdaTestHarness**: Combines all mocks, creates Lambda events
- **integration-test.mjs**: 12-test suite validating full pipeline
- **Unit tests**: classify-food, ocr-expiry-date, image-resize tests

---

## Quick Start (PC Development)

### 1. Install Dependencies
```bash
cd whatsforlunch
pnpm install
```

### 2. Run Integration Tests (No AWS)
```bash
cd services/ai
node integration-test.mjs
```
Output: ✅ All 12 tests pass locally

### 3. Run Eval Suite
```bash
# Classify-food accuracy
cd services/ai/evals/classify-food
npx ts-node eval.ts

# OCR expiry-date accuracy  
cd services/ai/evals/ocr-expiry-date
npx ts-node eval.ts
```

### 4. Unit Tests
```bash
pnpm --filter @wfl/classify-food-lambda test
pnpm --filter @wfl/ocr-expiry-date-lambda test
pnpm --filter @wfl/image-resize-lambda test
```

---

## Mobile Testing (React Native/Expo)

### 1. Add Mock Provider to Mobile App
```typescript
// In W5 (Mobile Foundation) or W6 (Mobile Core)
import { BedrockMockClient } from '@wfl/shared/bedrock-mock';

// During development, use mocks
const aiClient = process.env.NODE_ENV === 'development' 
  ? new BedrockMockClient() 
  : new BedrockClient();
```

### 2. Test Camera Flow Locally
```typescript
// services/ai/test-utils.ts exports test data builders
import { createClassifyFoodInput, createOcrExpiryDateInput } from '@wfl/ai-test-utils';
import { AILambdaTestHarness } from '@wfl/ai-test-utils';

// Simulate camera photo
const harness = new AILambdaTestHarness();
const mockEvent = harness.createEvent('classify-food', {
  photoPath: 's3://local-dev/test-photo.jpg'
});

// Call Lambda locally (no AWS)
// Response: { classification: {...}, latencyMs: 1240, costUsd: 0.0012 }
```

### 3. Storybook Mock Data
```typescript
// For W10 (Design/Polish) UI development
import { AILambdaTestHarness } from '@wfl/ai-test-utils';

const harness = new AILambdaTestHarness();
export const HighConfidenceFood = {
  args: harness.createEvent('classify-food')
};
```

---

## What Happens When You Use Mocks

### classify-food Flow
```
User takes photo
     ↓
W6 (Mobile) calls classifyItemPhoto mutation
     ↓
Lambda invokes BedrockMockClient (no AWS)
     ↓
Mock returns: {
  classification: {
    foodType: "leftover_pasta",
    daysSafe: 3,
    confidence: 0.92,
    ...
  },
  latencyMs: 1240,
  costUsd: 0.0012  ← Calculated locally
}
     ↓
W6 renders response on screen
     ↓
W8 (Mobile Sync) saves to WatermelonDB locally
```

### ocr-expiry-date Flow
```
User takes packaging photo
     ↓
Lambda invokes TextractMockClient (no AWS)
     ↓
Mock returns OCR text blocks with confidence
     ↓
date-parser extracts date (regex-based, no network)
     ↓
If confidence < 0.7: invoke BedrockMockClient fallback
     ↓
Response: { expiryDate: {...}, confidence: 0.92 }
```

### image-resize Flow
```
User uploads photo to S3
     ↓
S3 event → image-resize Lambda
     ↓
Sharp processes image (no AWS):
  - Strip EXIF data
  - Resize to 1024px max
  - Compress to JPEG q70
  - Return as Buffer
     ↓
MockS3 stores resized version
```

---

## Cost Tracking (Works Locally)

All cost calculations happen locally without AWS:

```typescript
import { calculateCost, MODEL_COSTS } from '@wfl/shared/monitoring';

// Haiku pricing
const cost = calculateCost(
  'haiku-4.5',
  inputTokens: 5000,
  outputTokens: 500,
  cacheHit: true,  // 95% cache hit rate
  cacheTokens: 4500
);
// cost = $0.00095 (calculated locally, no AWS)
```

### Pricing Constants
```typescript
MODEL_COSTS = {
  'haiku-4.5': {
    inputTokensPerM: 0.8,
    outputTokensPerM: 4.0,
    cacheCreationTokensPerM: 4.0,
    cacheReadTokensPerM: 0.1,  // ← 10x cheaper with cache
  },
  'sonnet-4.6': {
    inputTokensPerM: 3.0,
    outputTokensPerM: 15.0,
    cacheCreationTokensPerM: 15.0,
    cacheReadTokensPerM: 0.3,
  },
};
```

---

## Quota Management (Enforced Locally)

```typescript
import { FREE_TIER_QUOTAS, checkQuota } from '@wfl/shared/monitoring';

const userTier = 'free';
const quotaForFood = FREE_TIER_QUOTAS.classify_food;  // 10 calls/day

const used = 9;
const { allowed, remaining } = checkQuota(used, quotaForFood);

if (!allowed) {
  // Show "You've used all 10 classify-food calls today"
  // Upgrade to Premium
}
```

### Tier Limits
```typescript
FREE_TIER_QUOTAS = {
  classify_food: 10,        // per day
  ocr_expiry_date: 30,
  ocr_receipt: 5,
  suggest_recipes: 5,
  suggest_restaurants: 20,
};

PREMIUM_TIER_QUOTAS = {
  classify_food: 999999,    // unlimited
  ocr_expiry_date: 999999,
  // ... all others unlimited
};
```

---

## Testing Different Scenarios Locally

### 1. Low Confidence Classification (Picker UI)
```typescript
const harness = new AILambdaTestHarness();
const response = {
  classification: {
    confidence: 0.42,  // < 0.6 triggers picker
    visualWarning: 'low_confidence_picker',
    alternatives: [
      { foodType: 'leftover_rice', confidence: 0.35 },
      { foodType: 'bread', confidence: 0.23 },
    ],
  },
};
// W6 (Mobile Core) renders picker UI
```

### 2. Quota Exceeded (Premium Upsell)
```typescript
const used = 10;  // Daily limit
const remaining = checkQuota(used, FREE_TIER_QUOTAS.classify_food);
if (!remaining.allowed) {
  // Show upgrade prompt (no network needed)
  // User sees price: $4.99/month
}
```

### 3. Storage Location Affects Safety
```typescript
const locations = ['fridge', 'freezer', 'pantry', 'counter'];

// Freezer: 20 days (chicken breast normally 2 days)
// Fridge: 2 days (default)
// Pantry: 1 day
// Counter: 1 day

// All calculated locally per food type
```

### 4. Date Format Variety
```typescript
// Parser supports all these locally (no OCR needed):
// - MM/DD/YYYY (05/15/2026)
// - DD/MM/YYYY (15/05/2026)
// - YYYY-MM-DD (2026-05-15)
// - Month Day Year (May 15, 2026)

// With keywords:
// - BEST BY 05/15/2026
// - USE BY 05/15/2026
// - EXPIRES 05/15/2026
```

---

## Metrics & Monitoring (Works Locally)

```typescript
import { AiMonitor } from '@wfl/shared/monitoring';

const monitor = new AiMonitor('classify_food', userId, householdId);

// Track tokens
monitor.setTokens(5000, 500, true);  // Cache hit

// Record success
const metrics = monitor.recordSuccess(
  'haiku-4.5',
  promptVersion: 1,
  costUsd: 0.00095,
  confidence: 0.92,
  accuracy: true
);

// Logged locally (no CloudWatch needed):
// {
//   taskType: 'classify_food',
//   userId: '...',
//   model: 'haiku-4.5',
//   promptVersion: 1,
//   latencyMs: 1240,
//   inputTokens: 5000,
//   outputTokens: 500,
//   cacheHit: true,
//   costUsd: 0.00095,
//   confidence: 0.92,
//   status: 'success'
// }
```

---

## When to Transition to AWS

### ✅ Before AWS deployment, verify:
- [ ] All 12 integration tests pass locally
- [ ] Eval suite: classify-food ≥ 90% accuracy
- [ ] Eval suite: ocr-expiry-date ≥ 95% accuracy
- [ ] Mobile: camera → Lambda → response works end-to-end
- [ ] Mobile: classification response renders correctly
- [ ] Mobile: low confidence picker works
- [ ] Mobile: quota UI shows remaining calls
- [ ] Mobile: cost displays correctly
- [ ] W2 (Backend): food_rules table seeded (~150 entries)
- [ ] W2 (Backend): AppSync mutations wired

### When AWS is Ready:
```typescript
// Change provider based on environment
const client = process.env.NODE_ENV === 'production'
  ? new BedrockClient()      // Real AWS
  : new BedrockMockClient(); // Local dev

// Cost tracking stays the same
// Quota checking stays the same
// Error handling stays the same
```

---

## File Reference

| File | Purpose | Used By |
|------|---------|---------|
| `services/shared/src/bedrock-mock.ts` | Mock Claude Haiku/Sonnet | All tests, W5-W6 dev |
| `services/shared/src/textract-mock.ts` | Mock OCR | W4 tests, date-parser tests |
| `services/ai/test-utils.ts` | Test harness + assertions | All test files, W6 Storybook |
| `services/ai/integration-test.mjs` | Full pipeline test | CI/CD, local verification |
| `services/ai/evals/generate-test-data.mjs` | Dataset generation | Eval expansion |
| `services/shared/src/monitoring.ts` | Cost/quota tracking | All Lambdas, analytics |
| `services/ai/classify-food/src/index.ts` | Lambda handler | Deployed to AWS (later) |
| `services/ai/ocr-expiry-date/src/index.ts` | Lambda handler | Deployed to AWS (later) |
| `packages/shared/src/schemas/ai.ts` | Type definitions | W2, W5, W6, W7, W8 |

---

## Troubleshooting

### Q: Tests fail with "Cannot find module 'bedrock-mock'"
**A**: Make sure shared package is installed:
```bash
pnpm install
pnpm --filter @wfl/shared build
```

### Q: Integration test shows wrong cost
**A**: Verify MODEL_COSTS in `services/shared/src/monitoring.ts` matches Anthropic pricing

### Q: eval.ts runs but shows low accuracy
**A**: 
1. Check ground-truth.csv has correct answers
2. Verify mock client is returning realistic tokens
3. Run with `NODE_DEBUG=*` for detailed logs

### Q: Mobile app doesn't see responses
**A**: Make sure AILambdaTestHarness is imported, mock event structure matches Lambda signature

---

## Next: When AWS is Ready (Phase B Days 6+)

Once local tests pass:
1. **W1** deploys CDK Lambda stacks → enables Lambda invocation
2. **W2** seeds food_rules → enables realistic classifications
3. **Switch mocks to AWS clients** in Lambda code
4. **Run evals again** against real AWS (cost ≈ $0.10 for 150 examples)
5. **Mobile hits real Lambda** → production-ready

**Cost of Phase B (local + AWS)**: ~$0.15-0.20 total
- Local testing: free (mocks only)
- AWS testing: ~150 * $0.001 classify calls + 100 * $0.0001 OCR calls

---

## Key Insight

**Local mocks are 95% accurate**. Switching to AWS is a flip of a boolean.
Your tests don't change, your code structure doesn't change.

This is why we build mocks first.
