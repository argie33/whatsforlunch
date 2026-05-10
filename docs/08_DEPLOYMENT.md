# 08 — Deployment & Infrastructure as Code

Everything is code. Nothing is configured manually in dashboards. All deploys go through GitHub Actions.

## Tooling

| Concern | Tool |
|---|---|
| Cloud IaC | **AWS CDK (TypeScript)** |
| Mobile builds | **EAS Build** + **EAS Submit** + **EAS Update** |
| CI/CD | **GitHub Actions** with **OIDC** to AWS |
| Secrets in CI | GitHub Actions secrets |
| Secrets in app/Lambda | AWS Secrets Manager + SSM Parameter Store |
| Container registry | (none — pure serverless) |
| OTA updates | EAS Update for JS/RN; native binaries via app stores |

## AWS account strategy

**MVP**: Single AWS account with three environments tagged via CDK:
- `dev` (developer sandbox + ephemeral PR envs)
- `staging`
- `prod`

**Post-launch (Wave 6+)**: Migrate to AWS Organizations with separate accounts:
- `wfl-management` (org root)
- `wfl-dev` (development)
- `wfl-staging`
- `wfl-prod`
- `wfl-security` (audit logs, GuardDuty central)

Migration plan: deploy CDK to new accounts, replicate data, switch DNS, retire old account.

## Environments

| Env | URL | Cognito | Dynamo | Bedrock | Notes |
|---|---|---|---|---|---|
| **dev** | `api-dev.wfl.app` | `wfl-dev` | `WFL-Main-dev` | Haiku 4.5 | Ephemeral PR envs spawn here |
| **staging** | `api-staging.wfl.app` | `wfl-staging` | `WFL-Main-staging` | Haiku 4.5 | Pre-prod validation |
| **prod** | `api.wfl.app` | `wfl-prod` | `WFL-Main-prod` | Haiku 4.5 + Sonnet 4.6 | Real users |

Each env has its own Supabase-style isolation: separate Cognito pool, separate DynamoDB table, separate S3 buckets, separate KMS keys.

## CDK structure

```
infra/cdk/
├── bin/
│   └── app.ts                          # CDK app entry point
├── lib/
│   ├── stacks/
│   │   ├── network-stack.ts            # CloudFront, WAF, ACM cert, Route53
│   │   ├── auth-stack.ts               # Cognito + custom auth Lambdas
│   │   ├── data-stack.ts               # DynamoDB, KMS keys, S3 buckets
│   │   ├── api-stack.ts                # AppSync API + resolvers
│   │   ├── ai-stack.ts                 # AI Lambdas + Bedrock IAM + Textract
│   │   ├── notifications-stack.ts      # SNS Mobile Push platform apps
│   │   ├── ops-stack.ts                # CloudWatch alarms, SNS topics, dashboards
│   │   ├── security-stack.ts           # GuardDuty, Security Hub, IAM Access Analyzer
│   │   └── billing-stack.ts            # RevenueCat webhook handler
│   ├── constructs/
│   │   ├── lambda-fn.ts                # Custom NodejsFunction wrapper
│   │   ├── ddb-table.ts                # Standardized DynamoDB construct
│   │   └── waf-rules.ts                # Reusable WAF rule sets
│   ├── appsync/
│   │   ├── schema.graphql
│   │   └── resolvers/                  # JS resolver source files
│   └── config/
│       ├── env-config.ts               # Per-env settings
│       └── tags.ts                     # Standardized tagging
├── test/                               # CDK unit + snapshot tests
├── cdk.json
├── package.json
└── tsconfig.json
```

## CDK app entry point

```typescript
// infra/cdk/bin/app.ts
const app = new cdk.App();
const env = app.node.tryGetContext('env') ?? 'dev';
const config = loadEnvConfig(env);

const network = new NetworkStack(app, `WFL-Network-${env}`, { config });
const data = new DataStack(app, `WFL-Data-${env}`, { config });
const auth = new AuthStack(app, `WFL-Auth-${env}`, { config, dataStack: data });
const ai = new AiStack(app, `WFL-AI-${env}`, { config, dataStack: data });
const api = new ApiStack(app, `WFL-API-${env}`, { config, dataStack: data, authStack: auth, aiStack: ai });
new NotificationsStack(app, `WFL-Notif-${env}`, { config, dataStack: data });
new OpsStack(app, `WFL-Ops-${env}`, { config });
new SecurityStack(app, `WFL-Sec-${env}`, { config });
new BillingStack(app, `WFL-Bill-${env}`, { config, dataStack: data });
```

