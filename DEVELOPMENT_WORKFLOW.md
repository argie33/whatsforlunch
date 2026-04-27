# Development Workflow — Local → Staging → Production

Complete guide for building, testing, and deploying WhatsForLunch across all environments.

## The Three-Stage Development Path

```
┌─────────────────┐
│   LOCAL MODE    │  ← Start here (no AWS)
│ (Your PC, free) │
└────────┬────────┘
         │
         ├─ Docker: DynamoDB Local + Mock API
         ├─ No AWS credentials needed
         ├─ Hot-reload on file changes
         └─ Full integration testing
         
         │
         ▼
┌──────────────────┐
│  AWS DEV STACK   │  ← Test with real AWS
│ (dev-<username>) │
└────────┬─────────┘
         │
         ├─ Personal AWS sandbox (~$6/mo)
         ├─ Real Bedrock models
         ├─ Real S3, DynamoDB, Cognito
         ├─ Real push notifications
         └─ Full feature testing
         
         │
         ▼
┌──────────────────┐
│  AWS STAGING     │  ← Team QA
│ (staging)        │
└────────┬─────────┘
         │
         ├─ Auto-deploy on main merge
         ├─ All features enabled
         ├─ Team testing
         ├─ Production-like setup
         └─ Soak window (24h minimum)
         
         │
         ▼
┌──────────────────┐
│  AWS PRODUCTION  │  ← Customers
│ (prod)           │
└────────┬─────────┘
         │
         ├─ Manual tagged release
         ├─ Full monitoring + alarms
         ├─ Incident response ready
         └─ Users live
```

## Daily Workflow

### Morning: Fresh Start

```bash
# 1. Get latest code
git pull origin main

# 2. Start local stack (first time only)
docker-compose -f docker-compose.local.yml up -d

# 3. Seed fresh test data (optional)
pnpm local:seed

# 4. Start developing
cd apps/mobile && pnpm dev
```

Auto-reload watches all files. Any change → instant feedback.

### Development Loop

```bash
# 1. Make code changes
# (mobile UI, backend resolvers, AI models, etc.)

# 2. See changes live
# - Mobile app: hot reload in 1-2s
# - Mock API: reload on save
# - Resolvers: auto-update in Docker

# 3. Run tests locally
pnpm test
pnpm typecheck
pnpm lint

# 4. Commit changes
git add .
git commit -m "feat: your feature"
git push origin feature/branch

# 5. CI runs automatically
# (TypeScript, lint, tests, security scan)
```

### Testing with Real AWS

When ready to test with actual AWS services:

```bash
# 1. Deploy your personal dev stack (one-time)
pnpm cdk:deploy --context env=dev-$(whoami)

# 2. Export configuration
pnpm cdk:outputs

# 3. Switch to AWS mode (edit apps/mobile/.env.local)
# EXPO_PUBLIC_APPSYNC_URL=https://xxxxx.appsync-api.us-east-1.amazonaws.com/graphql
# EXPO_PUBLIC_COGNITO_USER_POOL_ID=us-east-1_xxxxx

# 4. Restart mobile app
# (it connects to your AWS stack instead of local)

# 5. Test with real services
# - Bedrock AI classification
# - Real S3 uploads
# - Cognito federation
# - Push notifications
```

Both local and AWS modes use the same code path. Switch by changing `.env.local`.

## Code Review & Merging

### Before Creating PR

```bash
# 1. Ensure everything passes locally
pnpm test
pnpm typecheck
pnpm lint

# 2. Test against BOTH modes
# Local mode: verify basic flow works
docker-compose -f docker-compose.local.yml up -d
pnpm dev:mobile
# (Test the feature)

# Switch to AWS mode
pnpm cdk:deploy --context env=dev-$(whoami)
pnpm cdk:outputs
# (Restart app, test again)

# 3. If changes are infrastructure
pnpm cdk:synth --context env=dev
# (Should succeed without errors)

# 4. Commit & push
git push origin feature/branch
```

### Code Review (in GitHub)

- CI automatically runs (never manual)
- PR reviews focus on logic, not build/lint (those are automated)
- At least 1 approval required before merge

### Merge to Main

```bash
# 1. Merge PR (GitHub UI or gh CLI)
gh pr merge 123 --squash

# 2. CI automatically
# - Runs full test suite ✓
# - Synthesizes infrastructure ✓
# - Security scan ✓
# - Type check ✓
# - Builds for staging ✓

# 3. Auto-deploys to staging AWS stack
# (You'll see notification when done)

# 4. Team can test on staging
# → Run E2E tests
# → Manual QA
# → Soak for 24h minimum
```

## Testing on Staging

