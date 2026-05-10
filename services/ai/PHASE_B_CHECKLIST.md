# W4 Phase B — Implementation Checklist

**Timeline**: Days 4-15 (10 working days)
**Status**: Ready to start (awaiting W1 CDK deploy + W2 data setup)

## Dependencies Before Starting Phase B

### Blocking on W1 (Infrastructure)
- [ ] CDK deployed: classify-food, ocr-expiry-date, image-resize Lambda stacks
- [ ] S3 bucket created: photos-{env} with event notifications
- [ ] IAM roles assigned to Lambdas (bedrock:InvokeModel, textract:*, s3:GetObject, dynamodb:PutItem)
- [ ] CloudWatch log groups created
- [ ] Environment variables injected: AWS_REGION, NODE_ENV

### Blocking on W2 (Backend)
- [ ] DynamoDB table: food_rules populated with ~150 entries (per docs/02_DATA_MODEL.md)
- [ ] DynamoDB table: ai_classifications entity schema created
- [ ] AppSync resolvers: classifyItemPhoto → classify-food Lambda
- [ ] AppSync resolvers: ocrExpiryDate → ocr-expiry-date Lambda
- [ ] AppSync schema codegen completed (types available to W4)

### Blocking on W3 (Auth)
- [ ] AppSync function: checkHouseholdMembership (for Lambda to call)
- [ ] Lambda layer: ai-quota-check (function to validate per-user quotas)

## Phase B Work Streams

### Stream 1: Core Lambda Implementation (Days 4-8)

