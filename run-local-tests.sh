#!/bin/bash
# WhatsFresh Local Stack Integration Tests
# Run from repo root: ./run-local-tests.sh

set -e

echo "🧪 WhatsFresh Local Stack Integration Tests"
echo "=============================================="
echo ""

# Check Docker is available
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker Desktop."
    exit 1
fi

# Check we're in repo root
if [ ! -f "docker-compose.local.yml" ]; then
    echo "❌ docker-compose.local.yml not found. Run from repo root."
    exit 1
fi

echo "📦 Starting local stack..."
docker compose -f docker-compose.local.yml up -d

echo "⏳ Waiting for services to be healthy..."
for i in {1..30}; do
    if docker compose exec -T dynamodb curl -s http://localhost:8000/ > /dev/null 2>&1; then
        echo "✅ DynamoDB is ready"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "❌ DynamoDB failed to start"
        docker compose logs dynamodb
        exit 1
    fi
    sleep 1
done

echo ""
echo "📡 Service Status:"
docker compose ps

echo ""
echo "🧬 Installing dependencies..."
cd services/local-mock
pnpm install --frozen-lockfile 2>&1 | grep -E "(^|✔|✖|found|up to date)" || true

echo ""
echo "🚀 Running integration tests..."
echo ""

pnpm integration-test

TEST_EXIT=$?

echo ""
echo "=============================================="
if [ $TEST_EXIT -eq 0 ]; then
    echo "✅ All integration tests passed!"
    echo ""
    echo "Local stack is ready:"
    echo "  - GraphQL API: http://localhost:4000/graphql"
    echo "  - DynamoDB Admin: http://localhost:8001"
    echo "  - Start developing: pnpm dev:mobile"
else
    echo "❌ Some tests failed. Check the output above."
    echo ""
    echo "Debugging tips:"
    echo "  - View logs: docker compose logs wfl-mock-api"
    echo "  - Check health: docker compose ps"
    echo "  - Stop stack: docker compose down -v"
fi

exit $TEST_EXIT
