# 🚀 Team Start Here — W1 Infrastructure Ready

**Status**: ✅ Infrastructure complete and validated
**Date**: 2026-04-27
**For**: W2-W10 teams ready to start development

---

## One-Minute Summary

W1 has delivered a complete local development infrastructure that allows all teams to start coding immediately without AWS credentials or costs.

**What you get**:
- ✅ Local development environment (DynamoDB + GraphQL API)
- ✅ 23 integration tests proving everything works
- ✅ Same code path as production
- ✅ Hot-reload on file changes
- ✅ $0 cost to start

**What you do**:
```bash
git pull origin main
pnpm install
pnpm local:setup
./run-local-tests.sh  # ← Should show 23/23 PASS ✅

# Then start your work (varies by team):
# W2: pnpm cdk:deploy --context env=dev-$(whoami)
# W5-7: pnpm dev:mobile
# W4: pnpm cdk:deploy --context env=dev-$(whoami)
```

**All teams work in parallel. Infrastructure is stable.**

---

## Quick Start (5 minutes)

### 1. Get Latest Code
```bash
git pull origin main
pnpm install
```

### 2. Start Local Infrastructure
```bash
pnpm local:setup
# Creates DynamoDB tables and starts services
```

### 3. Validate Everything Works
```bash
./run-local-tests.sh    # macOS/Linux
# or
run-local-tests.bat     # Windows
```

**Expected output**:
```
📊 Results: 23/23 passed, 0 failed
✅ All integration tests passed! Local stack is working correctly.
```

If you see this, **infrastructure is ready** and you can start building.

### 4. Start Your Work

Choose your path based on your team:

#### W2 (Backend/GraphQL)
```bash
# Deploy personal AWS sandbox
pnpm cdk:deploy --context env=dev-$(whoami)

# Then write resolvers
vim infra/cdk/lib/appsync/resolvers/item.ts
pnpm cdk:deploy --context env=dev-$(whoami)
```

#### W5-W7 (Mobile)
```bash
# Start building UI
cd apps/mobile
pnpm dev

# App connects to http://localhost:4000/graphql (local)
# Switch to AWS later when ready:
# pnpm cdk:deploy --context env=dev-$(whoami)
# pnpm cdk:outputs
# Edit .env.local with AWS endpoint
```

#### W4 (AI)
```bash
# Deploy AWS sandbox with real Bedrock
pnpm cdk:deploy --context env=dev-$(whoami)

# Test locally first (mock AI responses)
pnpm dev:mobile

# Then fine-tune prompts in AWS
```

#### W9 (Analytics)
```bash
# Set up CloudWatch dashboards
# W1 provides:
# - CloudWatch Logs (7-day retention)
# - CloudWatch Metrics (5-min granularity)
# - 6 alarms for critical paths
# - X-Ray distributed tracing ready
# - PostHog funnel tracking ready

# Just instrument your features:
# import { metrics } from '@wfl/observability'
# metrics.recordEvent('feature_used')
```

---

## What Each Team Gets

### W2 (Backend)
- ✅ DynamoDB table (wfl-main-dev) with 4 GSIs
- ✅ GraphQL schema fully defined
- ✅ Resolver examples in place
- ✅ 23 integration tests validate all operations

**Action**: Write remaining resolvers. Local stack ready to test against.

### W5-W7 (Mobile)
- ✅ GraphQL API at `http://localhost:4000/graphql`
- ✅ Full schema available for code generation
- ✅ JWT auth working (auto sign-in locally)
- ✅ Real data flow through DynamoDB

**Action**: Build UI screens. Hot-reload on save. Integration tests validate all API calls.

### W4 (AI)
- ✅ 3 Lambda functions scaffolded (classify-food, ocr-expiry, image-resize)
- ✅ Bedrock models configured (Haiku + Sonnet)
- ✅ Textract ready for OCR
- ✅ S3 bucket for photos (local or AWS)

