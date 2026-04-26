# WhatsForLunch — Project Status

**Current Phase**: Phase A Foundation (parallel multi-worker development)  
**Last Updated**: 2026-04-26  
**Branch**: Multiple feature branches with daily integration

## Overview

10 parallel workers building WhatsForLunch, each owning a specific track. Phase A focuses on foundational scaffolding, type contracts, and proof-of-concept implementations. Local development fully supported; AWS deployment pending W1 infrastructure completion.

## Worker Status

### ✅ W1 — Infrastructure / IaC (PENDING)

**Current**: Awaiting team input on AppSync wiring strategy

**Phase A scope**:
- AWS CDK structure
- GitHub Actions CI/CD workflows
- Per-environment config (dev/staging/prod)
- OIDC provider setup

**Blocking**: No phase A work can be integration-tested until W1 deploys AppSync API

**Unblocked**: All other workers can unit-test locally against DynamoDB Local

---

### ✅ W2 — Backend / Data (COMPLETE)

**Current**: Phase A complete, ready for Phase B

**Phase A delivered**:
- ✅ GraphQL schema (schema.graphql) — 40+ queries/mutations/subscriptions
- ✅ Zod validation schemas — All entity types typed
- ✅ DynamoDB access patterns — 4 GSIs, single-table design
- ✅ 11 resolver implementations (22% of 50+ total)
- ✅ FoodRule seed data (~30 entries, extensible to 150+)
- ✅ Local testing infrastructure (test helpers, documentation)

**Key files**:
- `infra/cdk/lib/appsync/schema.graphql`
- `infra/cdk/lib/appsync/resolvers/` (11 resolvers + utils)
- `packages/shared/src/schemas/entities.ts`
- `packages/shared/src/db/access-patterns.ts`
- `docs/LOCAL_TESTING.md`

**Phase B readiness**: Waiting for W1 AppSync deployment

---

### ✅ W3 — Auth & Security (IN PROGRESS)

**Current**: Phase A & B started

**Phase A started**:
- ✅ Cognito trigger handlers
- ✅ Magic link auth flow
- ✅ IAM policy templates
- ⏳ Profile creation hook to W2 mutations

**Phase B in progress**:
- ✅ Apple Sign-In scaffold
- ✅ Google Sign-In scaffold
- ⏳ WAF rules

**Depends on**:
- W2: Profile mutations ✅
- W1: Cognito User Pool (waiting)

**Next**: Integrate with W2 resolvers for profile creation/update

---

### ✅ W4 — AI (PENDING)

**Current**: Pending Bedrock model access confirmation

**Phase A scope**:
- [ ] Bedrock model access (Haiku 4.5)
- [ ] Lambda scaffolding (classify-food, ocr-expiry-date, image-resize)
- [ ] Textract client wrapper
- [ ] Eval suite skeleton

**Blocked by**:
- AWS Bedrock access (external dependency)

**Integrates with**:
- W2: classifyItemPhoto + ocrExpiryDate mutations
- W6: Mobile calls AI mutations

---

### ✅ W5 — Mobile Foundation (IN PROGRESS)

**Current**: Phase A + Phase B in progress

**Phase A complete**:
- ✅ Expo SDK 51 setup
- ✅ expo-router with (auth) + (main) route groups
- ✅ Tamagui design system config with full tokens
- ✅ WatermelonDB schema + models
- ✅ AWS Amplify Auth + API libraries
- ✅ Sentry + PostHog integrations

**Phase B in progress**:
- ✅ 11 component primitives (Button, Card, Input, Badge, etc.)
- ✅ Theme system (light/dark/high-contrast)
- ✅ Icon component wrapper
- ✅ Storybook setup
- ✅ i18n framework (en.json)
- ✅ Service layer scaffold (ContainersService, ItemsService)

**Key files**:
- `apps/mobile/app/(auth)/` — Auth route group
- `apps/mobile/app/(main)/` — Main app route group
- `apps/mobile/src/components/ui/` — 11 component primitives
- `apps/mobile/tamagui.config.ts` — Tamagui design tokens
- `apps/mobile/src/db/` — WatermelonDB schema

**Ready for**:
- W6: Can use components and ItemsService
- W7: Can use components and ProfileService
- W8: Can integrate WatermelonDB sync

---

### ✅ W6 — Mobile Core (AWAITING)

**Current**: Waiting for W5 components and W2 API

**Phase A scope**:
- [ ] Camera screen scaffold with mode switcher
- [ ] QR sticker generation + PDF export
- [ ] Service layer: ContainersService, ItemsService

**Depends on**:
- W5: Component primitives ✅
- W2: Item mutations ✅
- W1: AppSync API (pending)

**Unblocked**: Can build UI mockups using W5 components

---

### ✅ W7 — Mobile Settings (AWAITING)

**Current**: Phase A started on feat/W7-phase-a-settings-nav

**Phase A scope**:
- [ ] Settings navigation skeleton (S12 layout)

**Phase B scope**:
- [ ] Profile editor (name, photo, email)
- [ ] Notification preferences
- [ ] Timezone, units, dietary preferences
- [ ] Theme toggle
- [ ] Delete account flow
- [ ] Export data flow

**Depends on**:
- W5: Component primitives ✅
- W2: Profile + Device mutations ✅

**Unblocked**: Can build settings UI using W5 components

---

### ✅ W8 — Mobile Sync (AWAITING)

**Current**: Pending W2 `deltaSync` implementation

**Phase A scope**:
- [ ] WatermelonDB schema mirrors Dynamo ✅ (W5 done)
- [ ] Sync metadata fields on every entity ✅ (W2 schema done)
- [ ] Repository layer (queries, mutations) — pending

