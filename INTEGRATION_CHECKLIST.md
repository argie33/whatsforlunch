# Integration Checklist — Multi-Worker Coordination

**Purpose**: Ensure all 10 workers' Phase A deliverables integrate seamlessly.

**Status**: Phase A ACTIVE — Multiple workers building in parallel

## Commit History (Latest First)

- 27ac0ea: W5 Phase B — Component primitives, Storybook, i18n, service layer
- 9db8df1: W3 Phase A & B — Auth & Security implementation  
- 709dcc6: W5 Phase A — Expo scaffold, Tamagui design system, WatermelonDB schema
- **bcc6eb6**: W2 Phase A — Backend scaffold, GraphQL schema, resolvers
- e0dc04d: Initial scaffolding — Design docs, monorepo structure

## Integration Points by Worker

### W1 → Infrastructure (Pending)

**Depends on**:
- W2: GraphQL schema + resolvers
- W3: Auth Lambda ARNs
- W4: AI Lambda ARNs

**Deliverables needed for Phase B**:
- ✅ CDK stack structure
- ⏳ AppSync API wired to resolvers
- ⏳ DynamoDB table created with GSI4
- ⏳ Lambda data source configured
- ⏳ Cognito User Pool + IdPs

**Integration verification**:
- [ ] Schema validates via `graphql-core-count-schema`
- [ ] All resolvers callable from CDK
- [ ] DynamoDB keys match `access-patterns.ts`
- [ ] Lambda ARNs match W3/W4 services

---

### W2 → Backend/Data (COMPLETE ✅)

**Phase A delivered**:
- ✅ GraphQL schema (`infra/cdk/lib/appsync/schema.graphql`)
- ✅ Zod validation schemas (`packages/shared/src/schemas/`)
- ✅ DynamoDB access patterns (`packages/shared/src/db/`)
- ✅ 11 resolver implementations (14% of 50+ total)
- ✅ FoodRule seed data
- ✅ Local testing infrastructure

**Consumed by**:
- W1: Schema + resolvers
- W3: Profile CRUD signatures
- W5: GraphQL types for codegen
- W6/W7/W8: API contract

**Integration verification**:
- ✅ Schema is valid GraphQL SDL
- ✅ All Query/Mutation/Subscription fields typed
- ✅ Auth directives present (`@aws_cognito_user_pools`)
- ✅ Zod schemas match GraphQL types
- ✅ DynamoDB keys in resolvers match `access-patterns.ts`

**Phase B readiness**:
- [ ] W1 has AppSync API deployed
- [ ] Resolvers tested against real DynamoDB
- [ ] W3 Cognito triggers integrated
- [ ] W4 AI Lambda ARNs provided

---

### W3 → Auth & Security (PARTIALLY DONE)

**Phase A delivered** (from commit 9db8df1):
- ✅ Cognito trigger scaffolding
- ✅ Magic link auth flow
- ✅ IAM policy setup
- ⏳ W2 integration (Profile create/update hooks)

**Depends on**:
- W2: Profile CRUD resolvers (done ✅)
- W1: Cognito User Pool created

**Integrations needed**:
- [ ] Cognito pre-signup → Create Profile in DynamoDB
- [ ] Cognito post-confirm → Set profile `verified=true`
- [ ] Auth challenge resolver → Validate magic link nonce

**Profile mutation contract** (from W2 schema):
```graphql
mutation updateProfile(input: UpdateProfileInput!): Profile!
mutation registerDevice(input: RegisterDeviceInput!): Device!
mutation deleteAccount(confirmation: String!): DeleteAccountResult!
```

**Verification checklist**:
- [ ] W3 Lambda ARNs match W1 Cognito trigger config
- [ ] Profile creation payload matches Zod `ProfileSchema`
- [ ] Device registration uses correct Expo push token format

---

### W4 → AI (Pending)

**Phase A deliverables needed**:
- ⏳ Bedrock model access confirmed
- ⏳ Lambda scaffolding for `classify-food`, `ocr-expiry-date`, `image-resize`

**Resolvers to integrate with**:
- `Mutation.classifyItemPhoto` — Photo classification (W2 stub)
- `Mutation.ocrExpiryDate` — Expiry date OCR (W2 stub)
- `Mutation.ocrReceipt` — Receipt OCR (async)

**Data contract** (from W2 schema):
```graphql
input ClassifyPhotoInput {
  itemId: UUID
  photoPath: String!
  storageLocation: StorageLocation
  hint: String
}

type AiClassificationResult {
  classification: AiClassification!
  suggestedFoodType: String!
  suggestedFoodName: String!
  suggestedExpiryAt: AWSDateTime!
  confidence: Float!
  alternatives: [AlternativeClassification!]!
  reasoning: String
}
```

