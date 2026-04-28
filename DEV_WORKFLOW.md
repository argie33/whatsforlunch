# Development Workflow — From Zero to Working App

Complete end-to-end workflow showing how to use all W1 infrastructure W1 has built.

---

## Day 1: Initial Setup (30 minutes)

### Step 1: Clone and Setup (5 min)

```bash
# macOS/Linux
chmod +x setup-dev.sh
./setup-dev.sh

# Windows
.\setup-dev.bat
```

**What happens**:
- ✅ Checks Node, pnpm, Docker
- ✅ Installs dependencies
- ✅ Starts Docker (DynamoDB + GraphQL API)
- ✅ Creates database tables
- ✅ Runs 23 integration tests
- ✅ Opens DynamoDB Admin UI + GraphQL explorer
- ✅ Shows next steps

**Expected output**: `✅ Setup Complete!`

### Step 2: Launch App (5 min)

```bash
cd apps/mobile
pnpm dev

# When prompted:
# i = iOS Simulator
# a = Android Emulator
# e = Expo Go (scan QR code)
```

### Step 3: Test the Flow (10 min)

1. **Sign in**: Type any email, tap "Sign In"
2. **Create Household**: Name it "Test Kitchen"
3. **Add Items**: Add "Milk", "Bread", "Eggs"
4. **See Data**: Open http://localhost:8001 (DynamoDB Admin)
5. **Mark Eaten**: Tap an item, mark as eaten
6. **Verify**: Data updated in DynamoDB

**Success**: App works end-to-end. Infrastructure validated. Ready to build.

---

## Daily Development Cycle

### Morning: Start Services

```bash
pnpm local:setup
# Starts DynamoDB + GraphQL API
# Takes ~30 seconds
```

### During Day: Make Changes

#### For Mobile Developer

```bash
# Terminal 1: Already running from Day 1
pnpm dev:mobile

# Terminal 2: Make changes
vim apps/mobile/src/screens/ProfileScreen.tsx

# Changes auto-reload
# Test in simulator/phone
```

#### For Backend Developer

```bash
# Terminal 1: Already running
pnpm local:setup

# Terminal 2: Update resolvers
vim services/local-mock/src/resolvers.ts

# Or deploy AWS stack
pnpm cdk:deploy --context env=dev-$(whoami)

# Terminal 3: Watch for changes
pnpm cdk:watch --context env=dev-$(whoami)
```

#### For AI Developer

```bash
# Terminal 1: Already running
pnpm local:setup

# Terminal 2: Test locally (mock AI)
pnpm dev:mobile
# Takes photo, gets mock response

# Deploy AWS (real Bedrock)
pnpm cdk:deploy --context env=dev-$(whoami)

# Terminal 3: Monitor cost
aws cloudwatch get-metric-statistics \
  --namespace AWS/Bedrock \
  --metric-name ... # See DEVELOPMENT_WORKFLOW.md
```

### Before Commit: Validate

```bash
# Run tests
pnpm test
pnpm typecheck
pnpm lint

# Run integration tests (backend)
pnpm local:test

# Expected: All passing
```

### After Commit: Push

```bash
git add .
git commit -m "feat: your feature"
git push origin feature/branch

# CI automatically runs:
# - Tests
# - Type checking
# - Lint
# - Security scan
```

---

## Feature Development Workflow

### Example: Add "Mark Partial" Status to Items

#### Step 1: Update GraphQL Schema

```bash
vim infra/cdk/lib/appsync/schema.graphql
```

Add mutation:
```graphql
type Mutation {
  # ... existing mutations ...
  markItemPartial(input: StatusInput!): Item!
}
```

#### Step 2: Add GraphQL Operation

```bash
vim apps/mobile/src/graphql/operations/items.graphql
```

Add:
```graphql
mutation MarkItemPartial($input: StatusInput!) {
  markItemPartial(input: $input) {
    id
    status
    updatedAt
    _version
  }
}
```

