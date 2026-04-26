# 09 — Testing & Validation Strategy

This is how we know the app actually works. AI assistance speeds up coding but doesn't replace verification — every claim of "done" is backed by tests.

## Testing pyramid

```
       /\
      /E2E\         Maestro (10-20 critical flows)
     /────\
    /Integ.\        Lambda integration tests, API contract
   /────────\
  /Component\       React Native Testing Library + Storybook
 /────────────\
/  Unit Tests  \   Vitest/Jest — fastest, most numerous
─────────────────
```

## Unit tests

**Tools**: Jest (React Native default; Vitest doesn't work with RN's Metro bundler)

**Coverage targets**:
- `packages/shared/`: 100% (pure functions, schemas)
- `services/` (Lambdas): 80%+
- `apps/mobile/src/services/` (data services): 70%+
- `apps/mobile/src/components/`: snapshot + behavior tests
- UI screens: not unit-tested (covered by E2E)

**Where**:
- `*.test.ts` co-located with source
- Fast: `pnpm test:unit` runs in < 30s for whole repo

**Example targets**:
- `expiry.ts` pure function: hundreds of cases (edge cases around DST, leap years, bad input)
- Zod schemas: validate accept/reject patterns
- AppSync JS resolvers: mock context, assert request/response shape
- Lambda handlers: mock AWS SDK, assert business logic

## Component tests

**Tools**: React Native Testing Library + jest-native + Storybook (component dev)

**Storybook for React Native** runs on-device for visual review. Each component primitive has stories for every variant + state.

**RNTL** for behavioral tests:
- Renders the right thing
- Responds to user input
- Calls the right callbacks
- Accessibility props correct

**Visual regression**: Storybook + **Chromatic** for component-level. For full-screen RN snapshots, use Maestro screenshot diff or **Emerge Tools**.

## Integration tests

**Tools**: Jest + AWS SDK against ephemeral CDK environment

For each Lambda:
- Deploy to ephemeral PR env
- Invoke via test harness
- Assert actual DynamoDB writes, S3 uploads, side effects
- Tear down on PR close

Example: `services/ai/classify-food/handler.integration.test.ts`
- Deploys to `pr-123` env
- Calls real Bedrock with sample image
- Asserts response structure + DynamoDB record written

## API contract tests

**Tool**: GraphQL operations as test fixtures

- Every mutation/query has a "contract" test fixture
- Run against staging on every deploy
- Catches schema drift between client and server
- Codegen guarantees client/server type compatibility

## E2E mobile tests

**Tool**: **Maestro** (chosen over Detox/Appium)

**Why Maestro**:
- YAML-based flows (readable)
- Works with Expo managed workflow (no ejecting)
- Runs on Maestro Cloud for CI
- Detox is faster but requires bare workflow + brittle
- Appium is legacy

**Test scope (10-20 flows for MVP)**:

1. `flows/onboarding.yaml` — install app → onboarding → first item added
2. `flows/scan-qr.yaml` — print sticker → scan → claim container
3. `flows/add-item-manual.yaml` — open scan → manual entry → saved
4. `flows/add-item-photo.yaml` — open scan → photo mode → AI classifies → save
5. `flows/add-item-barcode.yaml` — barcode scan → product found → save
6. `flows/mark-eaten.yaml` — swipe item → mark eaten → status changes
7. `flows/expiry-notification.yaml` — fast-forward time → notification appears → tap
8. `flows/sign-in.yaml` — email magic link flow
9. `flows/account-delete.yaml` — settings → delete → confirm → signed out
10. `flows/dark-mode.yaml` — toggle dark mode → UI updates
11. `flows/offline.yaml` — airplane mode → add item → re-online → syncs

**Cloud execution**: Maestro Cloud runs on real iOS + Android devices in CI on every deploy.

**Local execution**: `maestro test flows/onboarding.yaml`

## Accessibility tests

**Tools**: `@testing-library/jest-native`, manual VoiceOver / TalkBack passes