**Verification checklist**:
- [ ] FoodRule aliases match AI training data
- [ ] Confidence scores align (0–1)
- [ ] ExpirySource enum includes 'ai'
- [ ] Cost tracking in AiClassification
- [ ] Quota enforcement via Lambda

---

### W5 → Mobile Foundation (IN PROGRESS)

**Phase A delivered** (from commit 709dcc6):
- ✅ Expo SDK 51 setup
- ✅ Tamagui design system config
- ✅ WatermelonDB schema scaffold
- ✅ AWS Amplify integration

**Phase B in progress** (from commit 27ac0ea):
- ✅ Component primitives (11 components)
- ✅ Storybook setup
- ✅ i18n framework
- ✅ Service layer scaffold

**Depends on**:
- W2: GraphQL schema for codegen ✅
- W2: Zod schemas for validation ✅
- W8: WatermelonDB sync engine (pending)

**Integrations**:
- [ ] GraphQL types generated from W2 schema (`graphql-codegen`)
- [ ] Zod schemas imported for form validation
- [ ] Component library used by W6/W7

**WatermelonDB schema alignment**:
- [ ] DB models mirror DynamoDB structure
- [ ] Sync fields match (`_version`, `_lastChangedAt`, `clientId`)
- [ ] Soft delete handling (deletedAt)

**Service layer** (being built by W5):
- [ ] ContainersService (calls W2 mutations)
- [ ] ItemsService (calls W2 mutations)
- [ ] ProfileService (calls W2 mutations)

---

### W6 → Mobile Core (Pending)

**Depends on**:
- W5: Component primitives ✅
- W2: Item mutations ✅
- W3: Auth flow ✅

**Phase A deliverables needed**:
- ⏳ Camera screen scaffold
- ⏳ QR sticker generation

**API contract** (from W2 schema):
- `Mutation.createItem` — Create item after scan
- `Mutation.createContainer` — Claim QR container
- `Query.containerByQrToken` — Lookup by QR

**Verification checklist**:
- [ ] QR token parsing matches Container.qrToken format
- [ ] Photo upload uses presignedPhotoUpload
- [ ] Item creation includes correct expirySource (rule/ai/ocr/barcode/user)

---

### W7 → Mobile Settings (Pending)

**Depends on**:
- W5: Component primitives ✅
- W2: Profile + Device mutations ✅

**API contract** (from W2 schema):
- `Query.me` — Fetch current profile
- `Mutation.updateProfile` — Update preferences
- `Mutation.registerDevice` — Push notifications
- `Mutation.deleteAccount` — Account deletion

**Verification checklist**:
- [ ] Profile input fields match UpdateProfileInput type
- [ ] Device registration sends platform (ios/android)
- [ ] Delete account requires email confirmation

---

### W8 → Mobile Sync (Pending)

**Depends on**:
- W2: DynamoDB access patterns ✅
- W5: WatermelonDB schema ✅
- W2: `deltaSync` query (pending)

**`deltaSync` query contract** (from W2 schema):
```graphql
query deltaSync(input: DeltaSyncInput!): DeltaSyncResult! {
  containers: [Container!]!
  items: [Item!]!
  shoppingList: [ShoppingListItem!]!
  serverTimestamp: AWSDateTime!
}
```

**Sync metadata alignment**:
- [ ] Every entity has `_version` (incremented atomically)
- [ ] Every entity has `_lastChangedAt` (epoch ms for client dedup)
- [ ] Every entity has `clientId` (generated client-side)

**Soft delete handling**:
- [ ] Sync returns deletedAt for tombstone cleanup
- [ ] Conflict resolution per field (documented in 02_DATA_MODEL.md)

---

### W9 → Ops/QA (Pending)

**Depends on**:
- W1: AppSync API deployed
- W2: Error codes documented
- All workers: Feature implementations

**Deliverables needed**:
- ⏳ Sentry project configured
- ⏳ PostHog project configured
- ⏳ App Store / Play Store accounts
- ⏳ Maestro test flows (for W6/W7 features)

**Error tracking contract**:
- All resolvers return standard error codes
- Error extensions include `code`, `userMessage`, `requestId`
- See W2 resolvers for pattern

**PostHog events** (to be instrumented):
- Item created, eaten, tossed, frozen
- Household created, member added/removed
- AI classification called (for cost tracking)

