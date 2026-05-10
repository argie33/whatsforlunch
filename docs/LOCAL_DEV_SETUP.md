# Local Development Setup

> **Priority:** Build and test everything locally on your PC/mobile BEFORE deploying to AWS.

This guide walks you through setting up WhatsFresh for local development with zero AWS dependencies.

## Quick Start (5 minutes)

```bash
# 1. Install local services (DynamoDB Local, LocalStack)
npm run local:setup

# 2. Start local services
npm run local:start

# 3. In another terminal, run the mobile app
cd apps/mobile
npm start

# 4. Open the app in your simulator/phone
# Everything works offline-first with sync to local DynamoDB
```

## Architecture: Local-First

Local development uses a three-tier approach:

```
┌─────────────────────────────────────────────────────┐
│         Mobile App (Expo, WatermelonDB)             │
│    Offline-first SQLite syncs to local backend      │
└────────────────────┬────────────────────────────────┘
                     │
         ┌───────────▼───────────┐
         │  Local Backend (Node) │
         │  - GraphQL resolvers  │
         │  - Auth (JWT mock)    │
         │  - AI (mock responses)│
         └───────────┬───────────┘
                     │
    ┌────────────────┼────────────────┐
    │                │                │
┌───▼──┐        ┌────▼──┐        ┌────▼──┐
│LocalDB│        │Auth   │        │Mocks  │
│DynamoDB│       │(JWT)  │        │(OCR,  │
│Local   │       │       │        │AI)    │
└───────┘        └───────┘        └───────┘
```

## Setup Instructions

### 1. Install Dependencies

```bash
# Root level
npm install

# Infrastructure (CDK, local tools)
cd infra/cdk
npm install
cd ../..

# Mobile
cd apps/mobile
npm install
cd ../..

# Services (AI lambdas, etc.)
cd services/ai
npm install
cd ../..
```

### 2. Start Local Services

#### Option A: Docker Compose (Recommended)

```bash
# Start all local services in Docker
docker-compose -f docker-compose.local.yml up -d

# Check logs
docker-compose -f docker-compose.local.yml logs -f

# Stop services
docker-compose -f docker-compose.local.yml down
```

#### Option B: Manual Setup

**DynamoDB Local** (required):
```bash
# Download and start DynamoDB Local
# macOS/Linux with Docker:
docker run -d \
  -p 8000:8000 \
  amazon/dynamodb-local \
  -jar DynamoDBLocal.jar \
  -sharedDb

# Or download from: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DynamoDBLocal.DownloadingAndRunning.html
```

**Test DynamoDB Local** is running:
```bash
curl http://localhost:8000/ 
# Should return: {"DynamoDBLocalVersion":"1.13.2"}
```

### 3. Create Local DynamoDB Tables

```bash
# Run migration script
npm run local:migrate

# This creates tables matching the schema:
# - wfl-main-dev (main table with 4 GSIs)
# - wfl-auth-challenges-dev (auth challenge storage)
```

See `scripts/local/dynamodb-setup.ts` for the schema.

### 4. Start Local Backend

```bash
cd services/api
npm run dev

# Server runs on http://localhost:4000
# GraphQL endpoint: http://localhost:4000/graphql
```

### 5. Start Mobile App

```bash
cd apps/mobile
npm start

# Press 'i' for iOS simulator
# Press 'a' for Android emulator
# Or scan QR code with Expo Go on your phone
```

## How Local Development Works

### Data Flow

1. **Mobile App → LocalDB (WatermelonDB)**
   - All writes go to offline SQLite database
   - Real-time local queries (instant)
   - Background sync service

2. **LocalDB → Sync Queue**
   - Changes tracked in sync queue
   - Batched every 30 seconds or on explicit sync
   - Conflict resolution with custom strategy

3. **Sync Queue → Local Backend**
   - GraphQL mutations sent to `http://localhost:4000/graphql`
   - DynamoDB Local receives writes
   - Auth handled via JWT (locally signed)

4. **Local Backend → Mobile (Subscriptions)**
   - GraphQL subscriptions via WebSocket
   - Real-time updates from other clients
   - Or pull-to-refresh for explicit sync

### Authentication (Local)

```typescript
// Instead of Cognito, local dev uses a simple JWT mock:

import { generateJWT } from './auth/local-jwt';

// Mock sign-in (no email verification needed)
const token = generateJWT({
  sub: 'user-123',
  email: 'dev@example.com',
  households: ['household-456'],
});

// Token is stored in AsyncStorage
// Sent as `Authorization: Bearer <token>` header
```

No Cognito setup needed. No AWS account required.

### AI Features (Mocked)

Bedrock and Textract calls are mocked locally:

```typescript
// OCR expiry date extraction
const mockOcrResponse = {
  detectedDate: '2025-12-31',
  confidence: 0.95,
  method: 'mock',
  cost: 0,
};

// Food classification
const mockClassification = {
  foodName: 'Cooked Chicken Breast',
  foodType: 'protein',
  category: 'protein',
  confidence: 0.98,
  suggestedExpiryDays: { fridge: 3, freezer: 30, pantry: null },
};
```

