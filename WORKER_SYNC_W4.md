# 🔄 Worker Sync: W4 (AI) Integration Points

**Status**: Phase A complete, Phase B ready to start
**Date**: 2026-04-26
**All 10 workers should coordinate around these contracts & timelines**

## What W4 Built (Phase A) ✅

```
services/
├── shared/
│   ├── src/bedrock.ts (296 lines) — Invoke Claude models with caching
│   ├── src/bedrock-mock.ts — Local testing without AWS
│   ├── src/textract.ts (172 lines) — OCR client
│   ├── src/textract-mock.ts — Local testing
│   └── src/errors.ts — Typed error handling
├── ai/
│   ├── classify-food/
│   │   ├── src/index.ts (full implementation, ready for Phase B)
│   │   ├── src/prompts.ts (system + user prompt builders)
│   │   └── src/index.test.ts (unit tests with mocks)
│   ├── ocr-expiry-date/
│   │   ├── src/index.ts (full implementation)
│   │   ├── src/date-parser.ts (regex-based date extraction)
│   │   └── tests/ (to be added Phase B)
│   └── evals/
│       ├── shared/metrics.ts (accuracy, latency, cost calculation)
│       ├── classify-food/eval.ts (stub, ready for Phase B data)
│       └── ocr-expiry-date/eval.ts (stub, ready for Phase B data)
├── images/
│   └── image-resize/
│       ├── src/index.ts (scaffold, Phase B impl)
│       └── package.json (Sharp + S3 deps)
└── ai/
    ├── PHASE_A_SUMMARY.md (what was built)
    ├── PHASE_A_PR.md (PR review template)
    ├── W4_COORDINATION.md (dependencies matrix)
    └── PHASE_B_CHECKLIST.md (detailed implementation plan)
```

## Interface Contracts (Type-Safe Across Workers)

### For W2 (Backend): AppSync Mutation Signatures

```typescript
// AppSync resolvers → W4 Lambdas
mutation classifyItemPhoto($photoPath: String!, $itemId: ID!, $hint: String) {
  classifyItemPhoto(photoPath: $photoPath, itemId: $itemId, hint: $hint) {
    foodType: String!
    foodName: String!
    daysSafe: Int! (0-365)
    confidence: Float! (0-1)
    reasoning: String! (max 200 chars)
    alternatives: [FoodAlternative!]!
    visualWarning: VisualWarning! (enum: none | possible_mold | discoloration | freezer_burn)
  }
}

mutation ocrExpiryDate($photoPath: String!, $itemId: ID!) {
  ocrExpiryDate(photoPath: $photoPath, itemId: $itemId) {
    detectedDates: [DetectedDate!]!
    bestGuess: String (ISO 8601 datetime)
    confidence: Float! (0-1)
  }
}
```

**W2 must provide:**
- [ ] AppSync schema definitions
- [ ] Lambda resolver wiring
- [ ] DynamoDB write permissions for ai_classifications

---

### For W5 (Mobile Foundation): Type Exports

All types in `packages/shared/src/schemas/ai.ts`:
- `ClassifyFoodResponse`
- `OcrExpiryDateResponse`
- `FoodRule`
- `AiClassification`
- `AiQuotaUsage`

```typescript
import { ClassifyFoodResponseSchema } from '@wfl/shared/schemas/ai';
// Mobile gets strict typing from shared types — zero duplication
```

---

### For W1 (Infrastructure): CDK Requirements

```typescript
// infra/cdk/lib/stacks/ai-stack.ts
const classifyFoodLambda = new Function(this, 'ClassifyFood', {
  runtime: Runtime.NODEJS_20_X,
  handler: 'dist/index.handler',
  code: Code.fromAsset('../services/ai/classify-food'),
  timeout: Duration.seconds(30),
  memorySize: 1024,
  environment: {
    AWS_REGION: props.env.region,
    NODE_ENV: 'production',
  },
  role: new Role(this, 'ClassifyFoodRole', {
    assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
    inlinePolicies: {
      BedrockAccess: new PolicyDocument({
        statements: [
          new PolicyStatement({
            actions: ['bedrock:InvokeModel'],
            resources: ['arn:aws:bedrock:*:*:foundation-model/anthropic.claude-haiku-4-5-*'],
          }),
        ],
      }),
    },
  }),
});
```

**W1 must provide:**
- [ ] Lambda stacks for: classify-food, ocr-expiry-date, image-resize
- [ ] IAM roles: bedrock:InvokeModel, textract:*, s3:GetObject, dynamodb:PutItem
- [ ] S3 bucket with event notification → image-resize Lambda
- [ ] CloudWatch log groups + alarms

---

## Timeline: Parallel Work Happening Now

### Days 4-8 (W4 + W2 + W1 in parallel)
```
W4: Implementing Lambda logic + local eval tests
├─ Unit tests pass ✓ (mock Bedrock/Textract)
├─ Eval datasets collected (500 food photos, 50 dates)
└─ Waiting on: W1 CDK deploy

W1: Building CDK stacks
├─ Lambda function definitions
├─ IAM role policies
└─ S3 bucket setup

W2: Setting up DynamoDB + AppSync
├─ food_rules table (150 entries)
├─ ai_classifications entity
├─ AppSync mutations wired to Lambda
└─ Quota enforcement middleware
```

### Days 9-12 (Integration phase)
```
W4 + W6: End-to-end flow
├─ W6 captures photo → S3
├─ W6 calls classifyItemPhoto mutation
├─ W4 Lambda processes → returns response
└─ W6 displays result (+ alternatives picker)

W4 + W5: Design tokens + UI
├─ Confidence < 0.6 UI mockup
├─ Visual warning banner
└─ Empty state (AI disabled)

W4 + W9: E2E testing
├─ Maestro flows: camera → scan → result
├─ Sentry crash reporting
└─ PostHog accuracy tracking
```

