# 14 — Local Development

Every worker should be productive within an hour of setup. This doc gets them there.

## Prerequisites

- **macOS** (preferred for iOS dev) or Linux/Windows (Android only)
- **Node.js 20+** (use `mise` or `nvm`)
- **pnpm 9+** (`npm install -g pnpm`)
- **Git**
- **AWS CLI v2** with named profile `wfl-dev`
- **AWS CDK CLI** (`npm install -g aws-cdk`)
- **Expo CLI** (`npx expo` works without global install)
- **EAS CLI** (`npm install -g eas-cli`)
- **Xcode** (for iOS, macOS only)
- **Android Studio** (for Android)
- **Maestro** (`curl -Ls https://get.maestro.mobile.dev | bash`)
- **Docker Desktop** (for ephemeral Postgres if needed locally; not used in MVP)

Optional but recommended:
- **VS Code** with extensions: ESLint, Prettier, GraphQL, Tamagui
- **GitHub CLI** (`gh`)
- **direnv** for `.envrc` auto-loading

## First-time setup

```bash
# Clone
gh repo clone wfl-org/whatsfresh
cd whatsfresh

# Install all workspaces
pnpm install

# Generate GraphQL types
pnpm graphql:codegen

# Configure AWS profile
aws configure sso --profile wfl-dev
# (or use IAM Identity Center / AWS SSO)

# Bootstrap CDK in your AWS account (one-time)
pnpm --filter @wfl/infra cdk bootstrap

# Deploy your personal dev stack
pnpm --filter @wfl/infra cdk deploy --all --context env=dev-$(whoami)

# Get outputs (Cognito IDs, AppSync URL, etc.)
pnpm --filter @wfl/infra cdk:outputs
```

This produces a `.env.local` file in `apps/mobile/` with the env-specific Cognito + AppSync IDs.

## Running the mobile app locally

```bash
# Build a development client (one-time per device)
cd apps/mobile
npx eas build --profile development --platform ios     # or android
# Install the resulting build on your device / simulator

# Start dev server
pnpm dev

# Open on iOS simulator
press i

# Open on physical device
scan the QR code with the dev client
```

The dev client points at YOUR personal CDK-deployed AWS stack (`dev-<yourname>`).

### Why per-developer AWS sandbox?

- LocalStack free tier doesn't cover AppSync, Cognito custom auth, or Bedrock
- LocalStack Pro is $35/dev/mo with emulation drift bugs
- Per-developer AWS sandbox costs ~$0–5/mo at idle
- Same code path as staging/prod (no emulation drift)

## Working with Lambdas

```bash
# Run a Lambda locally with sample event
pnpm --filter @wfl/services exec sam local invoke ClassifyFood -e events/sample.json

# Watch + auto-redeploy on save
pnpm --filter @wfl/infra cdk watch
```

`cdk watch` redeploys changed Lambdas in ~5s.

## Working with the GraphQL schema

```bash
# Edit schema
$EDITOR infra/cdk/lib/appsync/schema.graphql

# Regenerate types
pnpm graphql:codegen

# Validate
pnpm graphql:validate

# Deploy
pnpm --filter @wfl/infra cdk deploy --all --context env=dev-$(whoami)
```

The generated types are committed to git so other workers see them.

## Working on the data model

```bash
# Edit DynamoDB schema in CDK
$EDITOR infra/cdk/lib/stacks/data-stack.ts

# Edit WatermelonDB schema
$EDITOR apps/mobile/src/db/schema.ts

# Add migration if breaking change
$EDITOR apps/mobile/src/db/migrations/00X_*.ts
```

WatermelonDB migrations are versioned and never edited after release.

## Working on AI

```bash
cd services/ai/classify-food

# Run the eval suite locally
pnpm ai:eval

# Test with sample image
pnpm exec ts-node -e "import { handler } from './handler'; ..."

# Bump prompt version
$EDITOR prompts.ts  # change PROMPT_VERSION

# Redeploy Lambda
pnpm --filter @wfl/infra cdk deploy WFL-AI-dev-$(whoami)
```

## Running tests

```bash
# All tests
pnpm test

# Unit only
pnpm test:unit

# Specific package
pnpm --filter @wfl/services test

# Watch mode
pnpm test:watch

# E2E (Maestro)
pnpm test:e2e

# AI eval
pnpm ai:eval

# Type check
pnpm typecheck

# Lint
pnpm lint

# Format
pnpm format
```