Real Bedrock/Textract calls can be tested in AWS dev environment later.

## Testing Locally

### Unit Tests

```bash
# All tests
npm run test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage
```

### Integration Tests (Local Backend)

```bash
# Start services first:
npm run local:start

# Run integration tests
npm run test:integration

# Tests use `http://localhost:4000/graphql`
```

### Mobile App Testing

```bash
# With Expo Go on your phone:
cd apps/mobile
npm start
# Scan QR code

# Or in simulator:
npm start
press 'i' (iOS) or 'a' (Android)

# Test flow:
# 1. Sign in with dev@example.com (mock auth)
# 2. Create household
# 3. Add item with photo
# 4. Mark as eaten
# 5. Check sync status
```

## Database Management

### View Local DynamoDB Data

```bash
# Using DynamoDB CLI (install aws-cli first)
aws dynamodb scan \
  --table-name wfl-main-dev \
  --endpoint-url http://localhost:8000 \
  --region us-east-1 \
  --output table

# Or use GUI:
npm install -g dynamodb-admin
dynamodb-admin

# Then open http://localhost:8001
```

### Reset Local Database

```bash
# Delete and recreate all tables
npm run local:reset

# Or delete specific table
aws dynamodb delete-table \
  --table-name wfl-main-dev \
  --endpoint-url http://localhost:8000 \
  --region us-east-1
```

### Seed Test Data

```bash
# Populate with sample households, items, users
npm run local:seed

# This creates:
# - User: user-123 (dev@example.com)
# - Household: household-456 (Demo Kitchen)
# - Items: 10 sample food items
```

## Environment Variables

Create `.env.local` in project root:

```bash
# Backend
GRAPHQL_ENDPOINT=http://localhost:4000/graphql
GRAPHQL_WS_ENDPOINT=ws://localhost:4000/graphql

# DynamoDB Local
AWS_ENDPOINT=http://localhost:8000
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test

# Auth (Local)
JWT_SECRET=local-dev-secret-not-secure
TOKEN_TTL=3600

# Disable AWS services
USE_LOCAL_DYNAMODB=true
USE_LOCAL_S3=true
USE_MOCK_AI=true
```

## Troubleshooting

### "Can't connect to localhost:8000"
- Check DynamoDB Local is running: `curl http://localhost:8000/`
- Make sure port 8000 is not blocked by firewall
- On Windows, DynamoDB Local requires Java 8+

### "Table not found" errors
- Run `npm run local:migrate` to create tables
- Check table names match your `.env.local`

### Sync not working on mobile
- Check backend is running: `curl http://localhost:4000/graphql`
- Check mobile has network access to backend
  - On simulator: `http://localhost:4000` works
  - On physical device: Use `http://<your-ip>:4000` (find with `ipconfig`)
- Check WatermelonDB sync logs: `adb logcat | grep WatermelonDB`

### "EADDRINUSE" port already in use
```bash
# Find process using port
lsof -i :4000
# Kill it
kill -9 <PID>

# Or use different port
PORT=4001 npm run dev
```

### JWT errors in local auth
- Clear app data and try again: `npm run mobile:reset-cache`
- Check `JWT_SECRET` in `.env.local` matches what signed the token
- Tokens expire after 1 hour; sign in again

## Switching to AWS

Once you're ready to test on AWS:

1. **Update environment variables**
   ```bash
   # In `.env.production` or CI/CD pipeline
   AWS_ACCOUNT_ID=<your-account>
   AWS_REGION=us-east-1
   USE_LOCAL_DYNAMODB=false
   ```

2. **Deploy infrastructure**
   ```bash
   cd infra/cdk
   npm run cdk:deploy -- --env dev
   ```

3. **Update GraphQL endpoint** in mobile app
   ```typescript
   const GRAPHQL_ENDPOINT = 'https://api-dev.wfl.app/graphql';
   ```

4. **Set up auth in AWS Cognito**
   - Follow docs/SOCIAL_SIGNIN_SETUP.md

5. **Test with real Bedrock/Textract**
   - These are called from Lambda, not mobile app
   - Lambda execution role must have Bedrock/Textract permissions

## Performance Notes

**Local testing is fast:**
- DynamoDB Local: <5ms queries
- No network latency
- Mobile app fully offline-capable
- Background sync every 30s or on demand

**Expected realistic performance:**
- Item list load: <100ms
- Add item with photo: <500ms (includes ML inference)
- Sync to backend: <200ms per batch

## Next Steps

1. ✅ Set up local services
2. ✅ Run mobile app locally
3. ✅ Create a household and add items
4. ✅ Test offline sync
5. ⏭️ When ready, deploy to AWS dev environment
6. ⏭️ Test with real Cognito, Bedrock, Textract
7. ⏭️ Run integration tests against AWS
8. ⏭️ Deploy to staging, then production

## Questions?

- Check `LOCAL_DEV_SETUP_FAQ.md` for common issues
- Review `docker-compose.local.yml` for service configurations
- See `scripts/local/` for migration and seed scripts
