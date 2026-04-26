# Build Status & Blockers

**Last Updated**: 2026-04-26  
**Phase**: Phase A (foundation) — 60% complete

## ✅ COMPLETED & READY

### W1 — Infrastructure / IaC
- [x] CDK app structure (`infra/cdk/bin/app.ts`)
- [x] Environment config (`lib/config/env-config.ts`)
- [x] **DataStack** (Phase A+B): DynamoDB single-table with 4 GSIs
  - Single table: `wfl-main-{env}`
  - GSI1: User → households
  - GSI2: Expiring items
  - GSI3: Per-user items
  - GSI4: Lookup by token/barcode
  - S3 buckets: photos, exports, assets (all KMS-encrypted)
  - TTL enabled for temporary data

### W3 — Auth & Security ✅ COMPLETE
- [x] Cognito User Pool + triggers
- [x] Magic link auth (nonce, HMAC, single-use, 10-min TTL)
- [x] Apple Sign-In (federated)
- [x] Google Sign-In (federated)
- [x] AppSync security functions (membership checks, rate limiting, role enforcement)
- [x] WAF rules (rate limit, GraphQL introspection block)
- [x] AI quota layer (per-tier daily limits)
- [x] Local testing guide (DynamoDB Local, no AWS needed)

### W5 — Mobile Foundation ✅ 85% COMPLETE
- [x] Expo scaffold
- [x] Expo router setup
- [x] Tamagui design system
- [x] WatermelonDB schema
- [x] AWS Amplify integration
- [x] Sentry + PostHog (pending config)

## 🚧 UNBLOCKED — READY TO START

### W2 — Backend / Data (UNBLOCKED)
**Blockers Resolved**: DynamoDB schema now available
**Next Steps**:
1. Implement AppSync resolvers (CRUD for all entities)
2. Create DynamoDB access patterns helper functions
3. Generate GraphQL schema from data model
4. Create test fixtures
5. Implement FoodRule seed data (150 entries)

**Deliverables Needed**:
- `infra/cdk/lib/appsync/schema.graphql` — complete (in progress)
- `infra/cdk/lib/appsync/resolvers/` — CRUD for Item, Container, Household, Profile
- `packages/shared/src/db/` — access pattern helpers
- Tests for all resolvers

### W4 — AI (UNBLOCKED)
**Blockers Resolved**: Profile table structure available for quota tracking
**Next Steps**:
1. Set up Bedrock client wrapper
2. Set up Textract client wrapper
3. Create `classify-food` Lambda scaffold
4. Create `ocr-expiry-date` Lambda scaffold
5. Create eval suite skeleton

**Deliverables Needed**:
- `services/ai/shared/bedrockClient.ts`
- `services/ai/shared/textractClient.ts`
- `services/ai/classify-food/index.ts`
- `services/ai/ocr-expiry-date/index.ts`

### W6 — Mobile Core (BLOCKED UNTIL W2 completes GraphQL schema)
**Current Blocker**: GraphQL schema not finalized
**Blocked On**: W2 to output complete schema
**Next Steps** (after W2):
1. Camera screen scaffold
2. QR code generation
3. Service layer (ContainersService, ItemsService)

### W7 — Mobile Settings & Account (BLOCKED UNTIL W5 layout)
**Current Blocker**: Settings navigation not scaffolded
**Blocked On**: W5 Phase B
**Next Steps** (after W5):
1. Settings navigation skeleton
2. Profile editor
3. Account deletion flow

### W8 — Mobile Sync & Offline (BLOCKED UNTIL W2 resolvers done)
**Current Blocker**: deltaSync resolver not implemented
**Blocked On**: W2 to implement deltaSync query
**Next Steps** (after W2):
1. WatermelonDB schema mirror
2. Sync metadata fields
3. Repository layer
4. Sync engine (push/pull/real-time)

### W9 — Ops, CI/CD, Quality (UNBLOCKED)
**Blockers Resolved**: No code dependencies
**Next Steps**:
1. Apple Developer account setup
2. Google Play account setup
3. EAS project configuration
4. Sentry + PostHog setup

### W10 — Design & Polish (UNBLOCKED but low priority)
**Blockers Resolved**: No code dependencies
**Next Steps**:
1. Brand identity confirmation
2. Figma design file with all screens
3. App icon, splash screen
4. Illustrations and assets