**Automated checks**:
- Every Pressable has accessibilityRole + accessibilityLabel
- ESLint rule `eslint-plugin-react-native-a11y`
- Snapshot tests assert a11y props on rendered components

**Manual testing**:
- Weekly: VoiceOver + TalkBack walkthrough by a worker
- Pre-release: full accessibility audit (use Apple Accessibility Inspector + Android Accessibility Scanner)
- Cap Dynamic Type at 1.5x and verify no layout breakage

## AI evaluation

**Tools**: Custom eval suite + **Langfuse** (open-source, self-hostable on AWS) for tracking

**Eval datasets** (in `services/ai/evals/`):

- `photos/`: 500-1000 labeled food photos
- `receipts/`: 100 receipt images with expected line items
- `expiry-dates/`: 50 packaging photos with expected dates

**Eval CI job** (runs on prompt changes):

```bash
pnpm ai:eval classify-food
```

Outputs:
- Accuracy (top-1 match)
- Confidence calibration (Brier score)
- Latency p50/p95/p99
- Cost per call
- Cache hit rate

**Failure criteria**:
- Accuracy drops > 2% from baseline → fail build
- P95 latency > 5s → fail build
- Cost regressions > 20% → warn

**Production tracking**:
- Every classification logged to `ai_classifications` table
- North Star metric: **user override rate** (target < 15%)
- Dashboards in CloudWatch + PostHog

## Performance tests

**Tools**: **Maestro** with screen recording + manual review

**Targets**:
- Cold start to dashboard: < 2s on iPhone 12 / Pixel 6
- Frame rate on dashboard scroll: 60fps
- Sync time after offline: < 3s for 50 items
- Photo upload: < 5s for 1024px JPEG

**Cloud-side**:
- AWS X-Ray distributed tracing
- CloudWatch Synthetics canaries on critical endpoints
- Latency alarms: AppSync p95 > 1s, Lambda p95 > 2s

## Security tests

**Static analysis**:
- **Semgrep** with `p/owasp-top-ten`, `p/react`, `p/typescript`
- **CodeQL** (GitHub Advanced Security)
- **ESLint security plugins**

**Dependency scanning**:
- **Dependabot** (GitHub, automatic)
- **Snyk** in CI (warns on HIGH, fails on CRITICAL)
- **AWS Inspector** for Lambda layers

**Mobile-specific**:
- **MobSF** (Mobile Security Framework) on each release IPA/APK
- OWASP MASVS L1 self-assessment before each major release

**Penetration testing**:
- External pentest annually post-launch (NCC Group, Trail of Bits, Cure53)
- Bug bounty (HackerOne private) post-launch