## Common workflows

### Adding a new feature

1. Pick a feature from [07_FEATURES.md](07_FEATURES.md)
2. Branch: `git checkout -b feature/my-feature`
3. If it requires schema changes, update GraphQL schema + CDK + WatermelonDB schema together
4. Add unit tests (co-located)
5. Add E2E test if user-facing flow
6. Update [07_FEATURES.md](07_FEATURES.md) acceptance criteria
7. Open PR; CI runs full suite
8. Code review
9. Merge to main → auto-deploy to staging
10. QA verifies on staging
11. Tag release → deployed to prod

### Debugging a production issue

1. Check Sentry for crashes/errors with same correlation ID
2. Check CloudWatch logs for that correlation ID
3. Check PostHog for user's funnel state
4. Reproduce locally with same inputs
5. Fix
6. Add regression test
7. Merge + deploy

### Working without internet

Most workflows require connectivity (CDK deploys, GraphQL codegen, Bedrock calls). Pure mobile UI work can be done offline:

```bash
cd apps/mobile
pnpm dev
# Use against last cached dev stack data
```

WatermelonDB has cached entities locally so the UI renders without network.

## Test accounts

Each environment has pre-seeded test accounts:

- `test+free@whatsfresh.app` — free tier, single household
- `test+premium@whatsfresh.app` — premium tier, multiple households
- `test+family@whatsfresh.app` — family tier
- `test+a11y@whatsfresh.app` — for VoiceOver / TalkBack testing

Magic link goes to a real inbox managed by the team (Gmail group).

## Sample data

Run `pnpm seed:dev` to populate your dev environment with:
- 5 households (your user as owner)
- 50 containers across them
- 200 items with various statuses, foods, photos
- Sample recipes
- Sample shopping list

## Troubleshooting

| Issue | Fix |
|---|---|
| "AppSync URL undefined" | Re-run `pnpm cdk:outputs` |
| "Cognito 401" | Tokens expired; sign out + back in |
| Maestro can't find app | `flutter doctor`-equivalent: `maestro doctor` |
| iOS simulator camera doesn't work | Use real device for camera flows |
| Bedrock 403 | Request model access in AWS console (one-time per account) |
| EAS Build fails | Check `eas.json` profile, validate Apple/Google credentials |
| Hermes crash on Android | Run `pnpm --filter @wfl/mobile clean && pnpm dev` |

## Productivity tips

- **`pnpm cdk watch`** — auto-deploys Lambdas on save (~5s)
- **`pnpm dev` with hot reload** — RN reloads on save
- **Storybook for components** — `pnpm storybook:mobile` for component dev in isolation
- **GraphiQL** — query AppSync directly via AWS Console for debugging
- **AWS X-Ray service map** — see distributed traces

## Repository tour

Once cloned, here's the layout:

```
whatsfresh/
├── apps/
│   └── mobile/                     # React Native app
├── packages/
│   └── shared/                     # Shared Zod, expiry logic, types
├── infra/
│   └── cdk/                        # AWS infrastructure
├── services/
│   ├── ai/                         # AI Lambdas
│   ├── auth/                       # Cognito triggers
│   ├── notifications/              # Push notification Lambdas
│   ├── account/                    # Delete + export
│   ├── billing/                    # RevenueCat webhook
│   └── images/                     # Image resize
├── docs/                           # This folder
├── .github/workflows/              # CI/CD
└── scripts/                        # One-off scripts (seed, migrate, etc.)
```

## When to update docs

Always:
- Architecture decisions → [01_ARCHITECTURE.md](01_ARCHITECTURE.md) + ADR file
- New feature → [07_FEATURES.md](07_FEATURES.md)
- New API operation → [03_API_SPEC.md](03_API_SPEC.md)
- New data attribute → [02_DATA_MODEL.md](02_DATA_MODEL.md)
- New security control → [04_SECURITY.md](04_SECURITY.md)

If you find docs are wrong or missing details, fix them in the same PR as the code change.

## Cross-references

- Worker assignments → [15_WORKER_TRACKS.md](15_WORKER_TRACKS.md)
- Deployment → [08_DEPLOYMENT.md](08_DEPLOYMENT.md)
- Testing → [09_TESTING.md](09_TESTING.md)
