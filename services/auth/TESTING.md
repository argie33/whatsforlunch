# Auth Service Testing

## Local Testing (No AWS Required)

### Unit Tests

```bash
cd services/auth
pnpm install
pnpm test
```

Test coverage:
- Nonce generation (cryptographic randomness)
- HMAC signing/verification (timing-safe comparison)
- TTL enforcement
- Single-use enforcement
- IP class binding

### Integration Tests (Mocked AWS)

```bash
# Run with mocked DynamoDB and SES
NODE_ENV=test pnpm test:integration
```

Mock setup:
- DynamoDB Local (via `aws-dynamodb-local`)
- SES mock (via `jest.mock('@aws-sdk/client-sesv2')`)

### Manual Testing with Local DynamoDB

#### 1. Start DynamoDB Local

```bash
# Install if not present
docker pull amazon/dynamodb-local
docker run -p 8000:8000 amazon/dynamodb-local

# Or using local jar
java -Djava.library.path=./DynamoDBLocal_lib -jar DynamoDBLocal.jar -sharedDb
```

#### 2. Create test table

```bash
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

#### 3. Test Lambda handler locally

```bash
# Using SAM (AWS Serverless Application Model)
sam local invoke CreateChallengeFunction \
  --event create-challenge-event.json \
  --env-vars local.env
```

Or use Node.js directly:

```typescript
// test-create-challenge.ts
import { handler } from './services/auth/create-challenge/index';

const event = {
  request: {
    userAttributes: { email: 'test@example.com', sub: 'user-123' },
    userContextData: { sourceIp: '192.168.1.1', userAgent: 'Mozilla/5.0' },
  },
  response: {},
};

handler(event).then(result => console.log(JSON.stringify(result, null, 2)));
```

## Security Test Scenarios

### Magic Link Flow

**Test**: End-to-end magic link authentication (no AWS)

```bash
# 1. User requests magic link
curl -X POST http://localhost:3000/auth/initiate \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'

# Response should contain a challenge session

# 2. Simulate magic link click (extract nonce from email mock)
NONCE="..."

# 3. Verify challenge
curl -X POST http://localhost:3000/auth/verify \
  -H "Content-Type: application/json" \
  -d '{"nonce":"'$NONCE'","email":"test@example.com"}'

# Response should contain JWT tokens
```

### Rate Limit Testing

```bash
# Simulate 105 rapid requests (should be rate-limited after 100)
for i in {1..105}; do
  curl -X GET http://localhost:3000/api/items \
    -H "Authorization: Bearer $JWT" &
done
wait

# Check for 429 responses
echo "Expected: ~5 requests return 429 Too Many Requests"
```

### Cross-Tenant Access Testing

```bash
# 1. Create two users
USER_A=$(curl -X POST http://localhost:3000/auth/signup -d '{"email":"a@example.com"}' | jq -r '.userId')
USER_B=$(curl -X POST http://localhost:3000/auth/signup -d '{"email":"b@example.com"}' | jq -r '.userId')

# 2. User A creates household
HOUSEHOLD=$(curl -X POST http://localhost:3000/api/households \
  -H "Authorization: Bearer $TOKEN_A" \
  -d '{"name":"A Household"}' | jq -r '.id')

# 3. User B tries to access (should fail)
curl -X GET http://localhost:3000/api/households/$HOUSEHOLD \
  -H "Authorization: Bearer $TOKEN_B"

# Response should contain "Not a member of this household"
```

## Continuous Testing

### Pre-commit Hook

Add to `.husky/pre-commit`:

```bash
#!/bin/sh
pnpm --filter @whatsfresh/auth-service test -- --coverage
pnpm lint
pnpm typecheck
```

### CI Pipeline (GitHub Actions)

`.github/workflows/auth-tests.yml`:

```yaml
name: Auth Service Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      dynamodb:
        image: amazon/dynamodb-local
        ports:
          - 8000:8000
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm --filter @whatsfresh/auth-service test
      - run: pnpm lint
```

## Test Fixtures

### Valid Magic Link Request

```json
{
  "request": {
    "userAttributes": {
      "email": "user@example.com",
      "sub": "12345-67890"
    },
    "userContextData": {
      "sourceIp": "192.168.1.100",
      "userAgent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)"
    }
  },
  "response": {}
}
```

### Invalid Nonce Verification

```json
{
  "request": {
    "userAttributes": {
      "email": "user@example.com",
      "sub": "12345-67890"
    },
    "userContextData": {
      "sourceIp": "10.0.0.1",
      "userAgent": "Different browser"
    },
    "challengeAnswer": "invalid-nonce-12345"
  },
  "response": {}
}
```

## Expected Test Results

| Test | Expected Outcome |
|------|------------------|
| Valid magic link | JWT tokens issued |
| Expired nonce | Error: Challenge expired |
| Reused nonce | Error: Challenge not found (deleted) |
| Wrong HMAC | Error: Invalid token HMAC |
| IP mismatch | Logged warning; allowed (configurable) |
| UA mismatch | Logged warning; allowed |
| Rate limit exceeded | 429 Too Many Requests |
| Non-member household access | Error: Not a member |
| Owner-only operation as member | Error: Only owner can perform this |