#### classify-food
- [ ] Load food_rules from DynamoDB cache
- [ ] Download photo from S3 (using signed URLs from mobile)
- [ ] Strip EXIF data before passing to Bedrock
- [ ] Build system + user prompts (using buildSystemPrompt, buildUserPrompt)
- [ ] Call Bedrock InvokeModel with tool_choice forcing
- [ ] Parse tool_use response + validate with ClassifyFoodResponseSchema
- [ ] Handle confidence < 0.6 (return as suggestion, don't auto-apply)
- [ ] Calculate cost (cached + non-cached tokens)
- [ ] Write ai_classifications record to DynamoDB
- [ ] Return response to AppSync resolver
- [ ] Unit tests: mock Bedrock (✓ already stubbed)
- [ ] Integration tests: against real DynamoDB

**Latency target**: < 3 seconds (P95)
**Accuracy target**: 90%+ on eval dataset

#### ocr-expiry-date
- [ ] Download photo from S3
- [ ] Call Textract DetectDocumentText (sync)
- [ ] Parse all detected text via date-parser.ts (✓ already implemented)
- [ ] Score candidates by: confidence, keyword proximity, position
- [ ] If < 0.7 confidence: fall back to Bedrock Haiku for parsing
- [ ] Calculate cost (Textract is mostly free tier)
- [ ] Write ai_classifications record
- [ ] Return response to AppSync resolver
- [ ] Unit tests: mock Textract (✓ already stubbed)

**Latency target**: < 2 seconds (P95)
**Accuracy target**: 95%+ on eval dataset

#### image-resize
- [ ] S3 event trigger: on PutObject to photos/ prefix
- [ ] Download original image from S3
- [ ] Validate magic bytes (JPEG, PNG, WebP only)
- [ ] Decompress + strip EXIF with Sharp
- [ ] Resize to 1024px max dimension (preserve aspect ratio)
- [ ] Re-compress to JPEG q70
- [ ] Upload resized version to same bucket (key: original-resized.jpg)
- [ ] Update Item.photoPath to point to resized version (via Lambda DynamoDB write)
- [ ] Error handling: if processing fails, log but don't fail the response
- [ ] Unit tests: mock S3 + Sharp
- [ ] Integration tests: test with real images

**Latency**: < 10 seconds per image
**Cost**: < $0.0001 per image (Sharp is free, S3 is cheap)

### Stream 2: Evaluation Suite (Days 8-12)

#### Data Collection
- [ ] Collect 500-1000 labeled food photos
  - [ ] Diverse cuisines (Italian, Asian, Mexican, etc.)
  - [ ] Various lighting (bright, dim, flash)
  - [ ] Various containers (bowls, plates, ziplock, glass)
  - [ ] Label: foodType + daysSafe (ground-truth.csv)
- [ ] Collect 50+ expiry date packaging photos
  - [ ] Various date formats (MM/DD/YYYY, Month Day Year, etc.)
  - [ ] Various manufacturers
  - [ ] Label: expectedDate (ground-truth.csv)
- [ ] Collect 100+ receipt images (Wave 3 prep)

#### Evaluation Scripts
- [ ] classify-food/eval.ts: load photos, invoke Lambda, calculate metrics
- [ ] ocr-expiry-date/eval.ts: load dates, invoke Lambda, calculate metrics
- [ ] shared/metrics.ts: already done ✓
- [ ] Each eval outputs: accuracy, calibration (P-R), latency (P50/95/99), cost

#### CI Integration
- [ ] Create GitHub Actions workflow: .github/workflows/ai-eval.yml
- [ ] Trigger on: PR touching services/ai/ or prompt changes
- [ ] Run: pnpm ai:eval classify-food, pnpm ai:eval ocr-expiry-date
- [ ] Fail build if: accuracy drops > 2%, P95 latency > SLA
- [ ] Report metrics to PR comment

#### Prompt Versioning
- [ ] Create services/ai/classify-food/prompts.ts (✓ already done)
- [ ] Implement PROMPT_VERSION constant (✓ already done)
- [ ] On every prompt change: bump version, run evals, compare baselines
- [ ] Document approved baselines (90% accuracy, < 3s latency)

### Stream 3: Production Readiness (Days 13-15)

#### Security
- [ ] Input validation: all Zod schemas enforced
- [ ] Authorization: check household membership before processing
- [ ] Quota enforcement: check aiQuotaUsedToday before calling Bedrock
- [ ] Cost tracking: log costUsd to ai_classifications (for billing)
- [ ] Privacy: no photo bytes logged, EXIF stripped, no full prompts logged
- [ ] Error handling: all AWS SDK errors caught, retryable flag set

#### Observability
- [ ] CloudWatch metrics: latency histogram, error rate, cost sum
- [ ] Sentry integration: all exceptions sent, tagged with user + household
- [ ] PostHog integration: track classification accuracy per user (for product)
- [ ] X-Ray traces: distributed tracing end-to-end (AppSync → Lambda → Bedrock)

#### Performance Optimization
- [ ] Bedrock caching: target 95% cache hit rate on system prompt
- [ ] Lambda warm-up: if cold starts > 1s, consider reserved concurrency
- [ ] Prompt cache testing: verify cache keys + busting works
- [ ] DynamoDB access: use batch writes for ai_classifications

#### Testing
- [ ] Unit tests: all Lambda handlers ✓ (classify-food done, add others)
- [ ] Integration tests: invoke Lambda against mocked AWS services
- [ ] E2E tests: via Maestro (W9 implements)
- [ ] Chaos tests: Bedrock 429, Textract timeout, S3 not found

## Daily Progress Checklist (Days 4-15)

Each day, W4 should:
- [ ] Pull latest main, merge W1/W2/W3 changes
- [ ] Run pnpm typecheck (ensure no regressions)
- [ ] Open PR for completed feature(s)
- [ ] Post daily standup in GitHub Discussions
- [ ] Unblock or escalate any blockers > 2 hours
- [ ] Review other workers' PRs (especially W2 data model changes)

## Known Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Bedrock model access denied in AWS | Request in console ASAP (one-time) |
| food_rules not seeded in time | Use stub data (SAMPLE_FOOD_RULES) during dev |
| Photo upload S3 URLs not working | Implement local file mock until W5 ready |
| Eval datasets take too long to collect | Start with 50 examples, grow as pipeline matures |
| Textract low confidence on curved packaging | Fall back to Bedrock Haiku for 20% of cases |

## Success Criteria (W4 Phase B Complete)

- [x] All Lambdas compile without errors
- [ ] All Lambdas pass unit tests locally
- [ ] All Lambdas deployed to dev environment (via CDK)
- [ ] Bedrock + Textract calls succeed in dev
- [ ] classify-food reaches 90%+ accuracy on eval dataset
- [ ] ocr-expiry-date reaches 95%+ accuracy on eval dataset
- [ ] All latency targets met (P95 < SLA)
- [ ] Cost tracking working (< $0.001 per call average)
- [ ] Quota enforcement working (reject > 10 calls/day on free tier)
- [ ] CI pipeline green (typecheck, lint, evals pass)
- [ ] E2E test: camera scan → classification → item created (via Maestro)
- [ ] Sentry capturing all errors from Lambdas
- [ ] PostHog tracking AI accuracy metrics

## Deliverables to PR

Each PR from W4:
- Feature branch: `feat/W4-<feature>-<brief-name>`
- Commit message: `feat(ai): F-XXX <feature name>`
- PR description: what, why, testing, acceptance criteria
- Code review: 1 approval (ideally W1 or W2)
- CI: all checks green (typecheck, lint, evals, tests)

Example PR:
```markdown
## F-014: Photo classification Lambda

Implements classify-food Lambda with Bedrock Haiku integration.

### Acceptance criteria
- [x] Loads food_rules from DynamoDB
- [x] Calls Bedrock with cached system prompt
- [x] Parses tool_use response
- [x] Handles confidence < 0.6 gracefully
- [x] Writes ai_classifications record
- [x] Unit tests pass (mock Bedrock)
- [x] Latency < 3s on sample data

### Testing
- Locally: `npm test` passes
- Eval: 92% accuracy on 100-photo dataset
- Cost: $0.0008 per call

### Risks
- Bedrock model access: requested in console, awaiting approval (W1 tracking)
```

---

**Next action**: Wait for W1 CDK deploy, then start implementation. Estimated: Day 4 afternoon.

**W4 lead**: Ready to begin. 🚀