#### Step 3: Generate Types

```bash
pnpm graphql:codegen

# Creates/updates:
# - packages/shared/src/graphql/types.ts
# - apps/mobile/src/graphql/types.ts
```

#### Step 4: Implement in Mobile

```bash
vim apps/mobile/src/screens/ItemScreen.tsx
```

```typescript
import { MarkItemPartialMutation } from '@/graphql/types'
import { MARK_ITEM_PARTIAL } from '@/graphql/operations'

function ItemScreen() {
  const [markPartial] = useMutation<MarkItemPartialMutation>(
    MARK_ITEM_PARTIAL
  )

  return (
    <Button
      onPress={() => markPartial({
        variables: {
          input: { id, householdId, _version }
        }
      })}
      title="Mark Partial"
    />
  )
}
```

#### Step 5: Implement in Backend

```bash
vim services/local-mock/src/resolvers.ts
```

```typescript
export async function markItemPartial(
  user: LocalUser,
  input: StatusInput
) {
  const item = await get(`ITEM#${input.id}`, `HH#${input.householdId}`)
  if (!item) throw new Error('Item not found')
  
  const updated = {
    ...item,
    status: 'partial',
    updatedAt: new Date().toISOString(),
    _version: item._version + 1
  }
  
  await put(updated)
  return updated
}
```

#### Step 6: Test Locally

```bash
# App automatically hot-reloads
# 1. Tap "Add Item"
# 2. Tap "Mark Partial"
# 3. See status change in UI
# 4. Verify data in DynamoDB Admin (localhost:8001)
```

#### Step 7: Run Tests

```bash
pnpm test
pnpm typecheck
pnpm local:test
```

#### Step 8: Commit & Push

```bash
git add .
git commit -m "feat: add mark partial status for items"
git push origin feature/mark-partial

# CI runs tests + security scan
# Code review + merge
```

#### Step 9: Deploy

After merge to main:
```bash
# CI auto-deploys to staging
# Team QA tests
# After 24h, tag release
git tag v1.0.0
git push origin v1.0.0

# CI auto-deploys to production
```

---

## Testing at Each Stage

### Local Testing

```bash
# Unit tests
pnpm test

# Type checking
pnpm typecheck

# Integration tests
pnpm local:test

# What it validates:
# - Code is correct
# - Types match schema
# - API calls work
# - Data persists in DynamoDB
```

### AWS Dev Stack Testing (Optional)

```bash
# Deploy personal sandbox
pnpm cdk:deploy --context env=dev-$(whoami)
pnpm cdk:outputs

# Point app to AWS
# Edit .env.local with AWS endpoints

# Test with real AWS services
# - Real Bedrock models
# - Real S3 uploads
# - Real Cognito auth
# - Real push notifications

# Costs ~$6/month idle
```

### Staging Testing (After Merge)

```bash
# CI auto-deployed to staging
# Get staging endpoint from GitHub Actions or:
aws cloudformation describe-stacks \
  --stack-name WFL-API-staging \
  --query "Stacks[0].Outputs[?OutputKey=='AppSyncApiUrl']"

# Team QA tests
# E2E tests
# Soak for 24h

# Monitor dashboard
# https://console.aws.amazon.com/cloudwatch#dashboards:name=wfl-ops-staging
```

---

## Common Tasks

### View Local Data

```bash
# DynamoDB Admin UI
open http://localhost:8001

# Query via AWS SDK
aws dynamodb scan \
  --table-name wfl-main-dev \
  --endpoint-url http://localhost:8000 \
  --region us-east-1
```

### Test GraphQL Query Manually

```bash
# GraphQL Explorer
open http://localhost:4000/graphql

# Or curl
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"query":"{ getProfile { id email } }"}'
```

### Restart Services

```bash
# Stop
pnpm local:down

