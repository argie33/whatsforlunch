# 25 — Environments & Build Phases

A clear-eyed look at where we are in the build lifecycle and what each environment means.

## Where we are right now

**Status**: design complete, code not yet written.

We are NOT in production. We are NOT in staging. We are at the **start of building**.

The plan: build locally first → deploy to AWS dev → AWS staging → finally AWS production once stable.

We are intentionally cautious about production. **Production is sacred. Building is not yet near production.**

## Build lifecycle phases

```
Phase 0: Design (NOW — ✓ complete)
    ↓
Phase 1: Local development (workers building, no AWS yet)
    ↓
Phase 2: AWS dev environments (per-developer sandboxes)
    ↓
Phase 3: AWS staging (shared, integration testing)
    ↓
Phase 4: TestFlight + Play Internal (real devices, beta testers)
    ↓
Phase 5: AWS production (live but private, gated rollout)
    ↓
Phase 6: Public launch (App Store + Play Store at 100% rollout)
    ↓
Phase 7: Operating (post-launch — break/fix, releases, scaling)
```

We don't skip phases.

## Environment matrix

| Environment | Purpose | Backend | Mobile | Data | Users |
|---|---|---|---|---|---|
| **Local** | Build + iterate | None or local-stub | Expo dev client → local mocks | In-memory / SQLite seed | Worker only |
| **dev-{worker}** | Per-worker AWS sandbox | Real AWS, isolated | Expo dev client → AWS dev | DynamoDB dev table | Worker only |
| **pr-{N}** | Ephemeral PR preview | Real AWS, ephemeral | Expo dev client → preview | DynamoDB pr-N | Worker + reviewer |
| **staging** | Pre-prod integration | Real AWS, prod-shaped | EAS preview build | DynamoDB staging | Workers + alpha testers |
| **TestFlight / Play Internal** | Real-device beta | Staging | TestFlight / Play Internal builds | Staging | 100+ beta testers |
| **production** | Live | Real AWS | App Store / Play Store builds | DynamoDB prod | Real users |

Each environment uses **the same code**. Differences are config-only:
- API URLs (Cognito IDs, AppSync URLs, S3 buckets)
- Feature flags
- Bedrock model IDs (could vary)

## Phase 1: Local development

### Goal
Workers (W1-W10) build and iterate **on their own machines** with fast feedback.

### Setup
- Clone repo
- `pnpm install`
- Some workers (W5, W6, W7) can develop the mobile app against mock services for the first day or two
- Other workers (W1-W4, W8) need AWS dev sandbox immediately

### Mobile app local-only mode
We support a flag `EXPO_PUBLIC_OFFLINE_MODE=true` that:
- Stubs Cognito (auto-signed-in test user)
- Stubs AppSync (returns fixtures)
- Stubs Bedrock (returns canned classification)
- Uses local SQLite with seed data
- Lets W6/W7 build UI without AWS

This is a development convenience, not a deployment target.

### Backend local-only mode
- AppSync resolvers tested via unit tests + AppSync's `evaluate-mapping-template` CLI
- Lambda tested via unit tests + `sam local invoke`
- DynamoDB stubbed via `aws-sdk-client-mock`

But integration tests need AWS — so workers move to dev sandboxes for integration testing.

## Phase 2: AWS dev environments (per-worker)

### Goal
Each worker can deploy their changes to a private AWS sandbox and validate against real services.

### Setup
- One AWS account (ideally AWS Organizations with dev sub-account)
- Each worker assumes IAM role via SSO
- CDK deploys with context `env=dev-{worker-name}`
- Outputs CDK stack outputs to `apps/mobile/.env.local`

### Resource isolation
Each dev environment is fully isolated:
- Cognito User Pool: `wfl-dev-alex`
- DynamoDB table: `WFL-Main-dev-alex`
- S3 buckets: `wfl-photos-dev-alex`, `wfl-exports-dev-alex`
- AppSync URL: `api-dev-alex.preview.whatsfresh.app`

No data crosses between dev environments.

### Cost
~$0–5/dev/month at idle. Workers should `cdk destroy` when not actively building.

## Phase 2.5: PR preview environments (ephemeral)

When a PR is opened:
1. GitHub Actions deploys CDK with `env=pr-{N}` (where N is the PR number)
2. Auto-comments PR with preview URL
3. Reviewer can test against real AWS
4. PR closed → preview env auto-destroyed