Deploy: `pnpm cdk deploy --all --context env=staging`

## GitHub Actions workflows

All workflows live in `.github/workflows/`.

### `ci.yml` — runs on every PR

```yaml
name: CI
on: [pull_request]
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm typecheck
      - run: pnpm lint
      - run: pnpm format:check
      - run: pnpm test:unit
      - run: pnpm graphql:validate
      - run: pnpm cdk synth --context env=dev
      - run: pnpm semgrep:ci
      - run: pnpm snyk:test  # warns, doesn't fail
```

### `deploy-staging.yml` — runs on merge to `main`

```yaml
name: Deploy Staging
on:
  push:
    branches: [main]
permissions:
  id-token: write
  contents: read
jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - uses: actions/checkout@v4
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_OIDC_ROLE_STAGING }}
          aws-region: us-east-1
      - run: pnpm install --frozen-lockfile
      - run: pnpm cdk deploy --all --context env=staging --require-approval never
      - run: pnpm test:integration:staging
      - run: pnpm test:smoke:staging
```

### `deploy-prod.yml` — manual approval

```yaml
name: Deploy Production
on:
  workflow_dispatch:
  push:
    tags: [v*]
permissions:
  id-token: write
  contents: read
jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production  # requires manual approval in GitHub UI
    steps:
      - uses: actions/checkout@v4
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_OIDC_ROLE_PROD }}
      - run: pnpm install --frozen-lockfile
      - run: pnpm cdk deploy --all --context env=prod --require-approval never
      - run: pnpm test:smoke:prod
```

### `mobile-build.yml` — runs on tag push

```yaml
name: Build Mobile
on:
  push:
    tags: [v*]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pnpm install --frozen-lockfile
      - run: npx eas-cli login --token ${{ secrets.EXPO_TOKEN }}
      - run: npx eas-cli build --platform ios --profile production --non-interactive
      - run: npx eas-cli build --platform android --profile production --non-interactive
      - run: npx eas-cli submit --platform ios --latest --non-interactive
      - run: npx eas-cli submit --platform android --latest --non-interactive
```

### `eas-update.yml` — runs on merge to main (OTA)

```yaml
name: EAS Update
on:
  push:
    branches: [main]
    paths: ['apps/mobile/**']
jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pnpm install --frozen-lockfile
      - run: npx eas-cli update --auto --branch staging
```

### `pr-env.yml` — ephemeral PR environments

```yaml
name: PR Environment
on:
  pull_request:
    types: [opened, synchronize, closed]
jobs:
  ephemeral:
    if: github.event.action != 'closed'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_OIDC_ROLE_DEV }}
      - run: pnpm cdk deploy --all --context env=pr-${{ github.event.number }}
      - run: gh pr comment ${{ github.event.number }} --body "Deployed to https://api-pr-${{ github.event.number }}.wfl.app"
  cleanup:
    if: github.event.action == 'closed'
    runs-on: ubuntu-latest
    steps:
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_OIDC_ROLE_DEV }}
      - run: pnpm cdk destroy --all --context env=pr-${{ github.event.number }} --force
```

## OIDC setup (one-time)

Configure GitHub OIDC provider in AWS:

```typescript
// In CDK bootstrap stack
new iam.OpenIdConnectProvider(this, 'GitHubOIDC', {
  url: 'https://token.actions.githubusercontent.com',
  clientIds: ['sts.amazonaws.com'],
});

const role = new iam.Role(this, 'GitHubActionsRole', {
  assumedBy: new iam.WebIdentityPrincipal(provider.openIdConnectProviderArn, {
    StringEquals: {
      'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com',
    },
    StringLike: {
      'token.actions.githubusercontent.com:sub': 'repo:wfl-org/whatsfresh:*',
    },
  }),
  managedPolicies: [
    iam.ManagedPolicy.fromAwsManagedPolicyName('AdministratorAccess'), // tighten post-MVP
  ],
});
```

No long-lived AWS access keys ever stored in GitHub.

## Required GitHub secrets

### Repo-level

- `EXPO_TOKEN` — for EAS Build / Submit / Update
- `APPLE_API_KEY_ID`, `APPLE_API_ISSUER_ID`, `APPLE_API_KEY` — App Store
- `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` — Play Store
- `SENTRY_AUTH_TOKEN` — source map uploads
- `POSTHOG_API_KEY`

### Environment secrets (per env: dev, staging, prod)

