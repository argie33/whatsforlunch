# PR: W4 Phase A — AI Infrastructure Scaffolding

## Summary

Scaffolds all AI infrastructure for Wave 1 MVP:
- Bedrock client with prompt caching + retry logic
- Textract client with sync/async OCR support
- Lambda function stubs: classify-food, ocr-expiry-date, image-resize
- Evaluation suite framework with metrics utilities
- TypeScript configuration for all AI services

## Acceptance Criteria

- [x] Bedrock client compiles + exports properly
- [x] Textract client compiles + exports properly
- [x] All three Lambda functions have package.json + src/index.ts + tsconfig.json
- [x] Eval suite has shared/metrics.ts + stub eval scripts for classify-food + ocr-expiry-date
- [x] services/shared/tsconfig.json references all AI packages
- [x] No secrets in code, no uncommitted dependencies

## Files Created

**Shared clients** (services/shared/):
- package.json (AWS SDK deps)
- tsconfig.json
- src/bedrock.ts (308 lines) — invoke Bedrock models with caching
- src/textract.ts (172 lines) — OCR text + expense parsing
- src/errors.ts (28 lines) — error types

**Lambda functions** (services/ai/ + services/images/):
- classify-food/ (package.json, tsconfig.json, src/index.ts with Phase B TODOs)
- ocr-expiry-date/ (same structure)
- image-resize/ (same structure, handles S3 resizing)

**Evaluation suite** (services/ai/evals/):
- README.md — instructions for running evals
- shared/metrics.ts (200+ lines) — accuracy, calibration, latency, cost
- classify-food/eval.ts — stub evaluation script
- ocr-expiry-date/eval.ts — stub evaluation script

**Documentation** (services/ai/):
- PHASE_A_SUMMARY.md — full Phase A summary + Phase B checklist
- PHASE_A_PR.md — this file

## Risks

None. Phase A is scaffold-only; all Lambdas have stub handlers that log "Phase B will implement."

## Phase B Dependencies

1. **W1 (Infrastructure)** unblocks: CDK Lambda stacks, IAM roles, S3 bucket triggers
2. **W2 (Backend)** unblocks: food_rules table seed data, AppSync mutation resolvers
3. **Data** needed for evals: ground-truth CSV files (500+ food photos, 50+ expiry dates, 100+ receipts)

## Review Notes

- Bedrock client supports both cached system prompt + per-request user content (95%+ cache hit target)
- Textract client handles both DetectDocumentText (real-time) and AnalyzeExpense (async recipes)
- All error types include `retryable` flag for downstream retry logic
- Eval metrics cover: accuracy, calibration (P-R per threshold), latency percentiles, USD cost
- TypeScript strict mode enabled throughout

## Testing in Phase B

All Lambdas will be integration-tested against ephemeral AWS environments (via CDK).

## Rollout

No rollout needed; this is internal infrastructure. Deploy with next phase.
