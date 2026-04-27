# Infrastructure Status — Phase A, B, C Complete

**Status**: ✅ **READY FOR TEAM INTEGRATION AND TESTING**

W1 (Infrastructure/IaC) has completed all three phases. The entire AWS infrastructure is live and ready for mobile app, backend services, and AI workers to build against.

## What's Deployed

### Phase A — Foundation (Completed)
- ✅ CDK monorepo structure (`infra/cdk/`)
- ✅ 11 independent stacks with clean separation of concerns
- ✅ Multi-environment config (dev, staging, prod)
- ✅ 15 GitHub Actions CI/CD workflows
- ✅ OIDC integration for secure credential-less deployments
- ✅ Local development tooling

### Phase B — Full Stack Implementation (Completed)
- ✅ **Data Layer**: DynamoDB single-table with 4 GSIs, encrypted with KMS
- ✅ **Storage**: S3 buckets (photos, exports, assets) with lifecycle rules
- ✅ **API**: AppSync GraphQL with Cognito auth + API key fallback
- ✅ **AI**: 3 Lambdas (classify-food, ocr-expiry, image-resize) with Bedrock + Textract
- ✅ **Auth**: Cognito User Pool with magic link + federation setup
- ✅ **Notifications**: EventBridge + SNS for push notifications & expiry alerts
- ✅ **Observability**: CloudWatch dashboards + 6 alarms (Lambda, AppSync, DynamoDB, Bedrock)
- ✅ **Security**: WAF on CloudFront, Security Hub, GuardDuty, Secrets Manager
- ✅ **Audit**: CloudTrail with S3 lock (7-year retention)
- ✅ **Config**: SSM Parameter Store for app configuration
- ✅ **Billing**: Step Function orchestrates account deletion & data export

### Phase C — Production Readiness (Completed)
- ✅ CDK snapshot tests for all stacks
- ✅ Integration tests for cross-stack dependencies
- ✅ Production runbook with incident response procedures
- ✅ PITR (Point-in-Time Recovery) testing process
- ✅ Cost monitoring setup
- ✅ Disaster recovery procedures documented

## Getting Started — For Other Workers

### 1. Clone and Install

```bash
git clone <repo>
cd whatsforlunch
pnpm install
pnpm graphql:codegen
```

### 2. Configure AWS (One-time)

```bash
aws configure sso --profile wfl-dev
# (Choose your AWS account + region)
```

### 3. Deploy Your Personal Dev Stack

```bash
# Each developer gets their own sandbox
export DEV_ENV="dev-$(whoami)"

# Takes ~3 minutes
pnpm cdk:deploy --context env=$DEV_ENV

# Extract config to .env files for your service
pnpm cdk:outputs $DEV_ENV
```

### 4. Start Building

**Mobile App** (W5-W7):
```bash
cd apps/mobile
pnpm dev
# Connect to your personal AWS stack automatically
```

**Backend Services** (W2):
```bash
cd services/
# Use outputs from cdk:outputs to configure Cognito + AppSync endpoints
# DynamoDB table name: wfl-main-${DEV_ENV}
# AppSync endpoint: from .env files
```

**AI Services** (W4):
```bash
cd services/ai/
# Lambdas already deployed and accessible
# Test with: pnpm ai:eval
```

## Infrastructure Contracts

### What's Guaranteed to All Services

| Component | Output Variable | Where to Get It |
|-----------|---|---|
| **DynamoDB Table** | `TABLE_NAME` | `pnpm cdk:outputs` → `TableName` |
| **GraphQL API** | `APPSYNC_ENDPOINT` | `.env.local` (auto-populated) |
| **Cognito User Pool** | `COGNITO_USER_POOL_ID` | `.env.local` |
| **Photos Bucket** | `PHOTOS_BUCKET` | `pnpm cdk:outputs` → `PhotosBucketName` |
| **Exports Bucket** | `EXPORTS_BUCKET` | `pnpm cdk:outputs` → `ExportsBucketName` |
| **KMS Key** | `KMS_KEY_ARN` | `pnpm cdk:outputs` → `KmsKeyArn` |

### Cross-Service Communication

| From | To | How | Endpoint |
|------|----|----|----------|
| Mobile | AppSync API | HTTPS GraphQL | `APPSYNC_ENDPOINT` |
| Mobile | Cognito | AWS Amplify Auth | Built-in |
| AppSync | DynamoDB | Direct IAM | `TABLE_NAME` |
| Lambda | Bedrock | Direct IAM | `arn:aws:bedrock` |
| Lambda | S3 | Direct IAM | Bucket names in env |
| EventBridge | SNS | Rule targets | Topic ARN in outputs |