# Start fresh
pnpm local:setup
pnpm local:seed  # optional: add sample data
```

### Full Clean Reset

```bash
# Wipe everything
pnpm local:reset

# Recreates:
# - Docker containers
# - Database tables
# - Sample data
```

### Check Service Logs

```bash
# All services
pnpm local:logs

# Just GraphQL API
pnpm local:api-logs

# Or Docker directly
docker compose logs -f mock-api
```

---

## Debugging Checklist

### App won't sign in

**Check**:
```bash
# Is API responding?
curl http://localhost:4000/health

# Are services running?
docker compose ps

# View API logs
docker compose logs mock-api
```

**Fix**:
```bash
# Restart API
docker compose restart mock-api

# Or full reset
pnpm local:reset
```

### Data not saving

**Check**:
```bash
# Is DynamoDB responding?
curl http://localhost:8000/

# Browse DynamoDB Admin
open http://localhost:8001

# Check tables exist
aws dynamodb list-tables \
  --endpoint-url http://localhost:8000 \
  --region us-east-1
```

**Fix**:
```bash
# Recreate tables
pnpm local:migrate
```

### Types don't match queries

**Check**:
```bash
# Were types generated?
ls -la packages/shared/src/graphql/types.ts

# Is schema valid?
pnpm graphql:validate
```

**Fix**:
```bash
# Regenerate
pnpm graphql:codegen
```

### Performance is slow

**Check**:
```bash
# What's the bottleneck?
pnpm bench:local

# Are you querying too much data?
# Edit GraphQL operations to fetch only what you need
```

---

## Workflow Summary

```
Day 1 (30 min)
  Setup → Test → Success ✅

Daily (30 min/session)
  Start services → Code → Test locally → Commit

Before PR
  - Unit tests pass
  - Type checking passes
  - Integration tests pass
  - Test locally AND on AWS (if needed)

Code Review
  - CI validates everything
  - Team reviews logic
  - Merge when approved

Merge → Staging (Auto)
  - CI auto-deploys
  - Team QA + soak (24h)

Release → Production (Manual)
  - Tag release
  - CI auto-deploys
  - Monitor 30min
  - Users live
```

---

## Key Commands Reference

```bash
# Setup
./setup-dev.sh              # One-time: complete setup

# Services
pnpm local:setup            # Start Docker + create tables
pnpm local:down             # Stop all services
pnpm local:reset            # Wipe + restart fresh
pnpm local:logs             # View all logs

# Development
pnpm dev:mobile             # Start mobile app
pnpm dev:web                # Start web app
pnpm local:api              # Start mock GraphQL API

# GraphQL
pnpm graphql:codegen        # Generate types from schema
pnpm graphql:validate       # Validate schema

# Testing
pnpm test                   # Unit tests
pnpm typecheck              # TypeScript checks
pnpm lint                   # Linting
pnpm local:test             # Integration tests

# Data
pnpm local:seed             # Add sample data
pnpm local:migrate          # Create tables

# AWS
pnpm cdk:deploy             # Deploy personal stack
pnpm cdk:watch              # Auto-redeploy on changes
pnpm cdk:outputs            # Get stack outputs
```

---

## Success Metrics

You're doing it right when:

✅ Services start in <1 minute
✅ App launches in <30 seconds
✅ Changes hot-reload instantly
✅ All tests pass
✅ No TypeScript errors
✅ Data appears in DynamoDB
✅ Can sign in + create household + add items
✅ GraphQL mutations work
✅ Team reviews are fast (automated checks)
✅ Merges to staging work automatically
✅ Production deployments are one tag

---

## Next Steps

1. **Today**: Run `./setup-dev.sh`, launch app, create some test data
2. **Tomorrow**: Make a code change, commit, see CI validate
3. **This Week**: Merge first feature, see staging auto-deploy
4. **Next Week**: Tag release, deploy to production

**You're building in parallel with 9 other workers, all using same infrastructure, zero conflicts.**

Ready? Let's build. 🚀