Lifetime: PR open → PR closed. Typical 1-3 days.

## Phase 3: AWS staging

### Goal
Long-lived shared environment that mirrors production. Pre-prod integration tests, alpha testing.

### Setup
- One staging environment per AWS account
- Cognito User Pool: `wfl-staging`
- DynamoDB table: `WFL-Main-staging`
- AppSync URL: `api-staging.whatsfresh.app`
- Same architecture as prod, just smaller scale (no provisioned throughput)

### Auto-deploy
Every merge to `main` auto-deploys to staging. No manual approval. CI runs smoke tests after.

### Data
- Seeded with synthetic test data
- No real user data
- Test accounts pre-created
- Reset weekly (optional)

### Use cases
- Workers test integration after merging features
- E2E Maestro tests run nightly against staging
- AI eval suite runs against staging
- TestFlight + Play Internal builds point to staging

## Phase 4: TestFlight + Play Internal Testing

### Goal
Real devices, real beta testers, real-world usage — but staged data.

### Setup
- Mobile app built with `eas build --profile preview`
- Points to staging backend
- Distributed via:
  - **TestFlight** (internal testers + 10K external link)
  - **Play Internal Testing** (100 testers)
- Beta cohort recruited via Reddit, Twitter, IndieHackers

### Goal of beta
- Validate UX on real devices
- Find bugs we missed
- Validate AI classification accuracy in the wild
- Get NPS / qualitative feedback

### Duration
Beta runs for ~2-4 weeks before public launch.

## Phase 5: AWS production (gated)

### Goal
Live infrastructure but with limited public exposure.

### Setup
- Cognito User Pool: `wfl-prod`
- DynamoDB table: `WFL-Main-prod` with PITR + AWS Backup daily
- AppSync URL: `api.whatsfresh.app`
- Full WAF, GuardDuty, Security Hub enabled
- Real Bedrock with prod quota
- KMS CMKs with rotation
- All alarms wired

### Deploy gate
- Manual approval in GitHub Actions
- Tag-based: only `vN.N.N` tags trigger prod deploys
- After deploy: smoke tests run automatically

### Phased rollout
- Phase 1: deploy infra + create resources, no users (T-7 days from launch)
- Phase 2: invite-only testers (T-3 days, ~50 users)
- Phase 3: limited public via TestFlight external link (T-1 day, ~500 users)
- Phase 4: full public launch on App Store + Play Store (T-0)

## Phase 6: Public launch

### App Store + Play Store rollout

| Step | Apple | Google |
|---|---|---|
| Submit | Apple review (24-48h) | Closed → Open testing → Production review |
| Phased rollout | 1% → 100% over 7 days (Apple-managed) | 1% → 100% over 7 days (manual control) |

We pause anytime metrics degrade.

### Day-1 monitoring
- Sentry crash rate < 0.5%
- App Store / Play Store rating ≥ 4.5
- Customer support inbox monitored
- Social channels monitored
- AWS cost spike alarms

## Phase 7: Operating (post-launch)

### Release cadence
- **Hot-fixes**: any time, OTA via EAS Update (JS-only) or full release (native)
- **Minor releases**: every 2-4 weeks (new features, bug fixes)
- **Major releases**: every 3-6 months (Wave 2, Wave 3, etc.)

### Break-fix flow
```
1. Issue detected (Sentry alert / customer report / monitoring)
2. Triage: P0 (data loss / outage), P1 (significant UX), P2 (minor)
3. P0: hot-fix branch from prod tag, fix, EAS Update if JS, native build if native
4. P1: next minor release
5. P2: backlog
```

### Maintenance windows
- Scheduled maintenance: Sundays 03:00-04:00 PT (low usage)
- Posted to status page 48h in advance
- Most deploys are zero-downtime; maintenance only for major migrations

### Capacity planning
- Weekly review of CloudWatch metrics
- Auto-scaling configured (DynamoDB, Lambda concurrency)
- Cost anomaly detection
- Bedrock provisioned throughput when steady-state warrants

## Configuration management

### Per-env config

Each environment has a config file in `infra/cdk/lib/config/`:

