# Local Development Setup — Zero AWS Required

Run the entire WhatsForLunch app locally on your machine without any AWS account. Perfect for development, testing, and demos.

## Requirements

- Docker Desktop (https://www.docker.com/products/docker-desktop)
- Node.js 20+ (for running mobile app)
- 15 minutes to first working app

## Quick Start (3 steps)

### 1. Start Local Services (2 min)

```bash
cd whatsforlunch

# Start DynamoDB Local + Mock GraphQL API
docker-compose -f docker-compose.local.yml up -d

# Wait for services to be healthy
docker-compose -f docker-compose.local.yml ps
# All containers should show "healthy"
```

### 2. Seed Test Data (1 min)

```bash
# Populate DynamoDB with test households, items, etc.
pnpm local:seed

# Verify in DynamoDB Admin UI
# Open: http://localhost:8001
# (You'll see tables like wfl-main-local)
```

### 3. Run Mobile App (2 min)

```bash
cd apps/mobile

# Start Expo dev server (connects to local API automatically)
pnpm dev

# Choose platform:
# - Press 'i' for iOS simulator
# - Press 'a' for Android emulator
# - Scan QR code for physical device
```

Your mobile app is now talking to your local DynamoDB without any AWS! 🎉

## What You Get Locally

| Component | Local Alternative | URL/Port |
|-----------|---|---|
| AppSync GraphQL API | graphql-yoga server | http://localhost:4000/graphql |
| DynamoDB | DynamoDB Local | http://localhost:8000 |
| Cognito Auth | JWT tokens (no email) | http://localhost:4000 (handles auth) |
| Database Browser | DynamoDB Admin UI | http://localhost:8001 |

## Development Workflow

### Making Changes

All local services auto-reload on file changes:

```bash
# 1. Mobile app changes
cd apps/mobile
# Just save and hot-reload happens automatically

# 2. Mock API changes
cd services/local-mock/src
# Changes auto-reload (docker-compose has volume mount)

# 3. Mock resolvers
vim services/local-mock/src/resolvers.ts
# Changes apply on save
```

### Testing Full Flow Locally

1. **Sign In** (no magic link email needed)
   - Tap "Sign In"
   - Enter any email
   - Get instant JWT token
   
2. **Create Household**
   - Tap "Create"
   - Enter name
   - Stored in local DynamoDB

3. **Add Item**
   - Tap "Add Item"
   - Fill details (or upload photo for AI classification)
   - Stored in local DynamoDB

4. **Browse Data**
   - Check DynamoDB Admin: http://localhost:8001
   - See all tables and items in real-time

## Common Tasks

### View Database

```bash
# Open browser
open http://localhost:8001

# Or query via AWS CLI (configured for local):
aws dynamodb scan \
  --table-name wfl-main-local \
  --endpoint-url http://localhost:8000 \
  --region us-east-1
```

### Reset Everything

```bash
# Stop services
docker-compose -f docker-compose.local.yml down

# Delete database volume
docker volume rm whatsforlunch_dynamodb-data

# Start fresh
docker-compose -f docker-compose.local.yml up -d
pnpm local:seed
```

### Validate Local Stack Works End-to-End

```bash
# Run comprehensive integration tests
# (Validates DynamoDB + GraphQL API are working correctly)
./run-local-tests.sh    # macOS/Linux
# or
run-local-tests.bat     # Windows PowerShell

# Expected output: ✅ All 23 tests pass
# Tests cover: auth, profiles, households, food items, AI, persistence, error handling
```

### Run Other Tests

```bash
# Unit tests
pnpm test

# E2E tests (Maestro)
pnpm test:e2e
# (Uses local mock API automatically via .env.local)

# Type checking
pnpm typecheck
```

### Debug Mock API

```bash
# Open GraphiQL explorer
open http://localhost:4000/graphql

# Or use curl
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"query":"{ getProfile { id email } }"}'
```

### View Logs

```bash
# All services
docker-compose -f docker-compose.local.yml logs -f

# Just the API
docker-compose -f docker-compose.local.yml logs -f mock-api

# Just DynamoDB
docker-compose -f docker-compose.local.yml logs -f dynamodb
```

## When to Use Each Setup

| Scenario | Use |
|----------|-----|
| Developing UI locally | **Local mode** (this guide) |
| Testing full integration before PR | **Local mode** |
| Testing auth flows | **Local mode** |
| Testing AI features | **AWS dev stack** (Bedrock + Textract) |
| Testing push notifications | **AWS dev stack** |
| Performance testing | **AWS dev stack** |
| QA/staging | **AWS staging stack** |
| Production | **AWS prod stack** |

## Switching Between Modes

### Local → AWS Dev Stack

```bash
# 1. Stop local services
docker-compose -f docker-compose.local.yml down

# 2. Deploy your dev stack
pnpm cdk:deploy --context env=dev-$(whoami)

# 3. Export config
pnpm cdk:outputs

# 4. Start mobile app (connects to AWS automatically)
cd apps/mobile && pnpm dev
```

### AWS Dev Stack → Local

```bash
# 1. Start local services
docker-compose -f docker-compose.local.yml up -d

# 2. Start mobile app (connects to local automatically)
cd apps/mobile && pnpm dev
```

## Troubleshooting

### "Connection refused" when starting app

```bash
# Check if services are running
docker-compose -f docker-compose.local.yml ps

# If not, start them
docker-compose -f docker-compose.local.yml up -d

# Wait 10s for services to be healthy
sleep 10
docker-compose -f docker-compose.local.yml ps
```

### "Cannot find module" in mock API

```bash
# Rebuild the container
docker-compose -f docker-compose.local.yml build --no-cache mock-api

# Restart
docker-compose -f docker-compose.local.yml up -d mock-api
```

### DynamoDB data not persisting

Data persists across restarts via the Docker volume `dynamodb-data`. To actually erase:

```bash
docker-compose -f docker-compose.local.yml down -v
docker-compose -f docker-compose.local.yml up -d
```

### iOS simulator can't reach localhost:4000

Use the special iOS simulator hostname:

```bash
# In apps/mobile/.env.local (should be auto-set)
EXPO_PUBLIC_APPSYNC_URL=http://localhost:4000/graphql
# ✅ Works fine via bridge network
```

### Android emulator can't reach localhost:4000

Android emulator uses a different IP:

```bash
# In apps/mobile/.env.local
EXPO_PUBLIC_APPSYNC_URL=http://10.0.2.2:4000/graphql
# 10.0.2.2 is Android's special IP for host machine
```

## Architecture

```
┌─────────────────────────────────────────────────┐
│         Your Machine (localhost)                 │
├─────────────────────────────────────────────────┤
│                                                   │
│  ┌──────────────┐  ┌──────────────────────────┐ │
│  │ Mobile App   │  │ DynamoDB Local + Admin   │ │
│  │ (Expo)       │◄─┤ (Port 8000, 8001)        │ │
│  └──────┬───────┘  └──────────────────────────┘ │
│         │                                        │
│         │          ┌──────────────────────────┐ │
│         └─────────►│ Mock GraphQL API         │ │
│                    │ (graphql-yoga, Port 4000)│ │
│                    │                          │ │
│                    │ - Auth (JWT)             │ │
│                    │ - Resolvers              │ │
│                    │ - Connects to DynamoDB   │ │
│                    └──────────────────────────┘ │
│                                                   │
└─────────────────────────────────────────────────┘
           
All running in Docker containers,
zero AWS connectivity needed.
```

## What's NOT Available Locally

- **Bedrock AI**: Uses mock responses (local-only)
- **Push Notifications**: SNS mock (not real notifications)
- **File Upload**: S3 mock (files stored locally)
- **Cognito Federation**: OAuth integrations disabled (use password/email)
- **Email Magic Links**: Auto-authentication instead
- **Real Metrics**: CloudWatch doesn't exist locally

For those features, use the AWS dev stack.

## Next Steps

1. **Verify app works locally** (this guide)
2. **Make code changes** (auto-reload in local mode)
3. **Run tests locally** (`pnpm test`)
4. **Push changes** (GitHub PR)
5. **CI deploys to AWS dev stack** (automated)
6. **Team QA on staging** (after merge to main)

---

**Everything works locally. No AWS credentials needed. No cloud costs. Perfect for development.**

Happy building! 🚀
