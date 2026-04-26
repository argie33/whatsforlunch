# Getting Started — Worker Onboarding

You are one of 10 parallel workers (W1–W10) building this product. Read this entire document, then your track's specific docs, then start.

## Step 1 — Identify your track

Each worker owns a track. Pick yours from this table:

| Track | Owner of |
|---|---|
| **W1** | Infrastructure / IaC: AWS CDK, GitHub Actions, environments |
| **W2** | Backend / Data: Lambdas, AppSync resolvers, DynamoDB |
| **W3** | Auth & Security: Cognito, IAM, security controls |
| **W4** | AI: Bedrock, Textract, prompts, evals |
| **W5** | Mobile Foundation: Expo, Tamagui, design system, primitives |
| **W6** | Mobile Core: Scan flows, items, dashboard, notifications |
| **W7** | Mobile Settings: Settings, profile, account, subscription UI |
| **W8** | Mobile Sync: WatermelonDB sync, offline queue |
| **W9** | Ops / QA: CI reliability, app stores, beta program |
| **W10** | Design / Polish: Illustrations, copy, web/marketing site |

If you're unsure, ask the project lead before starting.

## Step 2 — Read your "Reads first" docs

Open [`docs/15_WORKER_TRACKS.md`](docs/15_WORKER_TRACKS.md), find your track. The "Reads first" line tells you the must-read docs.

Always also read:
- [`docs/README.md`](docs/README.md) — master index
- [`docs/00_VISION.md`](docs/00_VISION.md) — what we're building
- [`docs/20_AGENT_COORDINATION.md`](docs/20_AGENT_COORDINATION.md) — how to collaborate
- [`docs/14_LOCAL_DEV.md`](docs/14_LOCAL_DEV.md) — local setup
- [`docs/09_TESTING.md`](docs/09_TESTING.md) — what tests to write

## Step 3 — Setup

### Pre-requisites
- Node.js 20.18+ (`mise install` or `nvm use` reads `.tool-versions` / `.nvmrc`)
- pnpm 9+ (`npm install -g pnpm@9`)
- Git
- Platform-specific tools per your track (W1: AWS CLI + CDK; W5–W8: Xcode / Android Studio; W10: design tools)

### First commands
```bash
git clone https://github.com/argie33/whatsforlunch.git
cd whatsforlunch
pnpm install
```

The repo is currently scaffolding-only. Your track will add the actual code per Phase A deliverables.

## Step 4 — Pick your first issue

Once GitHub issues are created (project lead does this from [`docs/07_FEATURES.md`](docs/07_FEATURES.md)):

1. Open Issues filtered by your track label
2. Pick the lowest-numbered unblocked issue
3. Self-assign
4. Create branch: `feat/W<n>-F-XXX-short-name` (e.g. `feat/W6-F-014-dashboard`)
5. Open a draft PR within 4 hours of starting
6. Comment your standup on `#daily-standup` GitHub Discussion

## Step 5 — Build per acceptance criteria

Each issue has acceptance criteria. Tick them as you complete. Your PR is mergeable when:

- All acceptance criteria checked
- All CI checks green
- Code owner approves
- Tests added (unit + E2E if user-facing)
- Docs updated if architecture changed

## Step 6 — Coordinate

- Schema changes (GraphQL, DynamoDB, Tamagui tokens) → coordinate via PR review with affected workers
- Cross-cutting features → lead worker opens "epic" issue linking sub-issues
- Blocked > 4 hours → tag unblocking worker, then project lead

## Phase rules

We build in three phases per wave:

**Phase A (foundation, days 1-3)**: scaffold, types, contracts. Most workers run in parallel; some block on others (W6/W7/W8 wait for W5).

**Phase B (features, days 4-15)**: parallel feature work. Aim for ~1 PR per worker per day.

**Phase C (integration, days 16-21)**: integration tests, polish, bug bashes.

## Hard rules

- ❌ Don't push to `main` directly (branch protection blocks)
- ❌ Don't bypass CI (no `--no-verify`, no skipping checks)
- ❌ Don't modify files outside your track's CODEOWNERS scope without coordination
- ❌ Don't commit secrets (gitleaks pre-commit blocks)
- ❌ Don't use mocks in production code (only in tests)
- ✅ Open small, frequent PRs
- ✅ Update docs when changing architecture
- ✅ Reference issue numbers in commits/PRs
- ✅ Ask in GitHub Discussions when unsure

## Definition of done (per feature)

A feature is done when:
1. Code merged to `main`
2. Acceptance criteria all checked
3. Unit tests added and passing
4. E2E test added (Maestro flow if user-facing)
5. Sentry + PostHog instrumented
6. Accessibility tested (VoiceOver + TalkBack if UI)
7. Dark mode verified (if UI)
8. Documented in feature catalog
9. Reviewed by another worker
10. Deployed to staging and smoke-tested

## Where things live

- **Design specification**: `docs/` (read-only — change via PR)
- **Mobile app**: `apps/mobile/`
- **Marketing site**: `apps/web/`
- **Shared types/schemas**: `packages/shared/`
- **AWS infra**: `infra/cdk/`
- **Lambdas**: `services/`
- **CI/CD**: `.github/workflows/`

## Questions?

- Architecture questions: read the docs first; if not covered, open a GitHub Discussion
- Stuck > 4 hours: tag the project lead in your issue
- Bug in docs: fix in the same PR as your code change
