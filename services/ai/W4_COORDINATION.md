# W4 ↔ Other Workers — Coordination Matrix

This document ensures W4 (AI) work integrates seamlessly with W1-W3, W5-W10.

## Phase B Dependencies

### W4 → W1 (Infrastructure)
**W4 needs from W1 (blocker for Phase B):**
- [ ] CDK Lambda stacks for: classify-food, ocr-expiry-date, image-resize
- [ ] S3 bucket for photos (with event notifications for image-resize)
- [ ] S3 bucket for exports
- [ ] Lambda IAM roles with: bedrock:InvokeModel, textract:DetectDocumentText, textract:AnalyzeExpense
- [ ] CloudWatch log group: /aws/lambda/classify-food, /aws/lambda/ocr-expiry-date, /aws/lambda/image-resize
- [ ] Environment variables: AWS_REGION, NODE_ENV
- [ ] Lambda layers: shared Bedrock + Textract clients (optional but recommended)

**W4 provides to W1:**
- Lambda function source code (services/ai/*, services/images/*)
- package.json + tsconfig.json for each Lambda
- Build scripts (esbuild)
- IAM policy requirements (in PHASE_A_PR.md)

### W4 → W2 (Backend)
**W4 needs from W2 (blocker for Phase B):**
- [ ] DynamoDB table with: food_rules, ai_classifications entities
- [ ] food_rules seed data (~150 entries, per docs/07_FEATURES.md)
- [ ] AppSync mutations wired to AI Lambdas:
  - `classifyItemPhoto(photoPath: String!, itemId: ID!, hint: String): ClassifyFoodResponse!`
  - `ocrExpiryDate(photoPath: String!, itemId: ID!): OcrExpiryDateResponse!`
  - `ocrReceipt(photoPath: String!, itemId: ID!): OcrReceiptResponse!` (Wave 3)
- [ ] AppSync queries for ai_classifications (for debugging)
- [ ] DynamoDB cache/loader for food_rules (Lambda can call via Lambda, or W2 exposes via query)
- [ ] Sync engine: ai_classifications records synced to mobile (Phase C)

**W4 provides to W2:**
- Zod schemas for all AI responses (packages/shared/src/schemas/ai.ts)
- DynamoDB attribute definitions (ai_classifications record structure)
- Lambda handler signatures (input/output types)
- Cost + quota tracking requirements (per @wfl/shared/schemas/ai)

**Coordination points:**
- W2 owns DynamoDB, W4 depends on food_rules data
- W4 Lambda writes ai_classifications via DynamoDB SDK (not via AppSync)
- food_rules cache: W2 can pre-load into Lambda environment, or W4 loads on first call
- Cost tracking: W4 writes costUsd to ai_classifications, W2 aggregates for billing

### W4 → W3 (Auth & Security)
**W4 needs from W3:**
- [ ] Cognito user context in Lambda event (identity claims)
- [ ] Household membership check middleware (W3 provides AppSync function)
- [ ] AI quota check middleware (per [06_AI_INTEGRATION.md](../docs/06_AI_INTEGRATION.md))

**W4 provides to W3:**
- Quota schema: aiQuotaUsedToday (Profile), aiQuotaResetAt, per-user quota limits
- Quota enforcement points (before invoking Bedrock)
- Logging format for audit trail (Sentry + CloudWatch)

**Coordination points:**
- W3: provide checkHouseholdMembership() AppSync function
- W3: provide quotaCheck() Lambda layer
- W4: call quota check before Bedrock invoke
- W4: log quota exceeded errors for W3 alerting

### W4 → W5 (Mobile Foundation)
**W4 needs from W5:**
- [ ] Photo upload to S3 (pre-signed URLs)
- [ ] Camera component (for date/receipt scanning)
- [ ] Image compression (1024px JPEG q70 before upload)

**W4 provides to W5:**
- AI response schemas (Zod) for type-safe mobile integration
- Prompt/classification examples (for Storybook docs)
- Error codes + retry strategies
- Confidence thresholds UI guidance (e.g., "confidence < 0.6 = show picker")

### W4 → W6 (Mobile Core)
**W4 needs from W6:**
- [ ] Scan flow UI (camera, carousel, confirm buttons)
- [ ] Integration with classifyItemPhoto mutation
- [ ] User override UI ("Is this right?" picker with food_rules list)
- [ ] Photho capture → S3 upload → mutation call → result display

**W4 provides to W6:**
- `ClassifyFoodResponse` Zod schema (for TypeScript)
- Mock data for Storybook (see evals/shared/mock-responses.ts — Phase B)
- Error handling guide (Bedrock errors, quota, validation)

### W4 → W7 (Mobile Settings)
**W4 needs from W7:**
- [ ] User settings UI: AI features toggle, quota display, billing usage
- [ ] Account deletion flow: cascade to ai_classifications cleanup (triggered by W2)

**W4 provides to W7:**
- Quota usage aggregation query schema
- Usage display format (calls/day, cost/month)

### W4 → W8 (Mobile Sync)
**W4 needs from W8:**
- [ ] ai_classifications entity in WatermelonDB schema
- [ ] Sync resolver for deltaSync including ai_classifications
- [ ] Real-time subscription for ai_classifications updates

**W4 provides to W8:**
- ai_classifications sync metadata: _version, _lastChangedAt, createdAt
- Conflict resolution: ai_classifications are append-only (no overwrites)

### W4 → W9 (Ops/QA)
**W4 needs from W9:**
- [ ] CloudWatch alarms: Lambda error rate > 1%, latency P95 > SLA
- [ ] E2E tests in Maestro: camera scan → classification → item created
- [ ] Eval CI job: runs pnpm ai:eval on every PR touching services/ai/

**W4 provides to W9:**
- Eval suite (services/ai/evals/)
- Sample test data (ground-truth CSVs — Phase B)
- Prompt versioning strategy
- Cost monitoring dashboard (daily AI spend by user)

### W4 → W10 (Design/Polish)
**W4 needs from W10:**
- [ ] "Scanning..." Lottie animation
- [ ] "Confidence < 0.6" UI mockup (show picker, highlight alternatives)
- [ ] "Visual warning" UI (red banner with icon)
- [ ] Empty state if AI disabled

**W4 provides to W10:**
- Prompt examples (for marketing "How it works")
- Classification accuracy stats (for "Trusted by 50K users" claim)

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ Mobile App (W5, W6, W7)                                    │
│  ├─ Camera: capture photo → S3 (pre-signed)                │
│  ├─ Call: classifyItemPhoto(photoPath, hint)               │
│  └─ Display: ClassifyFoodResponse + alternatives           │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │ AppSync (W2)                 │
        │ ├─ Mutation: classifyItemPhoto│
        │ ├─ Quota check (W3)           │
        │ └─ Auth check (W3)            │
        └────────┬─────────────────────┘
                 │
                 ▼
        ┌──────────────────────────────┐
        │ Lambda: classify-food (W4)   │
        │ ├─ Load food_rules (cached)  │
        │ ├─ Build prompts             │
        │ ├─ Call Bedrock Haiku        │
        │ ├─ Parse + validate response │
        │ └─ Write ai_classifications  │
        └────────┬─────────────────────┘
                 │
         ┌───────┴────────┬──────────┐
         ▼                ▼          ▼
    ┌─────────┐      ┌──────────┐  ┌───────────┐
    │ Bedrock │      │ CloudWatch │ DynamoDB  │
    │ (Haiku) │      │ (logs)   │  (ai_class)│
    └─────────┘      └──────────┘  └───────────┘
```

## Shared Schemas (Source of Truth)

All types defined in `packages/shared/src/schemas/`:
- `entities.ts`: Profile, Household, Item, Container
- `ai.ts`: ClassifyFoodResponse, OcrExpiryDateResponse, AiClassification, AiQuotaUsage

**Critical:** All workers must import from @wfl/shared, not duplicate types.

## Phase B Milestones (Coordination Timeline)

### Days 1-2: Schema Alignment
- [ ] W2: Review ai.ts schema → approve or request changes
- [ ] W3: Review quota fields in Profile → approve or request changes
- [ ] All: Sync on DynamoDB access patterns (GSIs for ai_classifications)

### Days 3-5: Infra + Data Setup
- [ ] W1: Deploy CDK stacks for AI Lambdas
- [ ] W2: Seed food_rules table (150 entries)
- [ ] W2: Create AppSync resolvers (invoke classify-food Lambda)
- [ ] W4: Test Lambdas locally against mocks
- [ ] W4: Test Lambdas in dev AWS (after W1 deploy)

### Days 6-10: Feature Implementation
- [ ] W4: Implement full Lambda logic (no more TODOs)
- [ ] W5: Implement photo upload + camera component
- [ ] W6: Implement scan flow UI + mutation calls
- [ ] W4: Collect eval datasets (500 photos, 50 dates, 100 receipts)

### Days 11-13: Integration + Testing
- [ ] W4: Implement eval scripts + CI job
- [ ] W6: End-to-end test: scan → API → response → UI
- [ ] W9: Maestro E2E flows
- [ ] W4: Optimize Bedrock caching (target 95% hit rate)

### Days 14-15: Polish + QA
- [ ] W10: Design polish (animations, error states)
- [ ] W4: Final eval runs
- [ ] W9: Pre-launch checklist

## Blocking Questions (resolve ASAP)

1. **food_rules source**: W2, should we seed from file (JSON) or hardcode?
   - **Decision**: TBD by W2
   - **Impact on W4**: If file, W4 will load + cache in Lambda memory

2. **DynamoDB access**: W4 calls DynamoDB SDK directly to write ai_classifications?
   - **Decision**: Yes, W4 gets DynamoDB client + role
   - **Impact**: Lambda IAM role needs dynamodb:PutItem

3. **Cost tracking**: W4 writes costUsd, who aggregates for billing?
   - **Decision**: W2 owns aggregation (DynamoDB scan daily)
   - **Impact on W4**: Ensure costUsd is always set

4. **Bedrock quota**: Per-user (free tier) or per-request (pay-as-you-go)?
   - **Decision**: Free tier until Wave 2 (monetization)
   - **Impact on W4**: Hard-code free quotas (10 classify/day)

## Sign-Off Checklist

- [ ] W2: reviewed ai.ts schemas + DynamoDB access patterns
- [ ] W3: reviewed quota + auth integration points
- [ ] W1: reviewed CDK Lambda stack requirements
- [ ] W5: reviewed mobile photo upload + typing
- [ ] W6: reviewed mutation signatures + error handling
- [ ] W9: reviewed Maestro test scenarios

---

**Last updated**: 2026-04-26 by W4
**Next sync**: After W1 deploys Lambda stacks (Est. Day 3)