**Action**: Fine-tune prompts. Local returns mock "apple"/"milk"/"bread". Real Bedrock in AWS.

### W3 (Auth)
- ✅ Cognito User Pool configured
- ✅ JWT + API key auth both working
- ✅ Magic link templates ready
- ✅ Social federation stubs in place

**Action**: Implement Apple/Google sign-in. Cognito already configured.

### W9 (Analytics)
- ✅ CloudWatch infrastructure ready
- ✅ 6 alarms for critical paths
- ✅ Dashboards template available
- ✅ X-Ray tracing ready
- ✅ Sentry crash monitoring ready
- ✅ PostHog analytics ready

**Action**: Add instrumentation. W1 provides the infrastructure.

### W10 (Marketing)
- ✅ Staging auto-deploys from main
- ✅ Production deploys from tags
- ✅ Both have monitoring + alarms
- ✅ Analytics data from W9

**Action**: Coordinate release timing with teams.

---

## Development Workflow

### Daily Loop
```bash
# 1. Get latest
git pull origin main

# 2. Start local services (one-time per session)
pnpm local:setup

# 3. Make code changes (auto hot-reload)
# ... edit files ...

# 4. Run tests (optional, CI runs on commit)
pnpm test
pnpm typecheck

# 5. Commit & push
git add .
git commit -m "feat: your feature"
git push origin feature/branch

# CI automatically runs:
# - Tests
# - Type checking
# - Lint
# - Security scan
```

### Before Creating PR
```bash
# Test against both modes
# Local (current setup)
./run-local-tests.sh  # Should pass

# AWS (optional, for integration testing)
pnpm cdk:deploy --context env=dev-$(whoami)
pnpm cdk:outputs
# Edit .env.local with AWS endpoint
# Restart app → test with real AWS
```

### After Merge to Main
```bash
# CI automatically deploys to staging
# Team QA tests on staging
# After 24h soak, tag release
git tag v1.0.0
git push origin v1.0.0
# CI auto-deploys to production
```

---

## Debugging

### GraphQL API Not Responding
```bash
# Check services are running
docker compose ps

# View API logs
pnpm local:api-logs
# or
docker compose logs mock-api

# Restart API
docker compose restart mock-api
```

### Tests Failing
```bash
# Check all services are healthy
docker compose ps
# All should show "healthy"

# View DynamoDB
open http://localhost:8001

# Manually test GraphQL
open http://localhost:4000/graphql

# Check integration test logs
pnpm local:test 2>&1 | tail -50
```

### DynamoDB Data Issues
```bash
# Full reset
pnpm local:reset

# Or just stop and restart
pnpm local:down
pnpm local:setup
pnpm local:seed
```

---

## AWS Integration (Optional)

When you want real AWS services:

### Deploy Personal Sandbox
```bash
# One-time: Deploy your own stack
pnpm cdk:deploy --context env=dev-$(whoami)
# Costs ~$6/month idle, $0.20-1/day with use

# Export configuration
pnpm cdk:outputs
# Writes credentials to .env.local

# App auto-connects to AWS
pnpm dev:mobile
```

### Switch Back to Local
```bash
# Edit .env.local to use localhost
EXPO_PUBLIC_APPSYNC_URL=http://localhost:4000/graphql
# or restore from .env.local.example

# Restart app
pnpm dev:mobile
```

---

## Documentation by Role

| Role | Start | Deep Dive |
|------|-------|-----------|
| **Mobile Developer** | This page → `LOCAL_SETUP.md` | `docs/01_ARCHITECTURE.md`, `docs/03_API_SPEC.md` |
| **Backend Developer** | This page → `docs/02_DATA_MODEL.md` | `infra/cdk/lib/appsync/schema.graphql` |
| **AI/ML Developer** | This page → W1 Delivery → `docs/01_ARCHITECTURE.md` | Lambda functions + Bedrock docs |
| **DevOps** | This page → `DEVELOPMENT_WORKFLOW.md` | `docs/PRODUCTION_RUNBOOK.md` |
| **QA** | This page → `docs/07_FEATURES.md` | E2E test suite docs |

