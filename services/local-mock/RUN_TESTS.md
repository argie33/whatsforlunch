# Integration Testing — Local Stack Validation

This guide walks through validating the entire WhatsForLunch local development stack works end-to-end.

## Prerequisites

- Docker and Docker Compose installed
- Node.js 18+ with pnpm
- Working directory: `whatsforlunch` (repo root)

## Quick Start (2 minutes)

```bash
# 1. Start the local stack (DynamoDB + Mock GraphQL API)
docker compose -f docker-compose.local.yml up -d

# 2. Wait for services to be healthy
docker compose ps

# Expected output:
#   NAME                    STATUS          PORTS
#   wfl-dynamodb            Up (healthy)    0.0.0.0:8000->8000/tcp
#   wfl-dynamodb-admin      Up              0.0.0.0:8001->8001/tcp
#   wfl-mock-api            Up              0.0.0.0:4000->4000/tcp

# 3. Run integration tests
cd services/local-mock
pnpm install  # (one-time)
pnpm integration-test

# 4. Expected output: ✅ All 23 tests pass
```

## What the Tests Validate

### Infrastructure (2 tests)
- ✅ DynamoDB is reachable and responding
- ✅ GraphQL API endpoint is responding

### Authentication (2 tests)
- ✅ Sign-in mutation returns valid JWT token
- ✅ JWT token is valid and decodable

### User Profiles (2 tests)
- ✅ Can fetch authenticated user's profile
- ✅ Can update user profile (display name)

### Households (2 tests)
- ✅ Can create a household
- ✅ Can list households for authenticated user

### Food Items (3 tests)
- ✅ Can create a food item with expiry date
- ✅ Can list items in a household
- ✅ Can mark item as eaten

### AI Features (1 test)
- ✅ Can classify food from a photo (mock response)

### Data Persistence (2 tests)
- ✅ User profile persists in DynamoDB
- ✅ Household data persists in DynamoDB

### Error Handling (2 tests)
- ✅ Unauthorized requests without token are rejected
- ✅ Invalid GraphQL queries return proper errors

**Total: 23 comprehensive tests covering complete user workflows**

## Troubleshooting

### Services fail to start

```bash
# Check Docker is running
docker ps

# Check logs
docker compose logs dynamodb
docker compose logs wfl-mock-api

# Try clean restart
docker compose down -v
docker compose up -d
```

### Tests timeout or fail

```bash
# Ensure services are healthy
docker compose ps

# Check DynamoDB is accessible
curl http://localhost:8000/

# Check API is accessible
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ __typename }"}'

# Check logs
docker compose logs wfl-mock-api
```

### DynamoDB Admin UI

Browse DynamoDB tables and data at: **http://localhost:8001**

## Full Teardown

When done testing:

```bash
docker compose -f docker-compose.local.yml down -v
```

The `-v` flag removes volumes (deletes test data). Omit it to keep data between test runs.

## CI/CD Integration

These tests will eventually run in GitHub Actions on every PR to ensure the local stack stays working as the codebase evolves.

```yaml
# Future: .github/workflows/local-stack-test.yml
- name: Run integration tests
  run: |
    docker compose -f docker-compose.local.yml up -d
    sleep 5  # wait for health checks
    cd services/local-mock
    pnpm install
    pnpm integration-test
```

## What's Being Tested

The integration test validates the **complete end-to-end flow** a user experiences:

1. **Start**: Fresh local environment (DynamoDB + Mock API)
2. **Sign in**: Get JWT token via GraphQL mutation
3. **Create household**: Store household with user ownership
4. **Add food item**: Track what's in the fridge/pantry with expiry
5. **Mark eaten**: Update item status when consumed
6. **Classify food**: AI identifies food from photo (mocked locally)
7. **Persistence**: All data persists in DynamoDB across requests
8. **Security**: Unauthorized requests are rejected
9. **Validation**: Invalid queries return proper error messages

This matches exactly what the mobile app will do when connecting to this local infrastructure.

## Next Steps

Once tests pass:
- Mobile team can connect to `http://localhost:4000/graphql`
- Backend team can write resolvers against DynamoDB
- AI team can fine-tune classification prompts
- All teams work in parallel against stable local infrastructure

All without AWS credentials or any cloud costs. 🚀