**Phase B scope**:
- [ ] Sync engine: push local writes
- [ ] Sync engine: pull deltas via `deltaSync`
- [ ] Real-time subscription handler
- [ ] Conflict resolution logic

**Depends on**:
- W2: `deltaSync` query (pending)
- W5: WatermelonDB schema ✅
- W2: Access patterns ✅

**Unblocked**: Can design sync architecture while waiting for `deltaSync`

---

### ✅ W9 — Ops / QA (AWAITING)

**Current**: Pending W1 API deployment

**Phase A scope**:
- [ ] Apple Developer account setup
- [ ] Google Play Developer account setup
- [ ] EAS project configured (eas.json)
- [ ] Sentry org + project configured
- [ ] PostHog project configured

**Phase B scope**:
- [ ] CI matrix all-green
- [ ] Maestro Cloud configured
- [ ] CloudWatch + Sentry dashboards
- [ ] PostHog funnels
- [ ] App Store + Play Store listings

**Blocked by**:
- W1: AppSync API (needed for E2E tests)

**Unblocked**: Can set up external services (Sentry, PostHog, EAS)

---

### ✅ W10 — Design / Polish (AWAITING)

**Current**: Pending W5 design system stabilization

**Phase A scope**:
- [ ] Brand identity confirmed
- [ ] Figma design file with all screens

**Phase B scope**:
- [ ] App icon + splash screen
- [ ] Illustrations (empty fridge, onboarding, empty states)
- [ ] Lottie animations
- [ ] All copy strings (en.json)
- [ ] App Store / Play Store screenshots

**Depends on**:
- W5: Tamagui design system ✅

**Unblocked**: Can design in Figma while W5 refines component library

---

## Key Dependency Graph

```
┌─ W2 Backend ✅ ──────────────────┐
│                                  │
├──► W1 Infrastructure ⏳ ◄────────┼──► W3 Auth (IP) ◄─────┐
│    (AppSync, CDK)               │                      │
│                                 ├──► W4 AI (Pending)   │
│                                 │                      │
│    ┌─────────────────────────────────────────────────────
│    │
│    └─► W6 Mobile Core (Awaiting) ◄───────┐
│                                          │
│    ┌───────────────────────────────────────┤
│    │                                       │
├───┤  W5 Mobile Foundation ✅ ◄────────────┘
│    │  (Components, Tamagui, DB)
│    │
│    ├──► W7 Mobile Settings (Awaiting)
│    │
│    └──► W8 Mobile Sync (Awaiting)
│
├──► W9 Ops/QA (Awaiting W1 API)
│
└──► W10 Design (Awaiting W5 finalization)
```

## Local Dev Status

### Works Now ✅

- Unit test all W2 resolvers (mocked DynamoDB)
- Unit test W5 components (Storybook)
- Unit test W3 auth handlers
- Type generation from W2 schema
- Schema validation
- Mobile app in simulator (UI only, no real API)
- DynamoDB Local setup

### Blocked on W1 🔴

- Integration tests against real AppSync
- End-to-end mobile → API → DB tests
- Maestro E2E flows
- Real auth flow testing
- Real sync testing

## Phase A Completion Estimate

| Worker | Status | ETA |
|--------|--------|-----|
| W1 | ⏳ Infrastructure | Pending initial request |
| W2 | ✅ Complete | Merged |
| W3 | 🟡 In Progress | ~1-2 days |
| W4 | ⏳ Blocked on Bedrock | Unknown (external) |
| W5 | 🟡 In Progress | ~1-2 days |
| W6 | ⏳ Waiting for API | After W1 |
| W7 | 🟡 In Progress | ~1-2 days |
| W8 | ⏳ Waiting for deltaSync | After W2 Phase B |
| W9 | ⏳ Waiting for API | After W1 |
| W10| ⏳ Waiting for W5 | ~concurrent with W5 |

**Overall Phase A**: 🟡 **70% complete** (W2/W5 core done, W1 infra pending, others waiting)

## Critical Path

1. **W1 deploys AppSync API** (unblocks W3/W6/W7/W8/W9)
2. W2 implements `deltaSync` query (unblocks W8 sync engine)
3. W4 confirms Bedrock access + provides Lambda ARNs (unblocks AI features)
4. W6/W7 build UI against real API
5. W8 implements sync engine
6. W9 sets up E2E testing

## How to Contribute

### If you're W1 (Infrastructure)

**Priority 1**: Wire W2 resolvers in CDK
- Use `appsync.Resolver` to map schema fields to `resolvers/*.js`
- Create DynamoDB table with GSIs per `02_DATA_MODEL.md`
- Seed FoodRules from `food-rules.seed.ts`

**Priority 2**: Deploy AppSync API to dev
- Configure Cognito User Pool as auth provider
- Set up Lambda data source
- Make API URL available to other workers

### If you're any other worker

**Now**: Unit-test your Phase A work locally
- Use DynamoDB Local for backend tests (see `docs/LOCAL_TESTING.md`)
- Use mocks for W1 API dependencies
- Verify types match W2 schema

**After W1 deploys**: Integration-test against real API
- Point mobile/Lambda services to dev AppSync URL
- Run E2E tests via Maestro
- Iterate on schema/resolver issues in real-time

## Next Sync

**Daily async**: GitHub Discussions `#daily-standup`
- Post what you completed, what you're starting, any blockers

**Weekly (if needed)**: 30-min call for critical blockers

## Communication Channels

- **Design decisions**: GitHub Issues + Discussions
- **Code review**: GitHub PRs with CODEOWNERS
- **Urgent blockers**: Tag person in GitHub issue + @ mention
- **Async updates**: Daily standup discussion

---

**Next action**: W1 to create CDK AppSync stack + deploy to dev

🚀 **Go build it!**