---

## Key Files

### Infrastructure
- `docker-compose.local.yml` — Local services (DynamoDB + API)
- `infra/cdk/bin/app.ts` — CDK entry point (11 stacks)
- `infra/cdk/lib/appsync/schema.graphql` — GraphQL schema

### Testing
- `services/local-mock/src/integration-test.ts` — 23 end-to-end tests
- `run-local-tests.sh` / `run-local-tests.bat` — Test runners
- `INTEGRATION_TESTING.md` — Testing guide

### Documentation
- `LOCAL_SETUP.md` — Detailed local setup
- `QUICKSTART.md` — AWS dev stack setup
- `DEVELOPMENT_WORKFLOW.md` — Full workflow guide
- `docs/01_ARCHITECTURE.md` — System design

---

## Common Questions

**Q: Do I need AWS credentials to start?**
A: No. Start locally with `pnpm local:setup`. Credentials only needed if/when you want real AWS services.

**Q: Can I use local development if others use AWS?**
A: Yes. All use same code, different infrastructure (localhost vs AWS). Perfect for parallel development.

**Q: How long does first setup take?**
A: ~10-15 minutes total:
- Clone + pnpm install: ~5 min
- Docker images pull: ~3-5 min (first time only)
- Setup tables: ~1 min
- Tests: ~30 sec

**Q: What if tests fail?**
A: See `INTEGRATION_TESTING.md` troubleshooting section. Most failures are service not ready yet.

**Q: Can I reset everything?**
A: Yes, `pnpm local:reset` wipes data and rebuilds fresh. Safe to run anytime.

**Q: How do I deploy to production?**
A: See `DEVELOPMENT_WORKFLOW.md`. Tags auto-deploy. All infrastructure pre-configured.

---

## Support

**Infrastructure questions?** → `docs/01_ARCHITECTURE.md`
**Setup problems?** → `LOCAL_SETUP.md` troubleshooting
**API questions?** → `docs/03_API_SPEC.md`
**Data model?** → `docs/02_DATA_MODEL.md`
**Workflow?** → `DEVELOPMENT_WORKFLOW.md`
**Production?** → `docs/PRODUCTION_RUNBOOK.md`
**Tests failing?** → `INTEGRATION_TESTING.md`

---

## Success Criteria

You're ready to start building when:

1. ✅ `pnpm local:setup` completes without errors
2. ✅ `./run-local-tests.sh` shows **23/23 pass**
3. ✅ DynamoDB Admin UI shows tables at `http://localhost:8001`
4. ✅ GraphQL explorer responds at `http://localhost:4000/graphql`
5. ✅ You can sign in with any email in the app

**All checks pass?** → Infrastructure is ready. Start building. 🚀

---

## Next Steps

### Right Now (Today)
1. Clone repo
2. Run setup: `pnpm local:setup`
3. Run tests: `./run-local-tests.sh`
4. Confirm: **23/23 pass**

### This Week
1. Each team starts their work
2. All teams developing locally
3. Integration tests validate everything
4. No conflicts (stable infrastructure)

### Next Week
1. Teams merge changes to main
2. CI auto-deploys to staging
3. QA testing and soak period
4. Ready for production deployment

### Key Point
**You can start building today.** Infrastructure is complete, stable, and tested. All teams work in parallel against the same foundation.

---

**Questions?** → Check documentation above
**Problems?** → Check troubleshooting in respective guide
**Ready to start?** → `pnpm local:setup && ./run-local-tests.sh`

**Let's build.** 🚀

---

**W1 Infrastructure Team**
**Status**: Complete ✅ | Verified ✅ | Ready ✅
**Date**: 2026-04-27
