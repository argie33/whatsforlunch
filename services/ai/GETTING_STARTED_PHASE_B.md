# 🚀 Phase B Getting Started (Days 4-15)

**Status**: W4 Phase A complete. Ready to build Phase B with W1, W2, W3, W5, W6.

## Quick Start (Local Development)

### 1. Clone & Install
```bash
git clone <repo>
cd whatsforlunch
pnpm install
pnpm typecheck  # Should pass ✅
```

### 2. Run Tests Locally (No AWS)
```bash
# Unit tests (mocked Bedrock/Textract)
pnpm --filter @wfl/classify-food-lambda test
pnpm --filter @wfl/ocr-expiry-date-lambda test

# Date parser tests
cd services/ai/ocr-expiry-date
npx node --test --loader=ts-node/esm src/date-parser.test.ts
```

### 3. Run Evaluation Suite (Local)
```bash
# Classify food (uses ground-truth.csv + mock Bedrock)
cd services/ai/evals/classify-food
npx ts-node eval.ts

# OCR expiry dates (uses ground-truth.csv + mock Textract)
cd services/ai/evals/ocr-expiry-date
npx ts-node eval.ts
```

Expected output:
```
╔══════════════════════════════════════════════════════════╗
║ AI Evaluation Report                                     ║
╚══════════════════════════════════════════════════════════╝

Task:        classify-food
Model:       haiku-4.5
Dataset:     41 examples

📊 Accuracy
   Overall:  92.68%

⏱️  Latency (ms)
   P50:      245
   P95:      450
   P99:      520
   Mean:     280

💰 Cost
   Input:    15,230 tokens
   Output:   3,890 tokens
   USD:      $0.0094

📈 Regression Check
   ✓ No regression detected
```

---

## Dependencies by Worker (Blocking Chain)

### 🟦 **W1 (Infrastructure)** — Blocking W4 Phase B
**What W4 needs:**
- [ ] CDK Lambda stacks deployed (classify-food, ocr-expiry-date, image-resize)
- [ ] S3 bucket created + event notifications for image-resize
- [ ] IAM roles: bedrock:InvokeModel, textract:*, s3:GetObject, dynamodb:PutItem
- [ ] CloudWatch log groups created

**W4 can do meanwhile:**
- ✅ Write Lambda code locally + test with mocks
- ✅ Build eval framework + datasets
- ✅ Type definitions + contracts

**Unblock W4** → After you run:
```bash
pnpm --filter @wfl/infra cdk deploy --all --context env=dev-$(whoami)
```

---

### 🟨 **W2 (Backend)** — Blocking W4 Phase B (Lower priority)
**What W4 needs:**
- [ ] DynamoDB table: `food_rules` populated (~150 entries)
- [ ] DynamoDB table: `ai_classifications` entity created
- [ ] AppSync mutations wired to AI Lambdas:
  - `classifyItemPhoto(photoPath, itemId, hint) → ClassifyFoodResponse`
  - `ocrExpiryDate(photoPath, itemId) → OcrExpiryDateResponse`

**W4 can do meanwhile:**
- ✅ Use SAMPLE_FOOD_RULES (hardcoded in Lambda)
- ✅ Test Lambdas directly (not via AppSync)
- ✅ Write to DynamoDB locally (moto mock)

**Unblock W4** → After you:
1. Run migrations to create tables
2. Seed food_rules: `pnpm seed:dev`
3. Deploy AppSync resolvers

---

### 🟩 **W5 (Mobile Foundation)** — Medium priority
**What W4 needs:**
- [ ] S3 pre-signed upload URLs working
- [ ] Photo component: can take photo + return path
- [ ] Camera component with modes (QR, barcode, photo, date)

**W4 can do meanwhile:**
- ✅ Test with local file paths (mock S3)
- ✅ Test classifyFood Lambda directly

**Unblock W4** → After you:
1. Implement presignedPhotoUpload mutation
2. Deploy mobile camera component

---

## W4 Phase B Milestones

### Days 4-5: Local Development Ready
- [ ] All Lambdas compile: `pnpm typecheck`
- [ ] All unit tests pass: `pnpm --filter @wfl/services test`
- [ ] Eval suite runs locally
- [ ] Ground-truth datasets loaded (41 classify examples, 30 ocr examples)

### Days 6-8: Waiting on W1 CDK Deploy
**Meanwhile:**
- [ ] Optimize classify-food prompt
- [ ] Improve date parser for edge cases
- [ ] Expand eval datasets (target 100+ examples)
- [ ] Document Bedrock caching strategy

**When W1 deploys:**
- [ ] Deploy classify-food Lambda to dev
- [ ] Deploy ocr-expiry-date Lambda to dev
- [ ] Deploy image-resize Lambda to dev
- [ ] Test against real DynamoDB (instead of mocks)

### Days 9-12: Integration Testing
**With W2 food_rules seeded:**
- [ ] Update classify-food to load from DynamoDB (instead of SAMPLE)
- [ ] Run evals against real data
- [ ] Optimize Bedrock caching (target 95% hit rate)

**With W6 camera UI:**
- [ ] End-to-end test: mobile photo → classify-food Lambda → response
- [ ] Test confidence < 0.6 UI (alternatives picker)
- [ ] Test visual warning UI (mold/discoloration)