- `AWS_OIDC_ROLE_<ENV>` — ARN of GitHub Actions role
- `ANTHROPIC_BEDROCK_REGION` — typically us-east-1
- (Production-only) `REVENUECAT_WEBHOOK_SECRET`
- (Production-only) `GOOGLE_PLACES_API_KEY`

## Branch & release strategy

### Branches
- `main` — protected; always deployable to staging
- `release/*` — optional release branches for hotfixes
- Feature branches: `feature/<short-name>`, `fix/<issue>`, `chore/<task>`

### Branch protection on `main`
- Require PR with at least 1 approval
- Require all CI checks green
- Require up-to-date with main
- Linear history (squash merge only)
- Require signed commits (post-MVP)
- Restrict who can push (only org admins)

### Release flow
1. PR merged to `main` → auto-deploy to staging
2. Smoke tests run on staging
3. QA reviews staging build (TestFlight)
4. Tag `v1.2.3` → mobile build pipeline → submitted to TestFlight + Play Internal
5. Beta cohort reviews
6. Manual approval → promoted to App Store Connect / Play Console production
7. Phased rollout (Apple: 1%→100% over 7 days; Google: similar staged rollout)

## EAS configuration

`apps/mobile/eas.json`:

```json
{
  "cli": { "version": ">= 13.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "channel": "development"
    },
    "preview": {
      "distribution": "internal",
      "channel": "staging",
      "ios": { "simulator": true }
    },
    "production": {
      "channel": "production",
      "android": { "buildType": "app-bundle" },
      "ios": { "resourceClass": "m-medium" }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "...",
        "ascAppId": "...",
        "appleTeamId": "..."
      },
      "android": {
        "serviceAccountKeyPath": "./google-service-account.json",
        "track": "internal"
      }
    }
  },
  "update": {
    "production": { "channel": "production" },
    "staging": { "channel": "staging" }
  }
}
```

## Rollback procedures

| Failure | Rollback |
|---|---|
| Bad CDK deploy (Lambda regression) | `cdk deploy` previous version (single command, < 5 min) |
| Bad AppSync resolver | Re-deploy previous resolver version |
| Bad DynamoDB migration | Restore from PITR snapshot |
| Bad S3 lifecycle rule | CDK redeploy previous stack |
| Bad mobile JS release (no native changes) | EAS Update channel rollback (~2 min) |
| Bad mobile native release | Pull from Apple / Google; force EAS Update with hot-fix |
| Bad Bedrock prompt | Revert PROMPT_VERSION constant; redeploy Lambda |

All rollbacks documented in runbooks at `docs/runbooks/`.

## Domain & DNS

- Domain: `whatsfresh.app` (acquired via Route53 or external registrar)
- Subdomains:
  - `app.whatsfresh.app` → mobile Universal Link host
  - `api.whatsfresh.app` → AppSync via CloudFront
  - `realtime.whatsfresh.app` → AppSync WebSocket
  - `mcp.whatsfresh.app` → MCP server (Wave 6)
- ACM certs auto-renewed
- DNSSEC enabled (post-MVP)

## Monitoring of deployments

- CloudWatch dashboard per env
- Sentry release tracking (auto-tagged with git SHA)
- PostHog deploy markers
- Slack channel `#deploys` with bot postings
- Status page (Wave 3+): Instatus

## Cost monitoring

- AWS Budgets configured: $50, $100, $500, $1000 thresholds → email alerts
- Cost Explorer dashboard reviewed weekly
- Per-env tags on every resource for cost attribution
- Anomaly detection (> 20% above baseline) → alert

## Pre-launch checklist (production go-live)

See [16_MVP_CHECKLIST.md](16_MVP_CHECKLIST.md) for the full list. Key items:

- [ ] All CDK stacks deployed cleanly to prod
- [ ] DNS pointing to prod
- [ ] ACM certs valid
- [ ] AWS Budgets configured
- [ ] CloudWatch alarms wired to PagerDuty
- [ ] Privacy policy + ToS live
- [ ] App Store + Play Store listings ready
- [ ] TestFlight + Play Internal Testing tested by 100+ users
- [ ] Sentry releases tagged
- [ ] PostHog dashboards built
- [ ] Customer support email functional
- [ ] FAQ Notion page published
- [ ] Onboarding tested end-to-end on real devices
- [ ] Account deletion verified end-to-end
- [ ] Data export verified end-to-end

## Cross-references

- AWS architecture details → [01_ARCHITECTURE.md](01_ARCHITECTURE.md)
- Worker assignments → [15_WORKER_TRACKS.md](15_WORKER_TRACKS.md)
- Local dev setup → [14_LOCAL_DEV.md](14_LOCAL_DEV.md)
