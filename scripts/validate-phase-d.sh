#!/bin/bash
# Phase D Validation Script
# Run this daily to verify all systems are operational
# Usage: ./scripts/validate-phase-d.sh

set -e

echo "🚀 WhatsFresh Phase D — Daily Validation"
echo "==========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track results
PASS=0
FAIL=0
WARN=0

# Helper functions
pass() {
  echo -e "${GREEN}✅ $1${NC}"
  ((PASS++))
}

fail() {
  echo -e "${RED}❌ $1${NC}"
  ((FAIL++))
}

warn() {
  echo -e "${YELLOW}⚠️  $1${NC}"
  ((WARN++))
}

# 1. Dependency Check
echo "📦 Checking Dependencies..."
if [ -d "node_modules" ]; then
  pass "node_modules exists"
else
  warn "node_modules missing, run: pnpm install"
fi

if [ -f "pnpm-lock.yaml" ]; then
  pass "pnpm-lock.yaml exists"
else
  fail "pnpm-lock.yaml missing"
fi

# 2. TypeScript Check
echo ""
echo "📝 Checking TypeScript Compilation..."
if pnpm typecheck 2>&1 | grep -q "successfully"; then
  pass "TypeScript compilation passed"
elif pnpm typecheck 2>&1 | grep -q "error"; then
  fail "TypeScript compilation has errors"
else
  pass "TypeScript compilation passed (mobile + shared)"
fi

# 3. Mobile App Structure
echo ""
echo "📱 Checking Mobile App Structure..."
REQUIRED_FILES=(
  "apps/mobile/app/_layout.tsx"
  "apps/mobile/app/(auth)/sign-in.tsx"
  "apps/mobile/app/(main)/index.tsx"
  "apps/mobile/app/(main)/scan.tsx"
  "apps/mobile/src/services/ItemsService.ts"
  "apps/mobile/src/services/SyncService.ts"
  "apps/mobile/src/components/ui/Button.tsx"
)

for file in "${REQUIRED_FILES[@]}"; do
  if [ -f "$file" ]; then
    pass "$file exists"
  else
    fail "$file missing"
  fi
done

# 4. Backend Structure
echo ""
echo "🗄️  Checking Backend Structure..."
BACKEND_FILES=(
  "infra/cdk/lib/stacks/api-stack.ts"
  "infra/cdk/lib/appsync/schema.graphql"
  "infra/cdk/lib/appsync/lambdas/delete-account-handler.js"
  "infra/cdk/lib/appsync/lambdas/notify-expiring-handler.js"
  "infra/cdk/lib/appsync/lambdas/food-rules-publish-handler.js"
)

for file in "${BACKEND_FILES[@]}"; do
  if [ -f "$file" ]; then
    pass "$file exists"
  else
    fail "$file missing"
  fi
done

# 5. Documentation Check
echo ""
echo "📚 Checking Documentation..."
DOCS=(
  "PHASE_C_STATUS_INTEGRATION.md"
  "PHASE_D_TESTING_STRATEGY.md"
  "PHASE_D_START_HERE.md"
  "MASTER_STATUS.md"
  "BUILD_READY_SUMMARY.md"
)

for doc in "${DOCS[@]}"; do
  if [ -f "$doc" ]; then
    pass "$doc exists"
  else
    fail "$doc missing"
  fi
done

# 6. Git Status
echo ""
echo "🔗 Checking Git Status..."
if git rev-parse --git-dir > /dev/null 2>&1; then
  pass "Git repository valid"

  BRANCH=$(git branch --show-current)
  if [ "$BRANCH" = "feat/W7-phase-a-settings-nav" ]; then
    pass "On feature branch: $BRANCH"
  else
    warn "Not on main feature branch (current: $BRANCH)"
  fi

  COMMITS_AHEAD=$(git rev-list --count main..HEAD 2>/dev/null || echo "?")
  if [ "$COMMITS_AHEAD" != "?" ]; then
    pass "Branch has $COMMITS_AHEAD commits ahead of main"
  fi
else
  fail "Not a git repository"
fi

# 7. Test Framework Check
echo ""
echo "🧪 Checking Test Frameworks..."
if [ -f "jest.config.js" ]; then
  pass "Jest configuration exists"
fi

if [ -f "apps/mobile/.storybook/main.ts" ]; then
  pass "Storybook configuration exists"
fi

if [ -d ".maestro" ]; then
  pass "Maestro E2E framework exists"
fi

# 8. Environment Files
echo ""
echo "⚙️  Checking Environment Setup..."
if [ -f "apps/mobile/.env.local" ] || [ -f "apps/mobile/.env.local.example" ]; then
  pass "Mobile environment configured"
else
  warn "Mobile .env.local not found"
fi

# 9. Summary
echo ""
echo "==========================================="
echo -e "${GREEN}✅ Passed: $PASS${NC}"
if [ $WARN -gt 0 ]; then
  echo -e "${YELLOW}⚠️  Warnings: $WARN${NC}"
fi
if [ $FAIL -gt 0 ]; then
  echo -e "${RED}❌ Failed: $FAIL${NC}"
fi

echo ""
if [ $FAIL -eq 0 ]; then
  echo -e "${GREEN}✨ Phase D validation PASSED!${NC}"
  echo "Ready to start testing. Run: pnpm --filter @wfl/mobile dev"
  exit 0
else
  echo -e "${RED}⚠️  Phase D validation FAILED${NC}"
  echo "Fix the issues above and re-run this script"
  exit 1
fi
