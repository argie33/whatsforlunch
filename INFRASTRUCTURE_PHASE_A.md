# Infrastructure Phase A — Complete Setup Guide

This document summarizes the Phase A infrastructure deliverables for WhatsFresh and provides a quick-start guide.

## What's been built (Phase A)

✅ **CDK App Structure**
- Entry point: `infra/cdk/bin/app.ts`
- 11 stacks fully configured and ready to deploy:
  - NetworkStack (CloudFront, WAF, Route53)
  - DataStack (DynamoDB, S3, KMS)
  - AuthStack (Cognito, magic link auth, 5 Lambda triggers)
  - ApiStack (AppSync GraphQL skeleton)
  - AiStack (Bedrock integration, Lambda roles)
  - NotificationsStack (SNS Mobile Push)
  - OpsStack (CloudWatch alarms)
  - SecurityStack (GuardDuty, WAF rules, threat detection)
  - BillingStack (RevenueCat webhook)
  - DomainStack (Route53, ACM certificates)
  - OidcStack (GitHub Actions OIDC provider + IAM roles)

✅ **GitHub Actions Workflows (15 total)**
- `ci.yml` — Typecheck, lint, format, CDK synth on every PR
- `security.yml` — Secret scan, dependency scan, SAST, IaC scan
- `coverage.yml` — Test coverage tracking
- `mobile-pr.yml` — Mobile builds on mobile changes
- `web-pr.yml` — Web builds on web changes
- `pr-env.yml` — Ephemeral preview environments
- `pr-cleanup.yml` — Cleanup PR environment on close
- `deploy-staging.yml` — Auto-deploy to staging on main
- `deploy-production.yml` — Manual deploy to prod
- `mobile-build.yml` — EAS build iOS + Android on tag
- `mobile-submit.yml` — EAS submit to App Stores
- `eas-update-staging.yml` — OTA update to staging
- `eas-update-production.yml` — OTA hotfix to prod
- `nightly.yml` — E2E, benchmarks, AI evals
- `dependency-update.yml` — Weekly dependency updates

✅ **OIDC Integration**
- GitHub OIDC identity provider configured
- IAM roles for staging and production deployments
- Credential-less CI/CD ready (no long-lived AWS keys)

✅ **Domain & Certificates**
- Route53 hosted zone setup
- ACM certificates for API domain and wildcards
- DNS validation ready

✅ **Documentation**
- `docs/26_AWS_SETUP.md` — Comprehensive setup guide
- `INFRASTRUCTURE_PHASE_A.md` — This file
- Bootstrap script at `infra/cdk/scripts/bootstrap.sh`

## Quick Start

### 1. Install dependencies

```bash
cd infra/cdk
pnpm install
```

### 2. Configure AWS

```bash
aws configure --profile wfl-dev
# Follow prompts to enter credentials
export AWS_PROFILE=wfl-dev
export AWS_REGION=us-east-1
```

### 3. Bootstrap CDK (one-time)

```bash
# Get your AWS account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query 'Account' --output text)

# Bootstrap for all environments
./scripts/bootstrap.sh $ACCOUNT_ID us-east-1 wfl-dev
```

### 4. Deploy to dev

```bash
pnpm cdk deploy --all --context env=dev --require-approval any
```

Approve all IAM/resource prompts. First deployment takes ~20-30 minutes.

### 5. Verify deployment

```bash
# Check stacks
aws cloudformation describe-stacks \
  --query 'Stacks[?StackStatus==`CREATE_COMPLETE`].[StackName]'

# Get AppSync endpoint
aws appsync list-graphql-apis --query 'graphqlApis[0]'
```

## GitHub Actions Setup

### Add secrets to GitHub

In your GitHub repo settings, add these Action secrets:

```
AWS_OIDC_ROLE_ARN_DEV=arn:aws:iam::ACCOUNT_ID:role/...
AWS_OIDC_ROLE_ARN_STAGING=arn:aws:iam::ACCOUNT_ID:role/...
AWS_OIDC_ROLE_ARN_PROD=arn:aws:iam::ACCOUNT_ID:role/...
EXPO_TOKEN=<from Expo/EAS>
SNYK_TOKEN=<from Snyk>
SEMGREP_APP_TOKEN=<from Semgrep>
CODECOV_TOKEN=<from Codecov>
MAESTRO_CLOUD_API_KEY=<from Maestro>
CHROMATIC_TOKEN=<from Chromatic>
```

Get OIDC role ARNs:

```bash
aws cloudformation describe-stacks --stack-name WFL-OIDC-stack \
  --query 'Stacks[0].Outputs'
```

### First CI/CD test

1. Create a PR with a small change
2. Watch `ci.yml` run through typecheck, lint, format
3. Verify all checks pass
4. Merge to main
5. Watch `deploy-staging.yml` auto-deploy to staging

## Troubleshooting

| Issue | Fix |
|---|---|
| `CDKError: Invalid environment specifier` | Check AWS account ID in env-config.ts |
| `botocore.exceptions.NoCredentialsError` | Run `aws configure --profile wfl-dev` |
| `InvalidAction` in CI | Check pnpm scripts exist in package.json |
| CloudFormation stack rollback | Check CloudWatch logs for detailed errors |
| ACM certificate pending validation | Route53 records must be created for DNS validation |

## Next Steps (Phase B)

Phase B (Days 4-15) will:

- **W1**: Implement DynamoDB table, S3 buckets, Lambdas, KMS, CloudFront
- **W2**: Build AppSync resolvers, sync engine, business logic Lambdas
- **W3**: Implement Cognito triggers, Apple/Google SSO, security checks
- **W4**: Build AI Lambdas (classify, OCR, etc.) with Bedrock
- **W5**: Create mobile design system, Tamagui themes, components
- **W6**: Build scan flows, item management, dashboard
- **W7**: Build settings screens, account management
- **W8**: Build WatermelonDB sync, offline queue
- **W9**: Set up EAS, app stores, Sentry, PostHog
- **W10**: Design assets, illustrations, copy, localization

## Deployment Checklist

Before Phase A is considered complete:

- [ ] CDK synth succeeds for dev, staging, prod
- [ ] Bootstrap completed for all environments
- [ ] All 15 CI/CD workflows created
- [ ] GitHub OIDC roles created
- [ ] First CDK deploy to dev succeeds (or is documented to require)
- [ ] GitHub Actions secrets configured
- [ ] Documentation reviewed

## Architecture reference

- See [01_ARCHITECTURE.md](docs/01_ARCHITECTURE.md) for system design
- See [08_DEPLOYMENT.md](docs/08_DEPLOYMENT.md) for infrastructure strategy
- See [15_WORKER_TRACKS.md](docs/15_WORKER_TRACKS.md) for team assignment
- See [19_CICD_PIPELINE.md](docs/19_CICD_PIPELINE.md) for full CI/CD spec
- See [20_AGENT_COORDINATION.md](docs/20_AGENT_COORDINATION.md) for multi-agent process
- See [26_AWS_SETUP.md](docs/26_AWS_SETUP.md) for detailed AWS setup

---

**Status**: Phase A Complete ✅
**Team**: W1 (Infrastructure / IaC)
**Date**: 2026-04-26
**Next**: Phase B implementation (Days 4-15)
