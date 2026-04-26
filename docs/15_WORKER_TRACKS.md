# 15 — Worker Tracks (10 Parallel Builders)

This document assigns work to 10 parallel workers (W1–W10). Each worker owns a track end-to-end.

The goal: a worker reads their track + dependencies and can start building immediately without further questions.

## Coordination

- **Daily**: each worker pulls latest main, runs CI green, opens PRs
- **Blockers**: if W-X blocks W-Y, W-Y reads W-X's PR description; if still blocked, reads relevant docs
- **Schema changes**: W-3 owns GraphQL schema; all schema changes go through them
- **Data model changes**: W-2 owns DynamoDB single-table; coordinated via PR review
- **UI primitives**: W-5 owns design system; everyone uses their components

## Phasing

Workers deliver in three phases per wave:

- **Phase A (Days 1-3)**: scaffold, types, contracts
- **Phase B (Days 4-15)**: feature implementation
- **Phase C (Days 16-21)**: integration + polish + tests

Phase A must be complete before any worker starts Phase B in their own track.

---

## W1 — Infrastructure / IaC

**Owns**: AWS CDK, GitHub Actions, environment management, observability infra

**Reads first**: [01_ARCHITECTURE.md](01_ARCHITECTURE.md), [08_DEPLOYMENT.md](08_DEPLOYMENT.md), [13_OBSERVABILITY.md](13_OBSERVABILITY.md), [04_SECURITY.md](04_SECURITY.md)

### Deliverables (Wave 1)

#### Phase A
- [ ] pnpm workspace skeleton
- [ ] CDK app structure (`infra/cdk/`)
- [ ] CDK stacks: NetworkStack, DataStack, AuthStack, ApiStack, AiStack, NotificationsStack, OpsStack, SecurityStack, BillingStack
- [ ] Per-env config (`dev`, `staging`, `prod`)
- [ ] GitHub Actions workflows: `ci.yml`, `deploy-staging.yml`, `deploy-prod.yml`, `pr-env.yml`, `mobile-build.yml`, `eas-update.yml`
- [ ] OIDC provider + GitHub Actions IAM role
- [ ] Domain registration + ACM certs
- [ ] Bootstrap CDK in dev account

#### Phase B
- [ ] DynamoDB table with all GSIs (per [02_DATA_MODEL.md](02_DATA_MODEL.md))
- [ ] S3 buckets (photos, exports, app-assets) with policies
- [ ] KMS CMKs per environment
- [ ] CloudFront distribution + WAF
- [ ] Cognito User Pool + identity providers
- [ ] AppSync API with schema + JS resolvers
- [ ] Lambda execution roles (least-privilege per Lambda)
- [ ] Bedrock model access requested
- [ ] CloudWatch alarms wired
- [ ] Secrets Manager + SSM Parameter Store
- [ ] CloudTrail with S3 lock
- [ ] GuardDuty + Security Hub enabled

#### Phase C
- [ ] CDK snapshot tests
- [ ] Cost monitoring dashboard
- [ ] Production runbooks
- [ ] Disaster recovery drill (PITR restore test)

### Key files
- `infra/cdk/bin/app.ts`
- `infra/cdk/lib/stacks/*.ts`
- `infra/cdk/lib/constructs/*.ts`
- `.github/workflows/*.yml`

### Hand-off interfaces (what other workers need from W1)
- CDK outputs: AppSync URL, Cognito IDs, S3 bucket names → consumed by mobile app via `.env.local`
- GitHub Actions secrets configured for OIDC

---

## W2 — Backend / Data

**Owns**: Lambda business logic (non-AI), DynamoDB single-table access patterns, AppSync resolvers, sync engine

**Reads first**: [02_DATA_MODEL.md](02_DATA_MODEL.md), [03_API_SPEC.md](03_API_SPEC.md), [01_ARCHITECTURE.md](01_ARCHITECTURE.md)

### Deliverables (Wave 1)

#### Phase A
- [ ] AppSync JS resolvers for all CRUD (Container, Item, Profile, Household, FoodRule)
- [ ] Resolver test fixtures
- [ ] DynamoDB access pattern helpers (`packages/shared/src/db/`)
- [ ] FoodRule seed data (~150 entries)

