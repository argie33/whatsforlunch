# Local Development Setup

Get WhatsForLunch running locally **without AWS** for rapid development and testing.

## Prerequisites

- Node.js 20+
- pnpm 8+
- Docker (for DynamoDB Local, optional)
- Git

## Quick Start — Mobile App (no AWS needed)

```bash
# 1. Install dependencies
pnpm install

# 2. Set up local env
cp apps/mobile/.env.local.example apps/mobile/.env.local
# (default values work out of the box for local dev)

# 3. Build shared packages
pnpm --filter "@whatsforlunch/shared" build

# 4. Start the Expo dev server
cd apps/mobile
pnpm dev
# ↳ Press 'i' to open iOS Simulator
# ↳ Press 'a' to open Android Emulator
# ↳ Scan QR code with Expo Go app on your phone
```

The app runs fully in mock mode locally — no AWS, no Cognito, no Bedrock. All AI and auth calls return realistic mocked data.

## Quick Start — Full Local Stack (optional)

To test backend logic with a real local database:

```bash
# Start DynamoDB Local
docker run -d -p 8000:8000 amazon/dynamodb-local

# Run backend tests against local DynamoDB
pnpm test

# Start all dev servers
pnpm dev
```

## Project Structure

```
whatsforlunch/
├── apps/
│   ├── mobile/          # Expo React Native app
│   └── web/             # Web dashboard (future)
├── services/
│   ├── auth/            # Cognito trigger lambdas
│   ├── ai/              # AI services (Bedrock, Textract)
│   └── layers/          # Lambda layers (shared code)
├── packages/
│   └── shared/          # Shared types, utils, auth
├── infra/
│   └── cdk/             # AWS CDK infrastructure-as-code
└── docs/                # Design docs + runbooks
```

## Core Services

### 1. Shared Package

The `packages/shared` exports types and utilities used by mobile app and Lambdas.

```bash
# Build shared package
pnpm --filter "@whatsforlunch/shared" build

# Run type check
pnpm --filter "@whatsforlunch/shared" typecheck

# Watch mode for development
pnpm --filter "@whatsforlunch/shared" dev
```

**Exports**:
- `auth/` — Authentication types, Cognito config
- `db/` — DynamoDB schema, access patterns
- `api/` — GraphQL types (generated)
- `schemas/` — Zod validation schemas

### 2. Auth Service

The `services/auth` contains Lambda trigger functions for Cognito.

#### Local Testing (No AWS)

```bash
cd services/auth

# Install dependencies
pnpm install

# Run unit tests
pnpm test

# Run with DynamoDB Local
export AUTH_CHALLENGES_TABLE=wfl-auth-challenges-dev
export PROFILES_TABLE=wfl-profiles-dev
export NONCE_SECRET=local-dev-secret-1234567890

# Invoke Lambda handler locally
node --loader ts-node/esm ./define-challenge/index.ts
```

#### Test DynamoDB Setup

```bash
# Start DynamoDB Local
docker run -p 8000:8000 amazon/dynamodb-local &

# Create test table
aws dynamodb create-table \
  --table-name wfl-auth-challenges-dev \
  --attribute-definitions \
    AttributeName=PK,AttributeType=S \
    AttributeName=SK,AttributeType=S \
  --key-schema \
    AttributeName=PK,KeyType=HASH \
    AttributeName=SK,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST \
  --ttl-specification AttributeName=TTL,Enabled=true \
  --endpoint-url http://localhost:8000 \
  --region us-east-1
```

### 3. Mobile App

The `apps/mobile` is an Expo React Native app.

```bash
cd apps/mobile

# Install dependencies
pnpm install

# Start Expo development server
pnpm start

# Scan QR code with Expo Go app (iOS/Android)
# Or press 'i' for iOS, 'a' for Android

# Run tests
pnpm test

# Type check
pnpm typecheck

# Lint
pnpm lint
```

**Local Configuration**:

Create `apps/mobile/.env.local`:

```env
# Cognito (local mock, not real AWS)
COGNITO_USER_POOL_ID=local-pool-id
COGNITO_CLIENT_ID=local-client-id
COGNITO_REGION=us-east-1

# API (mock GraphQL endpoint)
GRAPHQL_ENDPOINT=http://localhost:4000/graphql

# Sentry (disable in dev)
SENTRY_ENABLED=false
```