## 📊 OVERALL PROGRESS

| Worker | Phase A | Blocker | Priority |
|--------|---------|---------|----------|
| W1 | 80% ✅ | Waiting on API Stack | HIGH |
| W2 | 20% | None | **CRITICAL** |
| W3 | 100% ✅ | None | DONE |
| W4 | 0% | None | HIGH |
| W5 | 85% | W10 (design) | MEDIUM |
| W6 | 0% | W2 schema | MEDIUM |
| W7 | 0% | W5 layout | LOW |
| W8 | 0% | W2 resolver | MEDIUM |
| W9 | 0% | None | MEDIUM |
| W10 | 0% | None | LOW |

## 🎯 CRITICAL PATH TO UNBLOCK PHASE B

1. **W2 — Complete GraphQL schema + resolvers** ← BLOCKER FOR W6, W8
   - Finish schema.graphql
   - Implement Item, Container, Household CRUD
   - Implement deltaSync query for sync engine
   - Create test fixtures

2. **W1 — Complete ApiStack** ← BLOCKER FOR deployment
   - Implement AppSync with resolved schema
   - Wire up Lambda resolvers
   - Deploy CloudFront + WAF
   - Test end-to-end

3. **W4 — Bedrock + Textract clients** ← BLOCKER FOR W6 (AI features)
   - Create shared client wrappers
   - Set up eval suite skeleton
   - Implement classify-food Lambda
   - Implement ocr-expiry-date Lambda

4. **W5 — Complete Sentry + PostHog** ← BLOCKER FOR testing Phase B
   - Wire up both SDKs
   - Create dashboards
   - Test crash reporting

## 📝 WHAT TO DO NOW

### For W2 Lead:
```bash
# Start here:
1. Review docs/02_DATA_MODEL.md + docs/03_API_SPEC.md
2. Update infra/cdk/lib/appsync/schema.graphql (complete it)
3. Create resolvers for: Item, Container, Household, Profile
4. Create DynamoDB helpers in packages/shared/src/db/
5. Create test fixtures
6. Generate TypeScript types: pnpm codegen
```

### For W4 Lead:
```bash
# Start here:
1. Review docs/06_AI_INTEGRATION.md
2. Create services/ai/shared/bedrockClient.ts
3. Create services/ai/shared/textractClient.ts
4. Scaffold classify-food and ocr-expiry-date Lambdas
5. Create eval suite in services/ai/evals/
```

### For W1 Lead:
```bash
# Start here:
1. Implement ApiStack (AppSync + Lambda resolver integration)
2. Implement NetworkStack (VPC, CloudFront)
3. Implement SecurityStack WAF + CloudTrail
4. Test: pnpm cdk synth && pnpm cdk deploy --profile dev
```

## 🔗 KEY OUTPUTS AVAILABLE NOW

**For all workers to use**:
- ✅ DynamoDB schema: `packages/shared/src/db/schema.ts` (reference model)
- ✅ Type system: Reference `docs/02_DATA_MODEL.md`
- ✅ Auth: `@whatsforlunch/auth` package (Cognito config, magic link)
- ✅ Local dev: `LOCAL_DEV_SETUP.md` (get running without AWS)
- ✅ Security: `docs/OWASP_MASVS_L1_ASSESSMENT.md` (compliance checklist)

**For mobile team**:
- ✅ DynamoDB table name exported from DataStack
- ✅ S3 bucket names exported from DataStack
- ✅ Cognito config (pool ID, client ID, region)
- ✅ WatermelonDB schema scaffold ready
- ✅ Component primitives in `apps/mobile/src/components/ui/`

**For backend team**:
- ✅ DynamoDB table + GSIs ready
- ✅ GraphQL schema skeleton ready
- ✅ Auth security functions ready
- ✅ Quota layer ready
- ✅ Rate limiting layer ready

## 🚀 NEXT IMMEDIATE ACTIONS

1. **W2 Lead**: Complete GraphQL schema + 3 basic resolvers (Item CRUD)
2. **W4 Lead**: Create Bedrock client + classify-food Lambda scaffold
3. **W1 Lead**: Implement ApiStack + deploy to dev
4. **Then**: All mobile workers can start Phase B

**Target**: Complete above by end of day → unblock all Phase B work