```bash
# 1. Staging is auto-deployed from main
# Get the URL from GitHub Actions or:
aws cloudformation describe-stacks \
  --stack-name WFL-API-staging \
  --query "Stacks[0].Outputs[?OutputKey=='AppSyncApiUrl']"

# 2. Point mobile app to staging
# (Edit .env.local with staging AppSync URL)

# 3. Run full E2E tests
pnpm test:e2e --env=staging

# 4. Manual QA (checklist in GitHub issue)

# 5. Monitor metrics
# https://console.aws.amazon.com/cloudwatch#dashboards:name=wfl-ops-staging
```

## Release to Production

Only tagged releases deploy to production:

```bash
# 1. Verify staging is stable
# - All E2E tests passing ✓
# - 24h+ soak time ✓
# - No critical bugs ✓
# - Team approval ✓

# 2. Create release tag
git tag v1.2.3
git push origin v1.2.3

# 3. CI automatically
# - Builds & tests
# - Creates CloudFormation changeset
# - Deploys to production (no approval needed, tag is approval)

# 4. Monitor production
watch aws cloudformation describe-stacks \
  --stack-name WFL-API-prod \
  --query "Stacks[0].StackStatus"

# 5. Verify health
curl https://api.whatsforlunch.com/graphql?introspection=false

# 6. Monitor metrics for 30 min
# https://console.aws.amazon.com/cloudwatch#dashboards:name=wfl-ops-prod
```

## Debugging Issues

### On Local

```bash
# 1. Check mock API logs
docker-compose -f docker-compose.local.yml logs -f mock-api

# 2. Browse DynamoDB
# http://localhost:8001

# 3. Query GraphQL directly
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ __typename }"}'
```

### On AWS Dev Stack

```bash
# 1. Check Lambda logs
aws logs tail /aws/lambda/wfl-classify-food-dev-$(whoami) --follow

# 2. Query CloudWatch metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Errors \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 60 \
  --statistics Sum

# 3. Check Sentry for crashes
# https://sentry.io/whatsforlunch

# 4. Query DynamoDB
aws dynamodb scan \
  --table-name wfl-main-dev-$(whoami) \
  --limit 10 \
  --region us-east-1
```

### On Staging/Prod

```bash
# Use CloudWatch logs
aws logs tail /aws/lambda/wfl-classify-food-staging --follow

# View dashboard
# https://console.aws.amazon.com/cloudwatch#dashboards:name=wfl-ops-staging

# Check alarms
aws cloudwatch describe-alarms \
  --alarm-names "wfl-lambda-error-rate-staging"

# Query production DB (read-only)
aws dynamodb scan --table-name wfl-main-prod --limit 1
```

## Rollback Procedures

### If Staging Breaks

```bash
# 1. Revert the merge
git revert COMMIT_HASH
git push origin main

# 2. CI automatically redeploys staging
# (Back to previous known-good state)

# 3. Investigate in a new PR
# Fix and re-merge
```

### If Production Breaks

```bash
# 1. Immediate mitigation
# Scale down problematic Lambda
# Disable problematic feature flag
# Route traffic away via CloudFront

# 2. While investigating
# Deploy hotfix to new tag
git tag v1.2.4
git push origin v1.2.4
# (CI auto-deploys)

# 3. Post-incident
# Add regression test
# Document root cause
# Update runbook
```

## Environment Variables

All environments use same code, different `.env`:

| Mode | .env file | Setup |
|------|-----------|-------|
| **Local** | `.env.local` (auto-generated) | `docker-compose up` |
| **Dev Stack** | `.env.local` (from `cdk:outputs`) | `cdk:deploy` |
| **Staging** | Built into image | CI/CD |
| **Prod** | Built into image | CI/CD |

To switch environments, just change `.env.local` and restart the app.

## Monitoring & Alerts

### Development
- Local: Check console/logs in Docker
- AWS dev: CloudWatch (personal stack)

### Staging
- Team watches CloudWatch dashboard
- Alarms go to Slack #alerts

### Production
- OpsTeam watches 24/7
- PagerDuty escalation for critical
- Sentry for crash monitoring
- PostHog for user funnel analysis

## Summary

| Stage | When | Who | Cost | Tests |
|-------|------|-----|------|-------|
| **Local** | Every commit | Developer | $0 | Auto unit + E2E |
| **Dev AWS** | Optional, before PR | Developer | ~$6/mo | Manual feature test |
| **Staging** | Auto on main merge | Team | ~$50/mo shared | E2E + QA checklist |
| **Production** | Tagged release | DevOps | ~$200/mo shared | All passing + 24h soak |

---

**Start locally. Test with AWS. Deploy with confidence. Monitor always.**

This workflow ensures quality at every stage while keeping development fast and cheap.