#### Phase B
- [ ] Lambdas: `delete-account`, `export-data`, `revenuecat-webhook`, `food-rules-publish`
- [ ] Lambda: `notify-expiring` (EventBridge cron)
- [ ] Step Function: `delete-account-flow`
- [ ] AppSync subscription resolvers (real-time household sync)
- [ ] Sync engine resolver: `deltaSync` query
- [ ] Conflict resolution logic (per-field rules)

#### Phase C
- [ ] Integration tests against ephemeral env
- [ ] Performance benchmarks (queries within p95 targets)
- [ ] Load test with k6 or Artillery (1k concurrent users)

### Key files
- `infra/cdk/lib/appsync/resolvers/**/*.js`
- `services/account/`
- `services/notifications/`
- `services/billing/`
- `packages/shared/src/db/`
- `packages/shared/src/sync/`

### Hand-off
- API contract → consumed by mobile app (W5–W7)
- Data model → consumed by AI workers (W4) and mobile (W5–W7)

---

## W3 — Auth & Security

**Owns**: Cognito custom auth flow, security controls, IAM, account flows

**Reads first**: [04_SECURITY.md](04_SECURITY.md), [01_ARCHITECTURE.md](01_ARCHITECTURE.md), [03_API_SPEC.md](03_API_SPEC.md) (auth section)

### Deliverables (Wave 1)

#### Phase A
- [ ] Cognito triggers: `auth-define-challenge`, `auth-create-challenge`, `auth-verify-challenge`, `auth-pre-signup`, `auth-post-confirm`
- [ ] SES sending domain configured
- [ ] Magic link email template + delivery
- [ ] HMAC-signed nonce storage in DynamoDB

#### Phase B
- [ ] Apple Sign-In integration (Cognito federated identity)
- [ ] Google Sign-In integration
- [ ] WAF rules deployed (rate limit, GraphQL introspection block)
- [ ] AppSync function: `checkHouseholdMembership` (called from every household-scoped resolver)
- [ ] Per-user rate limit logic (Dynamo counter)
- [ ] AI quota check Lambda layer (used by AI Lambdas)

#### Phase C
- [ ] Security tests: cross-tenant access, rate limit enforcement
- [ ] OWASP MASVS L1 self-assessment
- [ ] MobSF scan on dev build
- [ ] Penetration test plan documented

### Key files
- `services/auth/**`
- `infra/cdk/lib/stacks/auth-stack.ts`
- `infra/cdk/lib/stacks/security-stack.ts`
- `infra/cdk/lib/appsync/functions/checkAuth.js`
- `infra/cdk/lib/appsync/functions/checkHouseholdMembership.js`
- `packages/shared/src/auth/`

---

## W4 — AI

**Owns**: Bedrock + Textract Lambdas, prompts, evals, AI quotas

**Reads first**: [06_AI_INTEGRATION.md](06_AI_INTEGRATION.md), [02_DATA_MODEL.md](02_DATA_MODEL.md) (AI tables)

### Deliverables (Wave 1)

#### Phase A
- [ ] Bedrock model access (Haiku 4.5)
- [ ] Lambda scaffolding for: `classify-food`, `ocr-expiry-date`, `image-resize`
- [ ] Shared Bedrock client (`services/shared/bedrockClient.ts`)
- [ ] Textract client wrapper (`services/shared/textractClient.ts`)
- [ ] Eval suite skeleton (`services/ai/evals/`)

#### Phase B
- [ ] `classify-food` Lambda with prompt caching
- [ ] `ocr-expiry-date` Lambda with Textract + Bedrock fallback
- [ ] `image-resize` Lambda triggered by S3
- [ ] AI quota enforcement
- [ ] AI cost tracking (writes to `ai_classifications`)
- [ ] Eval datasets: 500 photos labeled, 50 expiry date images
- [ ] Eval CI job

#### Phase C
- [ ] Performance optimization (warm Lambdas, prompt cache hit rate target)
- [ ] User override rate dashboard (PostHog)
- [ ] Prompt versioning + A/B test framework

### Wave 2 additions
- [ ] `suggest-recipes` Lambda (Sonnet 4.6)
- [ ] `learn-preferences` Lambda (DynamoDB Stream consumer)