### Days 13-15: Production Readiness
- [ ] All CloudWatch alarms deployed
- [ ] Sentry capturing errors
- [ ] PostHog tracking classification accuracy
- [ ] Pre-launch checklist complete

---

## Code Structure (What You're Building)

```
services/
├── shared/
│   ├── src/bedrock.ts               # ✅ Real Bedrock client
│   ├── src/bedrock-mock.ts          # ✅ For local testing
│   ├── src/textract.ts              # ✅ Real Textract client
│   └── src/textract-mock.ts         # ✅ For local testing
├── ai/
│   ├── classify-food/
│   │   ├── src/index.ts             # Phase B: complete Lambda logic
│   │   ├── src/prompts.ts           # ✅ Prompt builders
│   │   └── src/index.test.ts        # ✅ Unit tests
│   ├── ocr-expiry-date/
│   │   ├── src/index.ts             # Phase B: complete Lambda logic
│   │   ├── src/date-parser.ts       # ✅ Date extraction
│   │   └── src/date-parser.test.ts  # ✅ Unit tests
│   ├── evals/
│   │   ├── classify-food/eval.ts    # ✅ Eval script (runnable!)
│   │   ├── ocr-expiry-date/eval.ts  # ✅ Eval script (runnable!)
│   │   └── shared/metrics.ts        # ✅ Metrics utils
│   └── PHASE_B_CHECKLIST.md         # Daily progress tracking
└── images/
    └── image-resize/
        └── src/index.ts             # Phase B: complete Lambda logic
```

---

## Testing Checklist (Before Each PR)

Before opening a PR from W4:

```bash
# 1. Type check everything
pnpm typecheck

# 2. Lint
pnpm lint

# 3. Run unit tests
pnpm --filter @wfl/classify-food-lambda test
pnpm --filter @wfl/ocr-expiry-date-lambda test

# 4. Run eval suite
cd services/ai/evals/classify-food && npx ts-node eval.ts
cd services/ai/evals/ocr-expiry-date && npx ts-node eval.ts

# 5. Check accuracy thresholds
# - classify-food: >= 90%
# - ocr-expiry-date: >= 95%
```

---

## Common Tasks

### Task: Improve Classification Accuracy
1. Edit `services/ai/classify-food/src/prompts.ts`
2. Bump `CLASSIFY_FOOD_PROMPT_VERSION`
3. Run evals: `npx ts-node evals/classify-food/eval.ts`
4. If accuracy drops > 2%, revert and try again
5. Commit with message: `feat(ai): improve classify-food prompt (v2 → v3)`

### Task: Add More Eval Data
1. Add rows to `services/ai/evals/classify-food/ground-truth.csv`
   - Columns: photoPath, foodType, daysSafe, storageLocation, category
2. Add rows to `services/ai/evals/ocr-expiry-date/ground-truth.csv`
   - Columns: photoPath, expectedDate, dateFormat, confidence
3. Run evals again to see impact

### Task: Debug a Lambda Locally
```typescript
// services/ai/classify-food/src/index.test.ts
import { handler } from './index';

const event = {
  arguments: {
    photoPath: 's3://bucket/photo.jpg',
    userId: 'user-123',
    householdId: 'household-456',
    itemId: 'item-789',
    storageLocation: 'fridge',
    userTimeZone: 'America/Los_Angeles',
  },
  identity: mockIdentity,
};

const result = await handler(event);
console.log(result);
```

Then run:
```bash
npx ts-node -e "import('./src/index.test.ts')"
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Cannot find module @wfl/shared" | Run `pnpm install` in root |
| Eval shows 0% accuracy | Check ground-truth.csv columns match |
| Bedrock call fails locally | Use mock client: it's in NODE_ENV=development |
| "textract-mock not found" | Import: `import { TextractMockClient } from '@wfl/services-shared/textract-mock'` |
| Dates parsing wrong | Add test case to `date-parser.test.ts`, fix regex |

---

## Next Steps

1. **Pull latest main** (W1/W2 might have changes)
   ```bash
   git pull origin main
   pnpm install
   ```

2. **Run tests locally** to ensure everything works
   ```bash
   pnpm typecheck && pnpm test
   ```

3. **Check eval baseline** (should pass with mocks)
   ```bash
   npx ts-node services/ai/evals/classify-food/eval.ts
   ```

4. **Wait for W1 CDK deploy** (Days 4-5)
   - Once deployed, switch from mocks to real Bedrock/Textract

5. **Coordinate with W2** (Days 6-8)
   - Once food_rules seeded, load from DynamoDB
   - Once AppSync wired, test mutations

6. **Integrate with W6** (Days 9-12)
   - Mobile camera flow → Lambda → response

---

## Code Review Checklist

Before opening a PR, make sure:
- [ ] All TypeScript compiles (`pnpm typecheck`)
- [ ] All tests pass (`pnpm test`)
- [ ] Eval accuracy meets targets (90%+ / 95%+)
- [ ] Latency P95 < SLA (3s / 2s)
- [ ] Cost < $0.001 per call
- [ ] No hardcoded AWS credentials
- [ ] No photos/sensitive data in code
- [ ] Commit message references issue (F-014, F-015, etc.)
- [ ] PR description includes acceptance criteria

---

**Ready to build?** Pick a task from PHASE_B_CHECKLIST.md and open a PR! 🚀
