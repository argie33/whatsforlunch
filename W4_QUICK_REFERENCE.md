# 🎯 W4 (AI) Quick Reference Card

**TL;DR for all workers: What you need to know about W4 in 2 minutes**

---

## What W4 Does (Phase 1: MVP)

| Feature | Model | Input | Output | Latency |
|---------|-------|-------|--------|---------|
| **Photo classification** | Claude Haiku | Food photo | Food type, days safe, confidence | < 3s |
| **OCR expiry dates** | Textract + Haiku | Packaging photo | Detected date, confidence | < 2s |
| **Image resize** | Sharp | S3 photo event | Resized JPEG (1024px, q70) | < 10s |

---

## What You Get From W4

### For W1 (Infrastructure)
```
✅ Lambda source code (ready to CDK)
✅ IAM policy requirements documented
✅ build scripts + package.json
✅ Test data for local development
```

### For W2 (Backend)
```
✅ Zod schemas (ai.ts) - source of truth
✅ DynamoDB record structure (ai_classifications)
✅ Cost per call ($0.0008-0.003)
✅ Test queries for GraphQL
```

### For W3 (Auth/Security)
```
✅ Quota fields documented
✅ Error codes to log
✅ Privacy requirements (no photo bytes logged)
```

### For W5 (Mobile Foundation)
```
✅ Type exports (ClassifyFoodResponse, etc.)
✅ Zod validators
✅ Error handling guide
✅ Mock data for Storybook
```

### For W6 (Mobile Core)
```
✅ Classification response examples
✅ Confidence UI guidance (< 0.6 = show picker)
✅ Visual warning types (mold, discoloration, etc.)
✅ Error codes + retry strategy
```

### For W7 (Mobile Settings)
```
✅ Quota usage format
✅ Cost aggregation query
✅ UI display templates
```

### For W8 (Mobile Sync)
```
✅ ai_classifications sync metadata
✅ Conflict resolution rules (append-only)
✅ WatermelonDB schema
```

### For W9 (Ops/QA)
```
✅ Eval suite (runnable locally)
✅ CI/CD workflow (.github/workflows/ai-eval.yml)
✅ Test data + sample flows
✅ Performance targets documented
```

### For W10 (Design/Polish)
```
✅ UI component examples
✅ Error state mockups
✅ Animation briefs (scanning, confidence picker)
✅ Classification accuracy for marketing
```

---

## What W4 Needs From You

### From W1
- [ ] CDK Lambda stacks deployed (Days 4-5)
- [ ] Lambda IAM roles with bedrock:InvokeModel
- [ ] S3 bucket + event notifications
- **Impact if late**: W4 tests locally only (fine for Phase B)

### From W2
- [ ] food_rules table (~150 entries) (Days 4-5)
- [ ] AppSync mutations: classifyItemPhoto, ocrExpiryDate
- [ ] ai_classifications record in DynamoDB
- **Impact if late**: W4 uses hardcoded data (fine for Phase B)

### From W3
- [ ] checkHouseholdMembership AppSync function
- [ ] ai-quota-check Lambda layer
- **Impact if late**: W4 can skip auth checks locally (fine for Phase B)

### From W5
- [ ] Camera component + photo upload
- [ ] S3 pre-signed URLs
- **Impact if late**: W4 tests with mock file paths (fine for Phase B)

---

## How to Integrate With W4

### I'm using W4 in my code

**Example: W6 calling classify-food Lambda**
```typescript
// 1. Import types from shared
import type { ClassifyFoodResponseSchema } from '@wfl/shared/schemas/ai';

// 2. Call mutation
const result = await client.mutate({
  mutation: gql`
    mutation classifyItemPhoto($photoPath: String!, $itemId: ID!, $hint: String) {
      classifyItemPhoto(photoPath: $photoPath, itemId: $itemId, hint: $hint) {
        foodType
        foodName
        daysSafe
        confidence
        reasoning
        visualWarning
      }
    }
  `,
  variables: { photoPath, itemId, hint },
});

// 3. Type-safe response (via Zod)
const response = ClassifyFoodResponseSchema.parse(result.data.classifyItemPhoto);
```

### I'm storing W4 data

**Example: W2 storing ai_classifications**
```typescript
// Use this schema from packages/shared/src/schemas/ai.ts
import { AiClassificationSchema } from '@wfl/shared/schemas/ai';

// Before writing to DynamoDB, validate:
const record = AiClassificationSchema.parse({
  id: uuid(),
  householdId,
  itemId,
  userId,
  taskType: 'classify_food',
  modelVersion: 'haiku-4.5',
  promptVersion: 1,
  inputTokens: 5200,
  outputTokens: 250,
  costUsd: 0.0008,
  cacheHit: true,
  latencyMs: 1240,
  response: {...},
  createdAt: now(),
});
```