### Wave 3 additions
- [ ] `suggest-restaurants` Lambda (Sonnet + Google Places)
- [ ] `ocr-receipt` Lambda + Step Function

### Key files
- `services/ai/classify-food/`
- `services/ai/ocr-expiry-date/`
- `services/ai/suggest-recipes/`
- `services/ai/suggest-restaurants/`
- `services/ai/learn-preferences/`
- `services/ai/ocr-receipt/`
- `services/ai/evals/`
- `services/images/image-resize/`

---

## W5 — Mobile Foundation & Design System

**Owns**: Expo project, navigation, Tamagui design system, component primitives, theming

**Reads first**: [05_UI_UX.md](05_UI_UX.md), [01_ARCHITECTURE.md](01_ARCHITECTURE.md) (mobile section)

### Deliverables (Wave 1)

#### Phase A
- [ ] Expo SDK 51+ project scaffold
- [ ] expo-router setup with route groups: `(auth)`, `(main)`
- [ ] Tamagui configuration with all design tokens (per [05_UI_UX.md](05_UI_UX.md))
- [ ] AWS Amplify Auth + API libraries integrated
- [ ] WatermelonDB schema + models
- [ ] expo-secure-store wrapper
- [ ] Sentry + PostHog integrations

#### Phase B
- [ ] Component primitives (all 11 listed in UI doc)
- [ ] Tamagui theme: light + dark + high-contrast
- [ ] Icon component (SF Symbols / Lucide wrapper)
- [ ] Storybook for components
- [ ] Animation utilities (Reanimated, Moti wrappers)
- [ ] Navigation utilities (deep link handling, route tracking)
- [ ] Service layer scaffold (Containers, Items, etc. — empty methods)
- [ ] Localization framework (`i18next` with `en.json`)

#### Phase C
- [ ] Visual regression baseline (Storybook + Chromatic)
- [ ] Accessibility audit (every component has labels)
- [ ] Performance: cold start measured + budgeted

### Key files
- `apps/mobile/app/_layout.tsx`
- `apps/mobile/app/(auth)/`
- `apps/mobile/app/(main)/`
- `apps/mobile/src/components/ui/**`
- `apps/mobile/src/theme/`
- `apps/mobile/src/db/`
- `apps/mobile/src/lib/`
- `tamagui.config.ts`

### Hand-off
- Component primitives → consumed by W6, W7

---

## W6 — Mobile Core (Capture & Lifecycle)

**Owns**: scan flows (QR, barcode, photo, date), item creation, container management, dashboard, notifications

**Reads first**: [05_UI_UX.md](05_UI_UX.md), [07_FEATURES.md](07_FEATURES.md) F-005 to F-018, [03_API_SPEC.md](03_API_SPEC.md)

### Deliverables (Wave 1)

#### Phase A
- [ ] Camera screen scaffold with mode switcher
- [ ] QR sticker generation + PDF export
- [ ] Service layer: ContainersService, ItemsService

#### Phase B
- [ ] Onboarding flow (4 screens)
- [ ] Auth screens (email magic link, Apple, Google)
- [ ] Scan QR → claim/open container
- [ ] Scan barcode → product lookup
- [ ] Scan photo → AI classification (calls W4 Lambda)
- [ ] Scan date → OCR (calls W4 Lambda)
- [ ] Manual add item flow
- [ ] Dashboard with status colors, sectioned list, swipe actions
- [ ] Item detail screen with hero photo + actions
- [ ] Mark eaten / tossed / frozen / partial / snooze
- [ ] Container list + detail
- [ ] Print stickers screen

#### Phase C
- [ ] Local notifications (expo-notifications)
- [ ] Universal Link / App Link handling
- [ ] Search + filter inventory
- [ ] Bulk actions
- [ ] Offline behavior testing

### Key files
- `apps/mobile/app/(auth)/sign-in.tsx`
- `apps/mobile/app/(main)/index.tsx`
- `apps/mobile/app/(main)/scan.tsx`
- `apps/mobile/app/(main)/items/`
- `apps/mobile/app/(main)/containers/`
- `apps/mobile/app/(main)/stickers.tsx`
- `apps/mobile/src/services/ContainersService.ts`
- `apps/mobile/src/services/ItemsService.ts`
- `apps/mobile/src/features/scan/`
- `apps/mobile/src/features/items/`
- `apps/mobile/src/features/notifications/`