## Development Workflows

### Adding a New GraphQL Type

1. **Add schema definition** in `infra/cdk/lib/appsync/schema.graphql`
2. **Generate types**:
   ```bash
   pnpm codegen
   ```
3. **Generate Zod schema** (for validation):
   ```bash
   pnpm zod-gen
   ```
4. **Use in mobile app**:
   ```typescript
   import { Item } from '@whatsforlunch/shared';
   ```

### Testing Auth Flow

1. **Start DynamoDB Local**:
   ```bash
   docker run -p 8000:8000 amazon/dynamodb-local
   ```

2. **Run auth service tests**:
   ```bash
   pnpm --filter "@whatsforlunch/auth-service" test
   ```

3. **Manual testing with mock server** (future):
   ```bash
   pnpm --filter "@whatsforlunch/auth-service" dev
   # Starts mock GraphQL server at :4000
   ```

### Adding a New Lambda Function

1. **Create directory**: `services/service-name/function-name/`
2. **Add handler**: `index.ts` with exports
3. **Add test**: `index.test.ts`
4. **Add to CDK**: Update relevant stack in `infra/cdk/lib/stacks/`

## Environment Variables

### Development (.env.local)

```env
# Auth
NONCE_SECRET=dev-secret-123
AUTH_CHALLENGES_TABLE=wfl-auth-challenges-dev
PROFILES_TABLE=wfl-profiles-dev
SES_FROM_EMAIL=test@localhost

# Database
DYNAMODB_ENDPOINT=http://localhost:8000

# App
ENVIRONMENT=dev
LOG_LEVEL=DEBUG
```

### Testing (.env.test)

```env
ENVIRONMENT=test
LOG_LEVEL=WARN
NONCE_SECRET=test-secret
AUTH_CHALLENGES_TABLE=wfl-auth-challenges-test
DYNAMODB_ENDPOINT=http://localhost:8000
```

## Common Commands

```bash
# Root level
pnpm install               # Install all dependencies
pnpm build                 # Build all packages
pnpm test                  # Run all tests
pnpm lint                  # Lint all packages
pnpm typecheck             # Type check all packages
pnpm clean                 # Remove all node_modules and dist/

# Specific package
pnpm --filter auth-service test
pnpm --filter mobile lint
pnpm --filter shared build

# Watch mode
pnpm --filter shared dev   # Watch and rebuild shared package
```

## Debugging

### TypeScript Errors

```bash
# Check all packages
pnpm typecheck

# Specific package
pnpm --filter @whatsforlunch/shared typecheck
```

### Missing Exports

```bash
# Regenerate from schema
pnpm codegen
```

### DynamoDB Issues

```bash
# Verify table exists
aws dynamodb describe-table \
  --table-name wfl-auth-challenges-dev \
  --endpoint-url http://localhost:8000

# Scan items
aws dynamodb scan \
  --table-name wfl-auth-challenges-dev \
  --endpoint-url http://localhost:8000
```

## Workflow: Making a Change

**Example**: Adding a new field to the Profile type

1. **Update schema**:
   ```graphql
   type Profile {
     id: UUID!
     # ... existing fields ...
     newField: String!  # Add this
   }
   ```

2. **Generate types**:
   ```bash
   pnpm codegen
   ```

3. **Update shared package**:
   ```typescript
   // packages/shared/src/auth/index.ts
   export interface Profile {
     // ...
     newField: string;
   }
   ```

4. **Update mobile app**:
   ```typescript
   // apps/mobile/src/screens/Profile.tsx
   import { Profile } from '@whatsforlunch/shared';

   export function ProfileScreen() {
     const profile: Profile = { ... };
     return <Text>{profile.newField}</Text>;
   }
   ```

5. **Test**:
   ```bash
   pnpm typecheck
   pnpm test
   ```

6. **Commit**:
   ```bash
   git add .
   git commit -m "feat: add newField to Profile"
   ```

## Next Steps

Once everything works locally:

1. **Set up AWS account** (see `GETTING_STARTED.md`)
2. **Deploy infrastructure** with CDK
3. **Deploy Lambda functions** to dev environment
4. **Run integration tests** against real AWS

For now, focus on:
- ✅ Building auth service locally
- ✅ Testing mobile app on simulator
- ✅ Type checking all packages
- ❌ AWS deployment (post-Phase-A)