```typescript
// infra/cdk/lib/config/dev-config.ts
export const devConfig: EnvConfig = {
  env: 'dev',
  domainName: 'whatsfresh.app',
  apiSubdomain: 'api-dev',
  webSubdomain: 'dev',
  bedrockModelHaiku: 'anthropic.claude-haiku-4-5-20251001-v1:0',
  bedrockModelSonnet: 'anthropic.claude-sonnet-4-6-20251101-v1:0',
  cognitoMfa: 'OPTIONAL',
  cognitoAdvancedSecurity: 'AUDIT',
  // ...
};
```

```typescript
// infra/cdk/lib/config/prod-config.ts
export const prodConfig: EnvConfig = {
  env: 'prod',
  domainName: 'whatsfresh.app',
  apiSubdomain: 'api',
  webSubdomain: '',  // apex
  bedrockModelHaiku: 'anthropic.claude-haiku-4-5-20251001-v1:0',
  bedrockModelSonnet: 'anthropic.claude-sonnet-4-6-20251101-v1:0',
  cognitoMfa: 'OPTIONAL',  // becomes REQUIRED post-launch when WebAuthn ready
  cognitoAdvancedSecurity: 'ENFORCED',
  // ...
};
```

Config drives stack synthesis. No "magic constants" in code.

### Feature flags

- **Backend**: AWS AppConfig — Lambda config without redeploy
- **Mobile**: PostHog feature flags — gradual rollout, A/B testing
- **Pattern**: ship features dark, then enable per cohort

## Promotion rules

How code/changes flow:
```
Worker laptop → dev-{worker} → PR → main → staging (auto)
                                                 ↓
                                              tag → prod (manual approval)
```

### Promotion gates

| From → To | Gate |
|---|---|
| Worker laptop → dev | None (worker self-deploys) |
| PR → main | CI green + 1 review |
| main → staging | Auto on merge |
| staging → tag | Pre-deploy smoke tests pass |
| tag → prod | Manual approval in GitHub Actions UI |
| prod → 100% | Phased rollout 1% → 100% over 7 days |

## Data flow between environments

**Production data NEVER flows backward**. Dev/staging/PR envs only see synthetic data.

If we ever need to debug a real prod issue:
- Use prod CloudWatch logs (sanitized — no PII)
- Reproduce locally with synthetic data matching the conditions
- Customer-permission-required for accessing their actual data (rare)

## Disaster recovery per environment

| Env | Backup | Recovery |
|---|---|---|
| Local / dev | None | Re-deploy CDK |
| Staging | None (transient) | Re-deploy + reseed |
| Prod | DynamoDB PITR + daily AWS Backup | Restore from PITR / snapshot |

PITR enabled on prod DynamoDB. Tested quarterly.

## Cost estimates per environment

| Env | Monthly |
|---|---|
| Per dev sandbox | $0-5 |
| Staging | $30-80 |
| Prod (1k users) | $50-100 |
| Prod (10k users) | $400-700 |
| Prod (100k users) | $3500-6000 |

Lambda + DynamoDB scale to zero or near-zero on dev.

## Local development data services

For workers without an AWS dev sandbox yet:

- **DynamoDB local**: optional, via `dynamodb-local` Docker image
- **S3-compatible**: optional, via MinIO Docker image
- **Auth**: stubbed for offline mode

But the **recommended path** is per-worker AWS sandbox (isolation + parity with prod).

## What "production-ready" means

Before we even consider promoting to public production:

- [ ] All MVP feature acceptance criteria met (per [16_MVP_CHECKLIST.md](16_MVP_CHECKLIST.md))
- [ ] All security gates passed (per [04_SECURITY.md](04_SECURITY.md))
- [ ] All CI checks green for 7+ consecutive days on staging
- [ ] Beta cohort feedback positive
- [ ] No P0 / P1 bugs open
- [ ] Cost projections reviewed
- [ ] Customer support ready
- [ ] Privacy policy + ToS reviewed
- [ ] Phased rollout plan approved
- [ ] Rollback plan documented and tested

Until all of these are checked, **we are not production-ready**.

## Cross-references

- Deployment pipelines → [19_CICD_PIPELINE.md](19_CICD_PIPELINE.md)
- Local dev setup → [14_LOCAL_DEV.md](14_LOCAL_DEV.md)
- MVP checklist → [16_MVP_CHECKLIST.md](16_MVP_CHECKLIST.md)
- Architecture → [01_ARCHITECTURE.md](01_ARCHITECTURE.md)
