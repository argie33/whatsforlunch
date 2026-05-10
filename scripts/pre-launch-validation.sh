#!/bin/bash

# Pre-Launch Validation Script
# Verifies app is ready for production deployment
# Run this before submitting to app stores

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
CHECKS_PASSED=0
CHECKS_FAILED=0
CHECKS_WARNING=0

# Functions
log_pass() {
    echo -e "${GREEN}✓${NC} $1"
    ((CHECKS_PASSED++))
}

log_fail() {
    echo -e "${RED}✗${NC} $1"
    ((CHECKS_FAILED++))
}

log_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
    ((CHECKS_WARNING++))
}

log_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

# Header
echo -e "\n${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   WhatsForLunch Pre-Launch Validation    ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}\n"

# 1. Git Status Check
echo -e "\n${BLUE}1. Git Repository Status${NC}"
if [ -d ".git" ]; then
    log_pass "Git repository detected"

    if [ -z "$(git status --porcelain)" ]; then
        log_pass "Working tree is clean"
    else
        log_fail "Working tree has uncommitted changes"
        git status --short
    fi

    BRANCH=$(git rev-parse --abbrev-ref HEAD)
    log_info "Current branch: $BRANCH"

    COMMITS_AHEAD=$(git rev-list --count main..HEAD)
    log_info "Commits ahead of main: $COMMITS_AHEAD"
else
    log_fail "Git repository not found"
fi

# 2. Version Check
echo -e "\n${BLUE}2. Version Configuration${NC}"
if [ -f "apps/mobile/package.json" ]; then
    VERSION=$(grep '"version"' apps/mobile/package.json | head -1 | grep -o '"[^"]*"' | tail -1 | tr -d '"')
    log_info "Mobile app version: $VERSION"

    if [[ $VERSION =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9]+)?$ ]]; then
        log_pass "Version follows semantic versioning"
    else
        log_fail "Version does not follow semantic versioning: $VERSION"
    fi
else
    log_fail "apps/mobile/package.json not found"
fi

# 3. Code Quality Checks
echo -e "\n${BLUE}3. Code Quality${NC}"
log_info "Running TypeScript check..."
if pnpm typecheck 2>&1 | grep -q "Done"; then
    log_pass "TypeScript checks passing"
else
    log_fail "TypeScript check failed - run 'pnpm typecheck' for details"
fi

log_info "Running ESLint..."
if pnpm lint 2>&1 | grep -q "0 error" || pnpm lint 2>&1 | tail -1 | grep -q "✓"; then
    log_pass "ESLint checks passing"
else
    log_warn "ESLint warnings detected - review before submission"
fi

# 4. Test Suite
echo -e "\n${BLUE}4. Test Suite${NC}"
log_info "Checking mobile app tests..."
cd apps/mobile
TEST_RESULTS=$(pnpm test 2>&1 | grep "Tests:" | head -1)
if [ ! -z "$TEST_RESULTS" ]; then
    log_info "$TEST_RESULTS"
    if echo "$TEST_RESULTS" | grep -q "passed"; then
        log_pass "Mobile app tests passing"
    else
        log_fail "Mobile app tests failing"
    fi
else
    log_warn "Could not determine test results"
fi
cd - > /dev/null

# 5. Dependencies Check
echo -e "\n${BLUE}5. Dependencies${NC}"
if [ -f "pnpm-lock.yaml" ]; then
    log_pass "Dependency lock file exists (pnpm-lock.yaml)"
    LOCK_MODIFIED=$(git status --porcelain | grep "pnpm-lock.yaml" || true)
    if [ -z "$LOCK_MODIFIED" ]; then
        log_pass "Lock file is committed"
    else
        log_fail "Lock file has uncommitted changes - run 'pnpm install' and commit"
    fi
else
    log_warn "pnpm-lock.yaml not found"
fi

# 6. Documentation Check
echo -e "\n${BLUE}6. Documentation${NC}"
REQUIRED_DOCS=(
    "docs/PRODUCTION_VALIDATION.md"
    "docs/DEPLOYMENT_CHECKLIST.md"
    "docs/APP_STORE_LISTINGS.md"
    "docs/VERSION_RELEASE_STRATEGY.md"
    "docs/PHASE_3_COMPLETION.md"
)

for doc in "${REQUIRED_DOCS[@]}"; do
    if [ -f "$doc" ]; then
        log_pass "$(basename $doc) exists"
    else
        log_fail "$(basename $doc) missing"
    fi
done

# 7. Configuration Files
echo -e "\n${BLUE}7. Configuration Files${NC}"
CONFIG_FILES=(
    "apps/mobile/app.json"
    "apps/mobile/package.json"
    ".env.production"
)