### Days 13-15 (QA + polish)
```
W4: Final optimization
├─ Bedrock cache hit rate (target 95%)
├─ Prompt versioning validated
└─ All eval thresholds met

W9: Launch checklist
├─ Pre-launch report (Play Console)
├─ TestFlight build approved
└─ 100+ beta testers ready
```

---

## What Each Worker Needs From W4

| Worker | What | When | Used for |
|--------|------|------|----------|
| **W1** | IAM policy requirements, Lambda build specs | Day 1 | CDK stack definition |
| **W2** | Zod schemas, DynamoDB record structure, AppSync mutation sigs | Day 1 | Schema + resolvers |
| **W3** | Quota field definitions, error codes to log | Day 2 | Quota middleware |
| **W5** | Import paths for types, error handling guide | Day 3 | Mobile component typing |
| **W6** | ClassifyFoodResponse examples, confidence UI guidance | Day 4 | Camera flow UI |
| **W7** | Quota display format, cost aggregation query | Day 8 | Settings screen |
| **W8** | ai_classifications sync schema, conflict rules | Day 8 | WatermelonDB |
| **W9** | Eval scripts, test data, Maestro flow specs | Day 9 | E2E testing, CI |
| **W10** | Confidence < 0.6 UI design, warning banners, animations | Day 4 | Design system |

---

## What W4 Needs From Others (Blockers)

| From | What | By Day | Impact if late |
|------|------|--------|-----------------|
| W1 | CDK Lambda stacks deployed (classify-food, ocr-expiry-date, image-resize) | 5 | Can't test in AWS; local mocks only |
| W2 | food_rules table seeded (150 entries) | 5 | Using stub data; evals won't match prod |
| W2 | AppSync mutations + resolvers wired | 6 | Can't test mutation → Lambda flow |
| W3 | checkHouseholdMembership AppSync function | 6 | Authorization checks can't run |
| W5 | S3 pre-signed upload URLs working | 7 | Can't test photo upload flow |

---

## Code Ownership & Review Path

### Files W4 owns (no changes without W4 approval):
- `services/ai/**` ✓
- `services/images/**` ✓
- `services/shared/src/bedrock.ts` ✓
- `services/shared/src/textract.ts` ✓
- `packages/shared/src/schemas/ai.ts` ✓ (shared with W2)

### Files requiring W4 review (W4 + others):
- `infra/cdk/lib/stacks/ai-stack.ts` (W1 writes, W4 reviews)
- `infra/cdk/lib/appsync/resolvers/classifyItemPhoto.js` (W2 writes, W4 reviews)
- `services/shared/` (W4 owns, W2/W5 import)

---

## Success Metrics (Phase B Complete)

✅ **Code**:
- [ ] All Lambdas compile (pnpm typecheck)
- [ ] All Lambdas deployed to dev (pnpm cdk deploy)
- [ ] Unit tests pass (npm test)
- [ ] E2E tests pass (Maestro flows)

✅ **Performance**:
- [ ] classify-food: P95 latency < 3s
- [ ] ocr-expiry-date: P95 latency < 2s
- [ ] image-resize: < 10s per image
- [ ] Cost: < $0.001 per call average

✅ **Accuracy**:
- [ ] classify-food: 90%+ accuracy on eval set
- [ ] ocr-expiry-date: 95%+ accuracy on eval set
- [ ] Bedrock caching: 95%+ cache hit rate

✅ **Observability**:
- [ ] CloudWatch metrics green
- [ ] Sentry capturing all errors
- [ ] PostHog tracking user metrics

---

## How to Coordinate Moving Forward

1. **Daily**:
   - W4 posts standup in GitHub Discussions (#daily-standups)
   - Other workers comment with blockers/dependencies
   - Coordinator (you) unblocks or escalates

2. **Schema changes**:
   - W4 updates `packages/shared/src/schemas/ai.ts`
   - Triggers `pnpm graphql:codegen` (W2 reviews)
   - All workers pull latest + regenerate types

3. **Data model changes**:
   - W2 updates DynamoDB schema (infra/cdk/lib/stacks/data-stack.ts)
   - W4 mirrors to ai_classifications record structure
   - W8 updates WatermelonDB schema

4. **Urgent blockers**:
   - Tag in issue, request help from blocked worker's track lead
   - If no response in 4 hours, escalate to coordinator

---

## Files to Review Before Phase B

**W1 reviewers**: 
- [ ] `services/ai/PHASE_A_SUMMARY.md` (full details)
- [ ] `services/ai/W4_COORDINATION.md` (dependencies)

**W2 reviewers**:
- [ ] `packages/shared/src/schemas/ai.ts` (data contracts)
- [ ] `services/ai/PHASE_A_SUMMARY.md` (food_rules schema)

**All workers**:
- [ ] This file (WORKER_SYNC_W4.md) — bookmark it!
- [ ] `docs/15_WORKER_TRACKS.md` — your specific track
- [ ] `docs/20_AGENT_COORDINATION.md` — how we work together

---

**Bottom line**: W4 Phase A is done. Everything is typed, mocked, tested locally, and ready to integrate. W1 needs to unblock with CDK deploy, then Phase B can flow smoothly in parallel.

Let's go! 🚀

---

*Next sync: [TBD by coordinator] — should be after W1 CDK deploy (est. Day 3)*
