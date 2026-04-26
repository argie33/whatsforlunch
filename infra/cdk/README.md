# @wfl/infra

AWS CDK (TypeScript) for all cloud infrastructure.

**Owner**: W1 (Infrastructure / IaC)

## Where to start

1. Read [`docs/01_ARCHITECTURE.md`](../../docs/01_ARCHITECTURE.md) — the architecture this implements
2. Read [`docs/08_DEPLOYMENT.md`](../../docs/08_DEPLOYMENT.md) — CDK structure and CI/CD
3. Read [`docs/19_CICD_PIPELINE.md`](../../docs/19_CICD_PIPELINE.md) — full pipeline specs
4. Read [`docs/21_RBAC_AND_SECRETS.md`](../../docs/21_RBAC_AND_SECRETS.md) — IAM model
5. Read [`docs/25_ENVIRONMENTS.md`](../../docs/25_ENVIRONMENTS.md) — env lifecycle

## Build (Phase A deliverables)

Per [`docs/15_WORKER_TRACKS.md`](../../docs/15_WORKER_TRACKS.md) W1:

- CDK app structure
- Stacks: `NetworkStack`, `DataStack`, `AuthStack`, `ApiStack`, `AiStack`, `NotificationsStack`, `OpsStack`, `SecurityStack`, `BillingStack`, `WebStack`
- Per-env config (`dev`, `staging`, `prod`)
- All 15 GitHub Actions workflows per [`docs/19_CICD_PIPELINE.md`](../../docs/19_CICD_PIPELINE.md)
- OIDC provider + GitHub Actions IAM role
- Domain registration + ACM certs
- Bootstrap CDK in dev account