---

### W10 → Design/Polish (Pending)

**Depends on**:
- W5: Tamagui design system ✅

**Deliverables needed**:
- ⏳ App icon
- ⏳ Illustrations (fridge, onboarding, empty states)
- ⏳ Copy strings (en.json)
- ⏳ Lottie animations

**Integration with W5 design tokens**:
- [ ] Icons used in components match available set
- [ ] Colors match theme tokens
- [ ] Typography matches Tamagui config

---

## Critical Dependency Chain

```
W1 (Infra)  ◄────  W2 (Schema ✅) ◄────  W3 (Auth)
    │
    ├───► W6 (Mobile Core) ◄──── W5 (Foundation ✅)
    │                              │
    ├───► W7 (Settings) ◄──────────┤
    │                              │
    ├───► W8 (Sync) ◄──── W2 (access-patterns ✅)
    │
    └───► W4 (AI) ◄────────  W6 (calls AI resolvers)

W9 (Ops) ◄────  All (error tracking, metrics)
W10 (Design) ◄──  W5 (design system)
```

## Integration Verification Checklist

### Schema & Types (W2)

- [x] GraphQL schema is valid SDL
- [x] 40+ queries, mutations, subscriptions defined
- [x] Auth directives on all protected fields
- [x] Zod schemas match GraphQL types
- [x] FoodRule seed data complete
- [ ] **Waiting for W1**: Schema deployed to AppSync

### Resolver Pattern (W2)

- [x] 11 resolvers implemented (CRUD + status updates)
- [x] Shared utils handle DynamoDB + auth
- [x] Error codes standardized
- [x] Optimistic concurrency pattern
- [x] Soft delete pattern
- [ ] **Waiting for W1**: Resolvers wired in CDK

### Database (W2 → W1)

- [x] Single-table key patterns defined
- [x] 4 GSIs specified
- [x] Access patterns documented
- [ ] **Waiting for W1**: DynamoDB table created matching schema

### Auth (W3)

- [x] Cognito trigger handlers created
- [x] Magic link flow outlined
- [ ] **Waiting for W1**: Cognito User Pool created
- [ ] **W3 must verify**: Profile creation hooks to W2 mutations

### Mobile (W5 → W6/W7)

- [x] Expo project bootstrapped
- [x] Tamagui design system configured
- [x] WatermelonDB schema mirrors DynamoDB
- [x] Component primitives started
- [ ] **Waiting for W1**: GraphQL codegen from W2 schema

### Sync (W8)

- [ ] **Waiting for W2**: `deltaSync` resolver implementation
- [ ] **W8 must verify**: WatermelonDB schema matches DB access patterns

### AI (W4)

- [ ] **Waiting**: Bedrock model access confirmed
- [ ] **W4 must deliver**: Lambda ARNs for W2 mutation integration

### Ops (W9)

- [ ] **Waiting for W1**: AppSync API URL
- [ ] **W9 must setup**: Sentry + PostHog projects

---

## Communication Cadence

**Daily async**:
- Each worker posts standup to GitHub Discussions (#daily-standup)
- Status: What done yesterday, what starting today, any blockers

**Weekly sync** (if needed):
- 30-min call if blockers > 4 hours
- Resolve schema/API contract issues in real-time

---

## Blocking Issues (If Any)

### Current Blockers

1. **W1 hasn't deployed yet** → W2/W3/W6/W7/W8 can't test against real API
   - **Mitigation**: Local testing with DynamoDB Local (documented in docs/LOCAL_TESTING.md)

2. **W4 Bedrock access not yet confirmed** → W2 can't finalize AI mutation implementations
   - **Mitigation**: Stub resolvers in place, W4 fills in Lambda calls later

3. **W8 `deltaSync` not yet implemented** → Can't test sync locally
   - **Mitigation**: W8 implements after W2 Phase B, tests against ephemeral API

---

## Sign-Off

**Phase A integration status**: 🟡 IN PROGRESS

- W2 ✅ Complete (backend foundation)
- W5 ✅ Scaffolding + Phase B started
- W3 ✅ Scaffolding + Phase B started
- W1 ⏳ Pending (infrastructure wiring)
- W4 ⏳ Pending (AI Lambdas)
- W6/W7/W8/W9/W10 ⏳ Pending (await W1 API)

**Next merge**: When W1 has AppSync API running, all other workers can integration-test.

---

**Last updated**: 2026-04-26  
**Owner**: W2 (coordination role)  
**Review cadence**: Daily (standup) / Weekly (if blockers)