---

## W7 — Mobile Settings & Account

**Owns**: settings screens, profile, preferences, account deletion, data export, subscription UI, support

**Reads first**: [05_UI_UX.md](05_UI_UX.md) (S12 settings), [07_FEATURES.md](07_FEATURES.md) F-019 to F-021, [04_SECURITY.md](04_SECURITY.md)

### Deliverables (Wave 1)

#### Phase A
- [ ] Settings navigation skeleton (S12 layout)

#### Phase B
- [ ] Profile editor (name, photo, email)
- [ ] Notification preferences (kinds, quiet hours, sound)
- [ ] Time zone, units
- [ ] Dietary preferences picker (multi-select tags)
- [ ] Cuisine preferences picker
- [ ] Allergies picker
- [ ] Theme toggle (auto/light/dark)
- [ ] Privacy controls
- [ ] About page (version, terms, privacy)
- [ ] Sign out
- [ ] Delete account flow (with confirmation)
- [ ] Export data flow

#### Phase C
- [ ] Help & Support screen (FAQ link, contact, bug report)
- [ ] Bug report screen with auto-attach device info
- [ ] Shake-to-report wired
- [ ] Subscription screen (RevenueCat integration; locked until Wave 2)

### Key files
- `apps/mobile/app/(main)/settings/`
- `apps/mobile/src/features/settings/`
- `apps/mobile/src/features/auth/`

---

## W8 — Mobile Sync & Offline

**Owns**: WatermelonDB sync engine, offline queue, conflict resolution on client side

**Reads first**: [02_DATA_MODEL.md](02_DATA_MODEL.md), [01_ARCHITECTURE.md](01_ARCHITECTURE.md) (sync model), [03_API_SPEC.md](03_API_SPEC.md) (deltaSync)

### Deliverables (Wave 1)

#### Phase A
- [ ] WatermelonDB schema mirrors Dynamo
- [ ] Sync metadata fields on every entity
- [ ] Repository layer (queries, mutations)

#### Phase B
- [ ] Sync engine: push local writes
- [ ] Sync engine: pull deltas via `deltaSync` query
- [ ] Real-time subscription handler (AppSync subscriptions → local DB)
- [ ] Offline write queue with retry
- [ ] Conflict resolution: per-field rules (per [02_DATA_MODEL.md](02_DATA_MODEL.md))
- [ ] Sync indicator UI (pending/synced/error states)

#### Phase C
- [ ] Offline scenario testing (airplane mode, partial sync, conflicts)
- [ ] Sync performance: 1000 items batched in < 5s
- [ ] Documentation of sync edge cases

### Key files
- `apps/mobile/src/db/sync.ts`
- `apps/mobile/src/db/repositories/`
- `apps/mobile/src/services/SyncService.ts`

---

## W9 — Ops, CI/CD, Quality

**Owns**: GitHub Actions reliability, Sentry/PostHog dashboards, app store accounts, beta program, release management

**Reads first**: [08_DEPLOYMENT.md](08_DEPLOYMENT.md), [09_TESTING.md](09_TESTING.md), [10_APP_STORES.md](10_APP_STORES.md), [13_OBSERVABILITY.md](13_OBSERVABILITY.md)

### Deliverables (Wave 1)

#### Phase A
- [ ] Apple Developer account enrolled
- [ ] Google Play Developer account enrolled
- [ ] EAS project configured (`eas.json`)
- [ ] App Store Connect record created
- [ ] Play Console record created
- [ ] Sentry org + project configured (mobile + Lambda)
- [ ] PostHog project configured

#### Phase B
- [ ] CI matrix all-green
- [ ] PR ephemeral env reliability
- [ ] Maestro Cloud configured + 11 critical flows
- [ ] CloudWatch dashboards
- [ ] Sentry dashboards
- [ ] PostHog funnels
- [ ] Privacy policy + ToS published
- [ ] App Store + Play Store listings drafted (screenshots, copy, age rating)

