# Quick Start: Testing WhatsForLunch Locally

This guide gets you running and testing everything locally on your PC/Mac in 10 minutes.

## Prerequisites

- Node.js 20.18+ ([install via mise or nvm](https://mise.jdx.dev/))
- pnpm 9+ (`npm install -g pnpm@9`)
- Docker Desktop ([download](https://www.docker.com/products/docker-desktop))
- AWS CLI (`brew install awscli` or `choco install awscli`)

## Step 1: Start DynamoDB Local (2 minutes)

Open a terminal and run:

```bash
docker run -d --name dynamodb \
  -p 8000:8000 \
  amazon/dynamodb-local
```

Verify it's running:
```bash
curl http://localhost:8000
```

You should see an empty response (that's expected).

## Step 2: Set Up Local Database (2 minutes)

Create the table with all 4 Global Secondary Indexes:

```bash
cd whatsforlunch

# Make script executable (Mac/Linux)
chmod +x scripts/setup-local-db.sh

# Run setup
./scripts/setup-local-db.sh
```

On Windows:
```bash
# Run AWS CLI directly
set AWS_ACCESS_KEY_ID=test
set AWS_SECRET_ACCESS_KEY=test
set AWS_DEFAULT_REGION=us-west-2

aws dynamodb create-table ^
  --table-name WFL-Main-dev ^
  --attribute-definitions ^
    AttributeName=PK,AttributeType=S ^
    AttributeName=SK,AttributeType=S ^
    AttributeName=GSI1PK,AttributeType=S ^
    AttributeName=GSI1SK,AttributeType=S ^
  --key-schema AttributeName=PK,KeyType=HASH AttributeName=SK,KeyType=RANGE ^
  --global-secondary-indexes IndexName=GSI1,Keys=[{AttributeName=GSI1PK,KeyType=HASH},{AttributeName=GSI1SK,KeyType=RANGE}],Projection={ProjectionType=ALL},ProvisionedThroughput={ReadCapacityUnits=5,WriteCapacityUnits=5} ^
  --billing-mode PAY_PER_REQUEST ^
  --endpoint-url http://localhost:8000
```

## Step 3: Seed Test Data (1 minute)

```bash
# Install dependencies (one-time)
pnpm install

# Seed the database with test users, households, items
node scripts/seed-local-data.js
```

You should see:
```
Seeding data to WFL-Main-dev...
✓ Inserted Profile: user-123-abc
✓ Inserted Profile: user-456-def
✓ Inserted Household: household-123
...
```

## Step 4: View Data (Optional but Helpful)

Install DynamoDB Admin to browse the database in your browser:

```bash
npm install -g dynamodb-admin

# In another terminal
export DYNAMODB_ENDPOINT=http://localhost:8000
dynamodb-admin
```

Open http://localhost:8081 in your browser to see all tables and items.

## Step 5: Test Resolvers Locally (3 minutes)

### Option A: Unit Tests (Fast, Mocked DB)

```bash
pnpm test
```

This runs all Jest tests with mocked DynamoDB. You should see:
```
PASS  infra/cdk/lib/appsync/resolvers/__tests__/Query.me.test.js
PASS  infra/cdk/lib/appsync/resolvers/__tests__/Mutation.createItem.test.js
...
Tests: 40 passed, 40 total
```

### Option B: Integration Tests (Against Local DynamoDB)

```bash
pnpm test:integration --workspace=@wfl/services
```

This actually hits your local DynamoDB and tests read/write operations.

### Option C: Manual GraphQL Testing

Use Apollo Sandbox or Postman to test queries directly:

```bash
# Using curl
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query { me { id email displayName } }"
  }'
```

## Step 6: Run Mobile App Locally (2 minutes)

Test the app in an emulator:

```bash
cd apps/mobile

# Start Expo dev server
npx expo start

# Press 'i' for iOS simulator
# Press 'a' for Android emulator
# Press 'w' for web browser
```

The app should load and show a login screen.

**Important:** Configure the app to use local backend:

Create `apps/mobile/.env.local`:
```
EXPO_PUBLIC_API_URL=http://localhost:4000/graphql
EXPO_PUBLIC_WS_URL=ws://localhost:4000/graphql
```

Then restart the Expo server (press `r`).

## Step 7: Test Flows End-to-End

Once everything is running, test these user journeys:

### Journey 1: Create Household & Add Item
1. Open app
2. **Sign in** (use test user: alice@example.com)
3. **Create household** → "My Kitchen"
4. **Add item** → "Milk from Safeway"
5. See item in dashboard with expiry timer
6. Mark as **Eaten**
7. Verify status changed to gray

### Journey 2: Invite Member
1. In household settings
2. **Invite member** → Generate link
3. Share link to bob@example.com
4. Bob **accepts invite**
5. Verify Bob appears in member list

### Journey 3: Shopping List
1. **Add to shopping list** → "Greek yogurt"
2. See in shopping tab
3. Mark as **Purchased**
4. Check off list

### Journey 4: Container QR
1. Scan/enter QR token: `QR_ABC123_DEF456`
2. **Claim container** → "Fridge Top"
3. Add item to container
4. Transfer item between containers
5. **Archive container** when done

## Troubleshooting

### DynamoDB not responding
```bash
# Check if running
docker ps | grep dynamodb

# If not, start it
docker start dynamodb

# If still failing, remove and restart
docker rm dynamodb
docker run -d --name dynamodb -p 8000:8000 amazon/dynamodb-local
```

### Tests fail with connection refused
```bash
# Ensure DynamoDB Local is on port 8000
docker port dynamodb
# Should show: 8000/tcp -> 0.0.0.0:8000

# And resolvers are configured to use local endpoint:
# Look at utils.js - should have: endpoint: 'http://localhost:8000'
```

### Type generation fails
```bash
# Regenerate GraphQL types
pnpm run codegen --workspace=@wfl/mobile
```

### Expo app won't connect
1. Ensure `.env.local` in `apps/mobile` is set to `http://localhost:4000`
2. Clear app cache: press `Ctrl+C` in Expo, then `npx expo start --reset-cache`
3. Check firewall isn't blocking localhost:4000

## What You Can Test Locally ✅

- ✅ All 30 mutations (create, update, delete, state changes)
- ✅ All 16 queries (list, get, filter, search)
- ✅ Authorization (household membership checks)
- ✅ Optimistic concurrency (_version conflicts)
- ✅ Soft delete patterns
- ✅ GSI queries (expiring items, QR lookup, etc.)
- ✅ Mobile app UI in simulator
- ✅ End-to-end flows (create household → add items → invite members)

## What Needs AWS (Later)

- ❌ Real Cognito authentication (use test user mock for now)
- ❌ S3 photo uploads (can mock in tests)
- ❌ Lambda AI functions (stub out for now)
- ❌ Real-time subscriptions at scale
- ❌ CloudWatch logs/monitoring

## Next Steps

1. ✅ DynamoDB Local running?
2. ✅ Tables created with GSIs?
3. ✅ Test data seeded?
4. ✅ Unit tests passing?
5. ✅ Mobile app loading in simulator?
6. → Run end-to-end flows manually
7. → Once everything works locally, prepare for AWS deployment

## Commands Cheat Sheet

```bash
# Start everything
docker run -d --name dynamodb -p 8000:8000 amazon/dynamodb-local
./scripts/setup-local-db.sh
node scripts/seed-local-data.js
pnpm install
pnpm test

# View database
npm install -g dynamodb-admin
export DYNAMODB_ENDPOINT=http://localhost:8000
dynamodb-admin

# Run mobile app
cd apps/mobile && npx expo start

# Stop DynamoDB
docker stop dynamodb
docker rm dynamodb
```

---

**Need help?** Check logs:
- Resolver logs: `console.log()` appears in Jest output or `tail -f /tmp/lambda.log`
- DynamoDB logs: Use DynamoDB Admin UI
- Mobile logs: Press `Shift+M` in Expo to open Metro bundler logs

Once all local tests pass, we deploy to AWS. 🚀
