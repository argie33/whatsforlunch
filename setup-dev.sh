#!/bin/bash
# WhatsFresh Complete Development Setup
# Handles everything: clone, install, Docker, tests, app launch
# Run once: bash setup-dev.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  WhatsFresh Development Setup      ║${NC}"
echo -e "${BLUE}║  Complete Local Environment          ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# ─── Check Prerequisites ──────────────────────────────────────────────────────

echo -e "${YELLOW}📋 Checking prerequisites...${NC}"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js not found. Install from https://nodejs.org${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Node.js $(node --version)${NC}"

# Check pnpm
if ! command -v pnpm &> /dev/null; then
    echo -e "${YELLOW}⚠️  pnpm not found. Installing...${NC}"
    npm install -g pnpm@9
fi
echo -e "${GREEN}✅ pnpm $(pnpm --version)${NC}"

# Check Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker not found. Install Docker Desktop from https://docker.com${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Docker $(docker --version)${NC}"

# Check Docker is running
if ! docker ps > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running. Start Docker Desktop and try again.${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Docker is running${NC}"

echo ""

# ─── Clone/Update Repository ──────────────────────────────────────────────────

if [ ! -d ".git" ]; then
    echo -e "${YELLOW}📥 Cloning repository...${NC}"
    git clone https://github.com/yourusername/whatsfresh.git .
else
    echo -e "${YELLOW}🔄 Updating repository...${NC}"
    git pull origin main
fi

echo ""

# ─── Install Dependencies ────────────────────────────────────────────────────

echo -e "${YELLOW}📦 Installing dependencies...${NC}"
pnpm install --frozen-lockfile

echo ""

# ─── Start Docker Services ───────────────────────────────────────────────────

echo -e "${YELLOW}🐳 Starting Docker services...${NC}"
docker compose -f docker-compose.local.yml up -d

echo -e "${YELLOW}⏳ Waiting for services to be healthy...${NC}"
for i in {1..30}; do
    if docker compose exec -T dynamodb curl -s http://localhost:8000/ > /dev/null 2>&1; then
        echo -e "${GREEN}✅ DynamoDB is healthy${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}❌ Services failed to start${NC}"
        docker compose logs
        exit 1
    fi
    sleep 1
done

echo ""

# ─── Setup Database ──────────────────────────────────────────────────────────

echo -e "${YELLOW}🗄️  Setting up database tables...${NC}"
pnpm local:migrate
echo -e "${GREEN}✅ Database ready${NC}"

echo ""

# ─── Run Integration Tests ───────────────────────────────────────────────────

echo -e "${YELLOW}🧪 Running integration tests...${NC}"
pnpm local:test

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed!${NC}"
else
    echo -e "${RED}❌ Some tests failed${NC}"
    exit 1
fi

echo ""

# ─── Open Browser UIs ────────────────────────────────────────────────────────

echo -e "${YELLOW}🌐 Opening browser windows...${NC}"

# Detect OS and open URLs appropriately
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    open http://localhost:8001  # DynamoDB Admin
    open http://localhost:4000/graphql  # GraphQL API
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    xdg-open http://localhost:8001 &
    xdg-open http://localhost:4000/graphql &
fi

echo -e "${GREEN}✅ Browser windows opened${NC}"

echo ""

# ─── Summary ─────────────────────────────────────────────────────────────────

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  ✅ Setup Complete!                  ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}Services running:${NC}"
echo "  • DynamoDB Local:     http://localhost:8000"
echo "  • DynamoDB Admin UI:  http://localhost:8001"
echo "  • GraphQL API:        http://localhost:4000/graphql"
echo ""
echo -e "${GREEN}Next steps:${NC}"
echo "  1. Open a new terminal"
echo "  2. Run: ${YELLOW}cd apps/mobile && pnpm dev${NC}"
echo "  3. Choose: iOS (i), Android (a), or Expo Go (scan QR)"
echo "  4. Sign in with any email"
echo "  5. Create household and add food items"
echo ""
echo -e "${GREEN}Useful commands:${NC}"
echo "  • ${YELLOW}pnpm local:seed${NC}         - Add sample data"
echo "  • ${YELLOW}pnpm local:test${NC}         - Run integration tests"
echo "  • ${YELLOW}pnpm local:down${NC}         - Stop services"
echo "  • ${YELLOW}pnpm local:reset${NC}        - Full clean reset"
echo ""
echo -e "${BLUE}🚀 Ready to build!${NC}"
echo ""

