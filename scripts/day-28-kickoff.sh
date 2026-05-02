#!/bin/bash
# Day 28 Phase D Kickoff Script
# Run this on Day 28 morning to begin Phase D validation across all teams

set -e

echo "🚀 WhatsFresh — Phase D Day 28 Kickoff"
echo "=========================================="
echo ""
echo "Date: April 28, 2026 (Day 28 of 42)"
echo "Timeline: Phase D Days 28-39 (12 days)"
echo "Goal: Complete integration testing before AWS deployment"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check prerequisites
echo -e "${BLUE}📋 Verifying Phase D prerequisites...${NC}"
echo ""

# 1. TypeScript check
echo "1️⃣  TypeScript compilation..."
pnpm typecheck > /dev/null 2>&1 && echo -e "${GREEN}✅ PASS${NC}" || echo -e "${YELLOW}⚠️  Check logs${NC}"

# 2. Mobile app check
echo "2️⃣  Mobile app structure..."
if [ -d "apps/mobile/app/(main)" ]; then
  echo -e "${GREEN}✅ PASS${NC}"
else
  echo -e "${YELLOW}⚠️  Mobile structure incomplete${NC}"
fi

# 3. Documentation check
echo "3️⃣  Phase D documentation..."
if [ -f "PHASE_D_START_HERE.md" ]; then
  echo -e "${GREEN}✅ PASS${NC}"
else
  echo -e "${YELLOW}⚠️  Missing documentation${NC}"
fi

# 4. Git check
echo "4️⃣  Git repository..."
if git rev-parse --git-dir > /dev/null 2>&1; then
  BRANCH=$(git branch --show-current)
  COMMITS=$(git rev-list --count main..HEAD 2>/dev/null || echo "0")
  echo -e "${GREEN}✅ PASS${NC} (Branch: $BRANCH, Commits: $COMMITS)"
else
  echo -e "${YELLOW}⚠️  Not a git repository${NC}"
fi

echo ""
echo "=========================================="
echo ""

# Team instructions
echo -e "${BLUE}📝 TEAM ASSIGNMENTS FOR DAY 28${NC}"
echo ""
echo "All teams should complete their validation checklist:"
echo ""

echo "W1 (Infrastructure):"
echo "  [ ] Local API health check: curl http://localhost:3001/health"
echo "  [ ] GraphQL endpoint working"
echo "  [ ] Offline fallback tested"
echo ""

echo "W2 (Backend):"
echo "  [ ] Resolver compilation: pnpm --filter @wfl/backend typecheck"
echo "  [ ] Lambda functions present (3 files)"
echo "  [ ] CDK synth succeeds"
echo ""

echo "W3 (Auth):"
echo "  [ ] Sign-in screen visible"
echo "  [ ] All 3 auth methods shown (Magic Link / Apple / Google)"
echo "  [ ] Dev bypass works"
echo ""

echo "W4 (AI/ML):"
echo "  [ ] Lambda callability verified"
echo "  [ ] Mock responses working"
echo "  [ ] Error handling tested"
echo ""

echo "W5 (Mobile Foundation):"
echo "  [ ] 13 components in Storybook"
echo "  [ ] 50+ component stories"
echo "  [ ] Accessibility labels present"
echo "  [ ] Reduce-motion respected"
echo ""

echo "W6 (Dashboard):"
echo "  [ ] Items list renders"
echo "  [ ] Filters work (all/fridge/freezer/pantry)"
echo "  [ ] Search bar functional"
echo "  [ ] Swipe actions present"
echo ""

echo "W7 (Settings):"
echo "  [ ] All 8 sections visible"
echo "  [ ] Toggles functional"
echo "  [ ] Theme persists"
echo "  [ ] Language changes work"
echo ""

echo "W8 (Sync):"
echo "  [ ] Pull-to-refresh works"
echo "  [ ] Auto-sync on reconnect"
echo "  [ ] Offline queue persists"
echo "  [ ] Conflict detection works"
echo ""

echo "W9 (QA):"
echo "  [ ] Jest framework ready"
echo "  [ ] Storybook a11y tests"
echo "  [ ] E2E flows scaffolded"
echo "  [ ] Manual QA checklist prepared"
echo ""

echo "W10 (Design):"
echo "  [ ] Tamagui tokens review"
echo "  [ ] Dark mode verified"
echo "  [ ] Component consistency checked"
echo "  [ ] Animations smooth"
echo ""

echo "=========================================="
echo ""
echo -e "${GREEN}✨ Phase D Kickoff Complete!${NC}"
echo ""
echo "Next Steps:"
echo "1. Each team lead reads PHASE_D_START_HERE.md (5 min)"
echo "2. Run validation script: ./scripts/validate-phase-d.sh"
echo "3. Verify local environment works (5-10 min)"
echo "4. Begin Day 28 testing per team checklist"
echo "5. Report status in daily standup (9:30am PT)"
echo ""
echo "Timeline:"
echo "  Days 28-31: Local validation ✓ (Today + 3 days)"
echo "  Days 32-35: Deep testing (Unit/Component/E2E)"
echo "  Day 36:     Sign-off + bug fixes"
echo "  Days 37-39: AWS deployment + beta"
echo ""
echo -e "${BLUE}📞 Support${NC}"
echo "  • Issues? Check PHASE_D_START_HERE.md 'Common Scenarios'"
echo "  • Blocking? Slack @eng-lead"
echo "  • Questions? Comment on GitHub"
echo ""
echo "Let's ship Phase D! 🚀"
echo ""