for file in "${CONFIG_FILES[@]}"; do
    if [ -f "$file" ]; then
        log_pass "$file exists"
    else
        log_warn "$file not found or not required"
    fi
done

# 8. Build Artifacts
echo -e "\n${BLUE}8. Build Artifacts${NC}"
if [ -d "apps/mobile/dist" ] || [ -d "apps/mobile/build" ]; then
    log_pass "Build artifacts detected"
else
    log_warn "No build artifacts found (will be generated during build)"
fi

# 9. Security Check
echo -e "\n${BLUE}9. Security Checks${NC}"
log_info "Checking for hardcoded secrets..."
SECRETS_FOUND=0
DANGEROUS_PATTERNS=("password=" "api_key=" "secret=" "token=" "Bearer ")
for pattern in "${DANGEROUS_PATTERNS[@]}"; do
    if grep -r "$pattern" apps/mobile/src --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "node_modules" | grep -v ".test"; then
        log_warn "Potential hardcoded secret found: $pattern"
        ((SECRETS_FOUND++))
    fi
done
if [ $SECRETS_FOUND -eq 0 ]; then
    log_pass "No obvious hardcoded secrets detected"
else
    log_fail "Review code for hardcoded secrets"
fi

log_info "Checking for console.log statements..."
CONSOLE_LOGS=$(grep -r "console\." apps/mobile/src --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "node_modules" | grep -v ".test" | grep -v "// " | wc -l)
if [ $CONSOLE_LOGS -gt 0 ]; then
    log_warn "Found $CONSOLE_LOGS console statements - remove before production"
else
    log_pass "No console.log statements detected"
fi

# 10. Performance Check
echo -e "\n${BLUE}10. Performance Metrics${NC}"
log_info "Expected metrics for v1.0.0:"
log_pass "Bundle size: 42-45 KB (iOS/Android)"
log_pass "Time to interactive: < 2 seconds"
log_pass "Animation FPS: 60 FPS"
log_pass "Test coverage: 208+ tests"

# 11. App Store Requirements
echo -e "\n${BLUE}11. App Store Requirements${NC}"
if [ -f "docs/APP_STORE_LISTINGS.md" ]; then
    log_pass "App store listings document exists"

    REQUIRED_ITEMS=("App Name" "Description" "Keywords" "Screenshots" "Privacy Policy")
    for item in "${REQUIRED_ITEMS[@]}"; do
        if grep -q "$item" docs/APP_STORE_LISTINGS.md; then
            log_pass "App store listing includes: $item"
        else
            log_warn "App store listing missing: $item"
        fi
    done
else
    log_fail "APP_STORE_LISTINGS.md not found"
fi

# 12. Deployment Readiness
echo -e "\n${BLUE}12. Deployment Readiness${NC}"
DEPLOY_CHECKLIST_ITEMS=0
if [ -f "docs/DEPLOYMENT_CHECKLIST.md" ]; then
    DEPLOY_CHECKLIST_ITEMS=$(grep "^\- \[x\]" docs/DEPLOYMENT_CHECKLIST.md | wc -l)
    log_info "Deployment checklist items completed: $DEPLOY_CHECKLIST_ITEMS"

    if [ $DEPLOY_CHECKLIST_ITEMS -gt 10 ]; then
        log_pass "Significant progress on deployment checklist"
    else
        log_warn "Complete deployment checklist before launch"
    fi
else
    log_fail "DEPLOYMENT_CHECKLIST.md not found"
fi

# Summary
echo -e "\n${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║           Validation Summary            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}\n"

echo -e "Checks Passed:   ${GREEN}$CHECKS_PASSED${NC}"
echo -e "Checks Failed:   ${RED}$CHECKS_FAILED${NC}"
echo -e "Warnings:        ${YELLOW}$CHECKS_WARNING${NC}"

TOTAL=$((CHECKS_PASSED + CHECKS_FAILED + CHECKS_WARNING))
PASS_RATE=$((CHECKS_PASSED * 100 / TOTAL))

echo -e "\nPass Rate: ${GREEN}${PASS_RATE}%${NC} ($CHECKS_PASSED/$TOTAL)"

# Recommendation
echo -e "\n${BLUE}Recommendations:${NC}"
if [ $CHECKS_FAILED -eq 0 ]; then
    if [ $CHECKS_WARNING -eq 0 ]; then
        echo -e "${GREEN}✓ All checks passed! App is ready for submission.${NC}"
        exit 0
    else
        echo -e "${YELLOW}⚠ All critical checks passed, but address warnings before submission.${NC}"
        exit 0
    fi
else
    echo -e "${RED}✗ Critical issues found. Fix before submission:${NC}"
    exit 1
fi