**Auth flow validation**:
- Cross-tenant access tests (User A cannot see User B's data) — automated via integration tests
- Token expiry/rotation tests
- Magic link replay attack tests
- Rate limit enforcement tests

## Production validation

**Real user monitoring**:
- **Sentry React Native SDK** for crashes + performance + breadcrumbs
- **PostHog** for product analytics + feature flags + A/B + surveys
- **AWS X-Ray** for distributed tracing of API calls

**Synthetic monitoring**:
- **CloudWatch Synthetics** canaries on:
  - Login flow
  - Item creation flow
  - AI classification flow
- Run every 5 min from multiple regions
- Alert on failure

**Feature flags**:
- **PostHog feature flags** for client-side flagging (gradual rollout)
- **AWS AppConfig** for backend flag (Lambda config without deploy)
- New features ship dark, then enabled per cohort

**Canary deployments**:
- Mobile: phased rollout via store-native tools (Apple 1%→100%, Play staged %)
- Backend: CDK deploy is atomic per stack; no canary needed at MVP scale
- Bedrock prompts: PROMPT_VERSION bump after eval suite passes

## Manual testing

### Beta program
- 100+ beta testers recruited via Reddit (r/foodhacks, r/MealPrepSunday, r/ZeroWaste), Twitter, IndieHackers
- TestFlight (external testers up to 10k)
- Play Open Testing
- Structured feedback via in-app survey + Crisp chat

### Bug bashes
- 90-min sessions before each release
- Full team
- Structured scenarios from feature catalog

### Notion test matrix
- Each feature × device × OS version
- Track pass/fail per row
- Required green before promotion to prod

## Real data, no mocks (in production)

The user's explicit requirement: production runs against real AWS services with real data.

**Mocks are only for**:
- Unit tests (mocked AWS SDK)
- Component tests (mocked services)
- Local dev (optional override)

**E2E tests run against**:
- Ephemeral CDK environment with real AWS services
- Real Cognito (test user pool)
- Real DynamoDB (test table)
- Real Bedrock (eval images)
- Test mode webhooks for billing

**Staging is exactly like prod**:
- Same AWS services
- Same architecture
- Subset of test users (no real billing)

## CI matrix

Every PR runs:

| Job | What | Runtime |
|---|---|---|
| typecheck | `tsc --noEmit` | < 30s |
| lint | ESLint + Prettier check | < 30s |
| unit | All unit tests | < 60s |
| component | React Native Testing Library | < 60s |
| graphql:validate | Schema validation | < 10s |
| cdk:synth | Synthesize CDK | < 60s |
| semgrep | Security static analysis | < 30s |
| snyk | Dependency scan (warn) | < 30s |

Every merge to main also runs:
- Integration tests against staging
- E2E Maestro flows (Cloud)
- AI eval suite (if AI files changed)
- Smoke tests post-deploy

## Local testing scripts

```bash
pnpm test               # all tests
pnpm test:unit          # unit only
pnpm test:component     # component only
pnpm test:integration   # integration (needs AWS creds)
pnpm test:e2e           # Maestro local
pnpm ai:eval            # AI evals
pnpm typecheck          # tsc
pnpm lint               # eslint
pnpm format             # prettier
pnpm graphql:codegen    # regen GraphQL types
pnpm cdk:diff           # what would deploy?
```

## Pre-merge checklist (per PR)

A PR is mergeable only if:
- [ ] CI green (all required checks)
- [ ] Code review approved by another worker
- [ ] Acceptance criteria for any new feature checked
- [ ] Tests added/updated
- [ ] Sentry + PostHog instrumentation if new feature
- [ ] Accessibility tested if UI change
- [ ] Documentation updated if architecture change
- [ ] No secrets committed (gitleaks pre-commit)
- [ ] No console.log left in code

## Pre-release checklist (per version)

A release is shippable only if:
- [ ] All E2E flows green on Maestro Cloud
- [ ] AI eval suite within thresholds
- [ ] No CRITICAL Sentry issues open
- [ ] Performance budget respected (cold start < 2s)
- [ ] TestFlight build approved by 5+ beta users
- [ ] Pre-launch report on Play Console green
- [ ] Privacy nutrition labels match actual data collection
- [ ] Account deletion flow verified
- [ ] Data export flow verified
- [ ] Smoke tests on prod after deploy

## How we know it works (the user's question)

This is the multi-layer answer:

1. **At commit time**: typecheck, lint, unit tests catch regressions
2. **At PR time**: CI runs full unit + component + GraphQL + CDK synth + security scans
3. **At merge time**: integration tests + E2E flows + AI evals
4. **At deploy time**: smoke tests against staging
5. **In TestFlight/Play Internal**: beta cohort manual testing
6. **In production**:
   - Sentry catches crashes immediately
   - CloudWatch Synthetics canaries catch outages within 5 min
   - PostHog funnels track user-journey health
   - AI override rate tracked daily
7. **Quarterly**: penetration test, accessibility audit, performance audit

If any layer fails, the alert hits the team and we roll back.

## Cross-references

- Feature acceptance criteria → [07_FEATURES.md](07_FEATURES.md)
- AI eval details → [06_AI_INTEGRATION.md](06_AI_INTEGRATION.md)
- Security testing → [04_SECURITY.md](04_SECURITY.md)
- Deployment pipelines → [08_DEPLOYMENT.md](08_DEPLOYMENT.md)
