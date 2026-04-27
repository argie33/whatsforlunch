# QuickStart — Local Development

Get the full WhatsForLunch app running on your machine in ~15 minutes.

## Architecture

The local development setup uses **per-developer AWS sandboxes** rather than local emulation:
- **Why**: LocalStack Pro ($35/mo) has drift bugs. Per-dev sandbox costs ~$0-5/mo idle.
- **What you get**: Same code path as staging/prod (zero emulation drift)
- **How it works**: CDK deploys your own stack to AWS (e.g., `dev-alice`, `dev-bob`)

## Prerequisites

```bash
# Node.js 20+
node --version

# pnpm 9+
npm install -g pnpm@9

# AWS CLI + credentials
aws --version
aws configure sso --profile wfl-dev
```

## Step 1: Install dependencies (2 min)

```bash
cd ~/code/whatsforlunch
pnpm install
```

## Step 2: Deploy your personal dev stack (10 min)

```bash
cd infra/cdk

# Set your dev environment name (use your username)
export ENV_NAME="dev-$(whoami)"

# Synthesize the CDK stack (no AWS credentials needed for this)
pnpm cdk:synth --context env=$ENV_NAME

# Deploy to AWS (first time takes ~3-5 min)
pnpm cdk:deploy --context env=$ENV_NAME --require-approval never
```

> ✅ Your personal stack is now live on AWS! Costs ~$0-5/month at idle.

## Step 3: Extract configuration for mobile app (1 min)

```bash
# This reads CloudFormation outputs and writes to apps/mobile/.env.local
pnpm cdk:outputs $ENV_NAME
```

## Step 4: Start the mobile app (2 min)

```bash
cd apps/mobile

# Start the dev server
pnpm dev

# Choose platform:
# - Type 'i' for iOS simulator
# - Type 'a' for Android emulator
# - Scan QR code with Expo dev client on physical device
```

The mobile app now connects to YOUR personal AWS stack and you can test the full flow:
- Sign in with magic link
- Create a household
- Add items with photos
- See AI classification in action
- Test expiration tracking

## Step 5: Make changes & redeploy (auto on save)

### Mobile app changes:
```bash
cd apps/mobile
pnpm dev
# Hot reload on file save
```

### Backend/Lambda changes:
```bash
cd infra/cdk
pnpm cdk:watch --context env=$ENV_NAME
# Auto-redeploys changed Lambdas (~5s)
```

### Schema changes:
```bash
# Edit the GraphQL schema
$EDITOR infra/cdk/lib/appsync/schema.graphql

# Regenerate types
pnpm graphql:codegen

# Deploy
pnpm cdk:deploy --context env=$ENV_NAME
```

## Common workflows

### Debugging a feature
1. Make code changes locally
2. `cdk:watch` auto-redeploys your stack
3. Mobile app hot-reloads on file save
4. Check logs in AWS CloudWatch

### Inspecting database
```bash
# Query your DynamoDB table directly
aws dynamodb scan --table-name wfl-main-dev-$(whoami) \
  --region us-east-1 | jq '.Items | length'
```

### Checking API responses
```bash
# Query AppSync directly (get endpoint from .env.local)
curl -X POST \
  -H "Authorization: $COGNITO_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query":"{ getProfile { id name } }"}' \
  https://<API_ID>.appsync-api.us-east-1.amazonaws.com/graphql
```

### Seeding test data
```bash
pnpm seed:dev
# Populates your stack with 5 households, 50 containers, 200 items
```

## Cleanup (when done)

```bash
# Destroy your personal stack (saves $ on unused infrastructure)
pnpm cdk:destroy --context env=$ENV_NAME

# This is safe to run anytime; stacks recreate in ~3 min
```

## Troubleshooting

| Issue | Fix |
|---|---|
| "AppSync URL undefined in .env.local" | Rerun: `pnpm cdk:outputs $ENV_NAME` |
| "Cognito 401 after sign in" | Tokens expired; sign out and back in |
| "Lambda errors in CloudWatch" | Check function logs: `aws logs tail /aws/lambda/wfl-<function> --follow` |
| "DynamoDB read errors" | Check table exists: `aws dynamodb describe-table --table-name wfl-main-dev-$(whoami)` |
| "Mobile app won't connect" | Verify .env.local has correct API endpoint and Cognito IDs |

## What's next

Once you verify the full flow works locally:
1. **Phase B completion**: Implement remaining features (recipes, preferences, etc.)
2. **Phase C**: Add integration tests, performance testing
3. **Staging deployment**: `pnpm cdk:deploy --context env=staging`
4. **Production**: Tag release → auto-deploys to prod

## Reference

- Full local dev docs: [docs/14_LOCAL_DEV.md](docs/14_LOCAL_DEV.md)
- Architecture: [docs/01_ARCHITECTURE.md](docs/01_ARCHITECTURE.md)
- Feature specs: [docs/07_FEATURES.md](docs/07_FEATURES.md)

---

**Stuck?** Check the troubleshooting section, read the referenced docs, or check CloudWatch logs for actual error messages.