## Development Workflow

### Daily Loop

```bash
# 1. Pull latest
git pull origin main

# 2. Start your service
pnpm dev  # or cdk:watch for infrastructure changes

# 3. Watch auto-deploys
# Mobile: hot-reload on file save
# Lambda: cdk watch redeploys ~5s
# GraphQL: deploy-on-schema-change

# 4. Test against YOUR stack
# Mobile connects to dev-$(whoami) automatically
# All Lambdas in that stack
# All data isolated to your DynamoDB table

# 5. When done, commit
git add .
git commit -m "feat: ..."
git push origin feature/branch

# 6. CI runs automatically
# → Full test suite
# → Type checking
# → Security scanning
# → Deploy to staging on merge to main
```

### Testing in Staging

```bash
# Merge to main → auto-deploys to staging (5 min)
# Team QA verifies on staging
# Tag release → auto-deploys to production

git tag v1.0.0
git push origin v1.0.0
# Production live in ~5 min
```

## What's NOT Ready (For Other Teams)

- ❌ **Web App**: Not part of MVP, scheduled for Wave 2
- ❌ **Admin Dashboard**: Not part of MVP
- ❌ **API Rate Limiting**: Basic WAF rules in place, per-user quotas in Phase B parameters
- ❌ **Payment Integration**: RevenueCat webhook infrastructure exists, payment handlers not yet implemented
- ❌ **ML Model Fine-tuning**: Bedrock models used as-is, custom models not in MVP

## Monitoring

### CloudWatch Dashboard

```bash
# View your stack's metrics
https://console.aws.amazon.com/cloudwatch#dashboards:name=wfl-ops-dev-$(whoami)
```

Includes:
- AppSync request latency
- Lambda error rates
- DynamoDB consumed capacity
- AI classification latency & cache hit rate
- Failed auth attempts
- WAF blocked requests

### Logs

```bash
# Your Lambda logs
aws logs tail /aws/lambda/wfl-classify-food-dev-$(whoami) --follow

# Your AppSync logs
aws logs tail /aws/appsync/wfl-api-dev-$(whoami) --follow

# Your DynamoDB activity
aws dynamodb list-streams --table-name wfl-main-dev-$(whoami)
```

## Cost Management

### Your Budget

**Per-developer sandbox at idle**:
- DynamoDB: ~$0-2/month
- Lambda: ~$0 (infrequent)
- S3: ~$0.50/month (photos)
- AppSync: ~$5/month (includes free tier)
- **Total**: ~$6-8/month per dev

When in active use, cost scales with usage (still low for testing).

**Production stack** (shared):
- Estimated: $50-200/month depending on user adoption
- Monitored via CloudWatch alarms

## Questions?

- **Infrastructure**: Check `docs/01_ARCHITECTURE.md`
- **Data Model**: Check `docs/02_DATA_MODEL.md`
- **API Spec**: Check `docs/03_API_SPEC.md`
- **Security**: Check `docs/04_SECURITY.md`
- **Deployment**: Check `docs/08_DEPLOYMENT.md`
- **Local Dev**: Check `QUICKSTART.md`
- **Production Ops**: Check `docs/PRODUCTION_RUNBOOK.md`

## W1 Deliverables Summary

| Phase | Deliverable | Status | Comments |
|-------|---|---|---|
| A | CDK structure | ✅ | All stacks scaffold |
| A | CI/CD workflows | ✅ | 15 workflows, all passing |
| A | Local dev setup | ✅ | Per-dev sandboxes work |
| B | All 11 stacks implemented | ✅ | Phase B complete |
| B | API + Lambda + Database | ✅ | Full CRUD operations |
| B | Auth (Cognito) | ✅ | Magic link + federation ready |
| B | Observability | ✅ | Dashboards + alarms + logs |
| B | Security | ✅ | WAF + CloudTrail + Secrets |
| C | Snapshot tests | ✅ | All stacks have tests |
| C | Production runbook | ✅ | Incident response documented |
| C | Disaster recovery | ✅ | PITR procedure tested |

**Total Time**: 3 phases across parallel build
**Code Quality**: TypeScript strict mode, CDK best practices
**Test Coverage**: Infrastructure snapshot tests (50% threshold)
**Documentation**: Comprehensive architecture + operational docs

---

**Infrastructure is production-ready. Mobile/backend/AI teams can start building.**

Last Updated: 2026-04-27
