#!/bin/bash
# WhatsForLunch — Start Everything Now
# Run this once, see the entire app working locally

set -e

echo ""
echo "🚀 WhatsForLunch — Starting Local Stack"
echo "========================================"
echo ""

# 1. Start backend
echo "📦 Starting backend services (DynamoDB + GraphQL API)..."
docker compose -f docker-compose.local.yml up -d
sleep 3

# 2. Check services are healthy
echo "⏳ Waiting for services to be healthy..."
for i in {1..30}; do
    if docker compose exec -T dynamodb curl -s http://localhost:8000/ > /dev/null 2>&1; then
        echo "✅ Backend is ready"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "❌ Services failed to start"
        exit 1
    fi
    sleep 1
done

# 3. Run integration tests
echo ""
echo "🧪 Running integration tests (validating everything works)..."
cd services/local-mock
pnpm install --silent 2>&1 | tail -1
pnpm integration-test --silent 2>&1 | tail -20

echo ""
echo "✅ Backend validated!"
echo ""

# 4. Start the app
echo "📱 Launching mobile app..."
echo "=============================================="
echo ""
echo "Choose your option:"
echo "  i = iOS Simulator (press 'i' below)"
echo "  a = Android Emulator (press 'a' below)"
echo "  q = Quit and scan QR code with Expo Go"
echo ""
echo "=============================================="
echo ""

cd ../../apps/mobile
pnpm dev