#### Phase C
- [ ] TestFlight + Play Internal Testing live
- [ ] Beta cohort recruitment (100+ testers)
- [ ] Bug bash sessions
- [ ] Phased rollout plan
- [ ] Status page configured (post-launch)
- [ ] Customer support email setup (Google Workspace, support@)
- [ ] FAQ Notion page written

### Key files
- `.github/workflows/*.yml`
- `apps/mobile/eas.json`
- `docs/runbooks/`
- `apps/mobile/.maestro/flows/`

---

## W10 — Cross-cutting (Design Polish, Illustrations, Copy, Localization)

**Owns**: design assets, illustrations, app icon, marketing copy, accessibility audit, localization

**Reads first**: [05_UI_UX.md](05_UI_UX.md), [07_FEATURES.md](07_FEATURES.md), [10_APP_STORES.md](10_APP_STORES.md)

### Deliverables (Wave 1)

#### Phase A
- [ ] Brand identity confirmed (name, color palette, typography)
- [ ] Figma design file with all screens (mockups)

#### Phase B
- [ ] App icon (1024px, all sizes)
- [ ] Splash screen
- [ ] One signature illustration (empty fridge)
- [ ] Onboarding illustrations (4)
- [ ] Empty state illustrations (per screen)
- [ ] Lottie animations: pull-to-refresh, scan reticle, success confetti
- [ ] All copy strings (en.json) — 200+ strings
- [ ] App Store / Play Store description copy
- [ ] Marketing screenshots (per device size)

#### Phase C
- [ ] Accessibility audit (manual VoiceOver + TalkBack pass)
- [ ] Localization framework set up (en only at MVP, structure ready for fr/es/de)
- [ ] Press kit page (Wave 2 prep)
- [ ] Final polish pass: every interaction has haptic, every screen has empty state

### Key files
- `apps/mobile/assets/illustrations/`
- `apps/mobile/assets/lottie/`
- `apps/mobile/assets/icon.png`
- `apps/mobile/src/i18n/en.json`
- App Store / Play Store assets folder

---

## Cross-worker dependencies

```
W1 (Infra) ─┬─→ W2 (Backend)
            ├─→ W3 (Auth)
            └─→ W4 (AI)

W2 (Backend) ──→ W6, W7, W8 (consume APIs)

W3 (Auth) ──→ W6, W7 (consume auth flow)

W4 (AI) ──→ W6 (consumes classify, OCR mutations)

W5 (Mobile foundation) ──→ W6, W7 (consume primitives)

W8 (Sync) ─→ W6, W7 (provides reactive data)

W10 (Design) ──→ W5, W6, W7 (consume assets)

W9 (Ops) ──→ all (CI/CD applies to everyone)
```

## Daily PRs

Each worker is expected to merge ~1 PR per day during Phase B. Smaller PRs > big bangs.

## Stuck handling

If a worker is stuck for > 4 hours:
1. Re-read the relevant doc(s)
2. Check open PRs from dependent workers (maybe API isn't ready yet)
3. Open a GitHub Discussion explaining the blocker
4. Coordinator (or designated workers) helps unblock or reassigns

## Wave 2 worker reassignment

After MVP (Wave 1) ships, Wave 2 starts. Worker tracks reshuffle:

| Worker | Wave 2 focus |
|---|---|
| W1 | Multi-region prep, cost optimization |
| W2 | Households, real-time sync, recipe persistence |
| W3 | TOTP MFA enable, advanced security |
| W4 | Recipe + restaurant Lambdas, preference learning |
| W5 | Wave 2 UI components (recipes, household), polish |
| W6 | Recipe screens, daily digest UI |
| W7 | Subscription paywall (RevenueCat live) |
| W8 | Conflict resolution edge cases for households |
| W9 | Beta → public launch, App Store / Play Store production |
| W10 | More illustrations, localization (es, fr) |

## Cross-references

- MVP scope → [00_VISION.md](00_VISION.md)
- Feature acceptance → [07_FEATURES.md](07_FEATURES.md)
- Pre-flight checklist → [16_MVP_CHECKLIST.md](16_MVP_CHECKLIST.md)