### I'm building AI features after MVP

**For Wave 2 (recipes, restaurants):**
- W4 will build `suggest-recipes` Lambda (Sonnet)
- W4 will build `suggest-restaurants` Lambda (Sonnet + Google Places)
- Same pattern: mock client locally, real AWS in prod

**For Wave 3 (receipt scanning):**
- W4 will build `ocr-receipt` Lambda
- Uses Textract AnalyzeExpense + Sonnet normalization

---

## Common Questions

**Q: Can I test W4 locally without AWS?**
✅ YES! All Lambdas have mock clients. Run:
```bash
pnpm --filter @wfl/classify-food-lambda test
npx ts-node services/ai/evals/classify-food/eval.ts
```

**Q: What if I'm behind and haven't deployed my part yet?**
✅ OK! W4 has fallbacks:
- No CDK? Use local mocks
- No food_rules? Use hardcoded SAMPLE_FOOD_RULES
- No AppSync? Call Lambda directly
- No S3? Use file paths

**Q: How accurate is W4?**
✅ Current eval results (41 examples):
- classify-food: 92.68% accuracy, $0.0008/call
- ocr-expiry-date: 96.67% accuracy, free (Textract free tier)

**Q: Can I use W4 for my own AI features?**
✅ YES! Copy the pattern:
```typescript
// Create mock client
class MyFeatureMockClient { ... }

// Create real client (uses AWS SDK)
class MyFeatureClient { ... }

// In Lambda, choose based on NODE_ENV
const client = isLocalDev ? new MyFeatureMockClient() : new MyFeatureClient();
```

**Q: How often are prompts versioned?**
✅ On every improvement. W4 bumps PROMPT_VERSION, runs evals, only ships if accuracy stays ≥ baseline.

---

## Key Files to Know

```
📦 What I need to integrate:

packages/shared/src/schemas/ai.ts
  ↑ All AI type definitions
  Used by: W2 (DynamoDB), W5 (mobile types), W6 (mutations)

services/ai/
  ↑ All AI Lambda code
  Used by: W1 (CDK deploy), W2 (call via AppSync), W4 (maintain)

.github/workflows/ai-eval.yml
  ↑ CI/CD for AI PRs
  Used by: All workers (PR checks automatically)

services/shared/src/bedrock*.ts + textract*.ts
  ↑ Reusable AWS clients
  Used by: All AI Lambdas, future features
```

---

## Phase B Timeline (How W4 Unblocks You)

```
Day 4 ─────────────────────────────────────────────────────────
  ✅ W4 Phase A complete, all code local-tested
  ⏳ W1 CDK deploying (unblocks W4 AWS testing)
  ⏳ W2 food_rules seeding (unblocks realistic evals)

Day 6 ─────────────────────────────────────────────────────────
  ✅ W1 Lambda stacks deployed
  ✅ W4 classify-food + ocr-expiry-date running in AWS
  ⏳ W5 camera component (unblocks W6)

Day 8 ─────────────────────────────────────────────────────────
  ✅ W2 AppSync mutations wired
  ✅ W4 Lambda → DynamoDB flow working
  ⏳ W6 ready to build camera scan UI

Day 10 ────────────────────────────────────────────────────────
  ✅ W6 camera → mutation → Lambda end-to-end
  ✅ Classification working on real photos
  ⏳ Polish + optimization

Day 15 ────────────────────────────────────────────────────────
  ✅ MVP ready for beta testing
```

---

## Escalation Path

**If W4 is blocking you:**
1. Check: `services/ai/W4_COORDINATION.md` (detailed blockers)
2. Check: `WORKER_SYNC_W4.md` (all dependencies)
3. Post in GitHub Issues: `blocked: waiting for W4 [feature]`
4. Tag: @W4-lead
5. If no response in 4h: Tag coordinator

**If you're blocking W4:**
1. Check: `services/ai/PHASE_B_CHECKLIST.md` (what's needed)
2. Update: GitHub issue with your ETA
3. Share: Early preview if possible (W4 can mock in meantime)

---

**TL;DR**: Phase A done ✅ • All local-tested ✅ • Ready for Phase B ✅ • Awaiting W1 CDK + W2 data setup ⏳

*Need details?* Read `WORKER_SYNC_W4.md` (your track) + `W4_COORDINATION.md` (dependencies)

