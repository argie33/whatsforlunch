# AppSync Security Functions

This directory contains AppSync JavaScript functions and resolver templates that enforce security checks on all API operations.

## Overview

All household-scoped queries and mutations follow this flow:

```
Client Request
  ↓
Cognito Auth Check (schema-level @aws_cognito_user_pools)
  ↓
checkHouseholdMembership (verify user is household member)
  ↓
enforceRateLimit (check rate limit quota)
  ↓
checkOwnerRole (if operation requires owner — optional)
  ↓
Resolver (business logic)
```

## Functions

### checkHouseholdMembership

**Path**: `functions/checkHouseholdMembership.js`

Verifies that the requesting user is a member of the household they're trying to operate on.

**Inputs**:
- `ctx.identity.sub` — User ID (from Cognito JWT)
- `ctx.args.input.householdId` or `ctx.args.householdId` — Household ID

**DynamoDB Query**:
```
PK = HOUSEHOLD#{householdId}
SK = MEMBER#{userId}
```

**Outputs** (sets on `ctx.stash`):
- `householdMember` — The member record (contains role, joinedAt, etc.)
- `userRole` — The user's role in this household ("owner", "member", "viewer")

**Error Handling**:
- `UNAUTHENTICATED` (401) if no user ID in JWT
- `BAD_REQUEST` (400) if no householdId provided
- `FORBIDDEN` (401) if user is not a member

### checkOwnerRole

**Path**: `functions/checkOwnerRole.js`

Restricts operations to household owner only. Must be called **after** `checkHouseholdMembership`.

**Inputs**:
- `ctx.stash.userRole` — Set by checkHouseholdMembership

**Outputs**: None

**Error Handling**:
- `FORBIDDEN` (403) if user is not owner

### enforceRateLimit

**Path**: `functions/enforceRateLimit.js`

Enforces per-user rate limits with tiered quotas based on operation type.

**Rate Limits** (per minute):
- General API: 100 req/min
- AI operations (classify, OCR): 20 req/min
- Photo uploads: 10 req/min

**DynamoDB Storage**:
```
PK = RATELIMIT#{userId}
SK = WINDOW#{windowStart}
count = current request count in this 60-second window
TTL = expiration timestamp
```

**Inputs**:
- `ctx.identity.sub` — User ID
- `ctx.request.operationName` — GraphQL operation name

**Outputs** (sets on `ctx.stash`):
- `rateLimitRemaining` — Requests left in current window

**Error Handling**:
- `RATE_LIMIT_EXCEEDED` (429) if limit exceeded

## Usage in Resolvers

### Example: UpdateItem mutation (requires membership check)

```graphql
mutation UpdateItem($input: UpdateItemInput!) {
  updateItem(input: $input) {
    id
    name
  }
}
```

Resolver pipeline:
1. `checkHouseholdMembership` — verify household membership
2. `enforceRateLimit` — check rate limit
3. `UpdateItem` datasource resolver — update the item

### Example: DeleteHousehold mutation (requires owner + membership check)

Resolver pipeline:
1. `checkHouseholdMembership` — verify household membership
2. `checkOwnerRole` — verify owner role
3. `enforceRateLimit` — check rate limit
4. `DeleteHousehold` datasource resolver — delete the household

### Example: ClassifyFood mutation (AI operation, stricter rate limit)

Resolver pipeline:
1. `checkHouseholdMembership` — verify household membership
2. `enforceRateLimit` — check rate limit (20 req/min)
3. `ClassifyFood` datasource resolver → Lambda

## Testing

### Unit Tests

(To be implemented in Phase C)

```bash
npm test -- appsync-functions
```

### Integration Tests

Deploy to dev environment and test with real Cognito tokens:

```bash
# 1. Get a valid JWT
TOKEN=$(aws cognito-idp admin-initiate-auth \
  --user-pool-id us-east-1_XXXX \
  --client-id XXXX \
  --auth-flow ADMIN_NO_SRP_AUTH \
  --auth-parameters USERNAME=test@example.com,PASSWORD=Password123 \
  --query 'AuthenticationResult.IdToken' \
  --output text)

# 2. Call AppSync mutation
curl -X POST https://api-dev.wfl.app/graphql \
  -H "Authorization: $TOKEN" \
  -d '{"query": "mutation { updateItem(input: {householdId: \"...\", id: \"...\", name: \"Milk\"}) { id } }"}'
```

### Security Testing

(To be implemented in Phase C)

- Cross-tenant data leakage: attempt to query household you're not a member of
- Rate limit enforcement: send >100 requests/min and verify 429 response
- Owner-only operations: attempt to delete household as non-owner

## WAF Rules

Additional protection at CloudFront + AppSync layer:

### CloudFront WAF (Layer 1)

- **Rate limit**: 2000 requests per 5 minutes per IP (botnet protection)
- **GraphQL introspection block** (prod only): Prevent schema discovery
- **AWS Managed Rules**: SQL injection, XSS, bad user agents

### AppSync WAF (Layer 2)

- **GraphQL mutation rate limit**: 100 mutations per minute per IP
- Scoped to `mutation` keyword to avoid blocking queries

## DynamoDB Access Patterns

### Rate Limit Window Storage

```
PK: RATELIMIT#{userId}
SK: WINDOW#{windowStart}
Attributes:
  - count: N (incremented per request)
  - TTL: N (expires after 2 minutes)
```

TTL strategy:
- 60-second sliding window
- Old windows auto-expire after 2 minutes
- Prevents unbounded table growth

## References

- [OWASP API Security Top 10](https://owasp.org/API-Security/ratelimiting/)
- [AWS AppSync Security](https://docs.aws.amazon.com/appsync/latest/devguide/security.html)
- [AWS WAF Security Automations](https://docs.aws.amazon.com/waf/latest/developerguide/waf-automatic-threat-response-rules.html)
