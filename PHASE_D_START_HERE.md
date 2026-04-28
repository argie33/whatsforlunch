# Phase D — START HERE (Days 28-39)

**Status**: Ready to begin integration testing  
**Current**: Day 27 complete, all prerequisites met  
**Next**: Validate locally, run tests, fix issues

---

## TL;DR for Each Team

### 🎯 Your Mission (Next 2 Weeks)

```
All teams in parallel:

Days 28-29: ✅ Verify your component works locally
Days 30-31: ✅ Run tests (unit, component, E2E)
Days 32-33: ✅ Integration testing with other teams
Days 34-35: ✅ Performance + accessibility validation
Days 36: ✅ Sign-off + bug fixes
Days 37-39: ✅ AWS deployment + beta testing
```

---

## Quick Start (For Any Team)

### 1. Set Up Local Environment (5 minutes)
```bash
# Clone / pull latest
git checkout feat/W7-phase-a-settings-nav  # Latest code
git pull origin feat/W7-phase-a-settings-nav

# Install dependencies (if not done)
pnpm install

# Verify build
pnpm typecheck   # Should pass
pnpm --filter @wfl/mobile dev --help  # Should show Expo help
```

### 2. Start Development Server
```bash
# Terminal 1: Mobile app dev server
pnpm --filter @wfl/mobile dev

# Terminal 2: Local API server (if testing backend integration)
pnpm --filter @wfl/infrastructure dev

# Terminal 3: Storybook for component testing
pnpm --filter @wfl/mobile storybook
```

### 3. Choose Your Testing Method

#### Option A: Web Browser (Fastest, Limited)
```bash
# In Expo dev server, press 'w'
# Opens http://localhost:19006 in browser
# Quick testing of UI, doesn't test native features
```

#### Option B: iOS Simulator (Mac Only)
```bash
# In Expo dev server, press 'i'
# Requires Xcode + iOS SDK
# Full testing of iOS-specific features
```

#### Option C: Android Emulator (Windows/Mac/Linux)
```bash
# In Expo dev server, press 'a'
# Requires Android SDK + emulator
# Full testing of Android-specific features
```

#### Option D: Expo Go (Physical Device)
```bash
# Install Expo Go app on physical device
# Scan QR code from Expo dev server
# Quick testing, not for final validation
```

---

## Testing Checklist by Team

### W1 (Infrastructure)
```bash
# Verify local API server
curl http://localhost:3001/health
# Expected: { "status": "ok" }

# Verify GraphQL endpoint
curl -X POST http://localhost:3001/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ __schema { types { name } } }"}'
# Expected: List of GraphQL types

# Test network fallback
pnpm --filter @wfl/mobile dev
# Disable network (airplane mode or dev tools)
# App should continue working with local data
```

**Success Criteria**:
- ✅ Health check responds
- ✅ GraphQL endpoint works
- ✅ Offline mode works
- ✅ All 10 teams can reach local API

### W2 (Backend)
```bash
# Verify all resolvers are defined
pnpm --filter @wfl/backend typecheck
# Expected: 0 errors

# Verify Lambda functions
ls infra/cdk/lib/appsync/lambdas/
# Expected: delete-account-handler.js, notify-expiring-handler.js, food-rules-publish-handler.js

# Verify CDK can synthesize
pnpm --filter @wfl/infrastructure run "cdk synth" 2>&1 | head -20
# Expected: CloudFormation template output
```

**Success Criteria**:
- ✅ All 56 resolvers compile
- ✅ 3 Lambda functions present
- ✅ CDK synth succeeds
- ✅ Step Functions defined

### W3 (Auth)
```bash
pnpm --filter @wfl/mobile dev

# Tap on sign-in screen
# Should see: Magic link input + Apple Sign-In + Google Sign-In + Dev bypass button

# Test dev bypass (local mode)
# Enter: dev@local.test
# Expected: Navigate to dashboard with placeholder household
```

**Success Criteria**:
- ✅ All 3 auth methods visible
- ✅ Dev bypass works in local mode
- ✅ Sign-in navigates to dashboard
- ✅ Session persists across app restart

### W4 (AI/ML)
```bash
# Lambda functions should be callable
# In Phase D, these return mock data until AWS Lambda wired

# Test via mobile app
# 1. Scan screen → Photo mode
# 2. Take/upload photo
# 3. Should return: { foodType: "...", confidence: 0.95 }  (mock)

# Test OCR
# 1. Scan screen → Date mode
# 2. Take/upload date photo
# 3. Should return: { date: "2026-05-15" }  (mock)
```

**Success Criteria**:
- ✅ Lambda functions deployable
- ✅ Mock responses working
- ✅ Service layer calls correct endpoints
- ✅ Error handling works (fallback to manual entry)

### W5 (Mobile Foundation)
```bash
# Start Storybook
pnpm --filter @wfl/mobile storybook

# Check accessibility
# Each component story should have:
# ✅ accessibilityLabel
# ✅ accessibilityRole
# ✅ accessibilityState (if applicable)
# ✅ Color + icon (never color alone)

# Test animations
# Each story should support reduce-motion:
# Settings → Accessibility → Reduce Motion
# Animations should be instant when enabled
```

**Success Criteria**:
- ✅ 13/13 components have stories
- ✅ 50+ stories render
- ✅ Accessibility labels present
- ✅ Reduce-motion respected
- ✅ All budgets met (render <100ms)

### W6 (Dashboard)
```bash
pnpm --filter @wfl/mobile dev

# Navigate to Dashboard (first tab)
# Expected to see:
# ✅ Item list (if items exist) or empty state
# ✅ Storage filters (all, fridge, freezer, pantry)
# ✅ Search bar
# ✅ FAB button to add item

# Test interactions
# 1. Add item (tap FAB)
# 2. Fill form → Add Item
# 3. Item appears in list
# 4. Swipe right → "Mark Eaten" action
# 5. Swipe left → "Mark Tossed" action
# 6. Tap item → Detail screen

# Test pull-to-refresh
# Pull down on list → Sync indicator appears
```

**Success Criteria**:
- ✅ Items list renders
- ✅ Filters work
- ✅ Search works
- ✅ Add item form works
- ✅ Swipe actions work
- ✅ Navigation works
- ✅ Pull-to-refresh triggers sync

### W7 (Settings)
```bash
pnpm --filter @wfl/mobile dev

# Navigate to Settings (4th tab)
# Expected sections:
# ✅ Profile (name, email, photo, timezone)
# ✅ Households (members, invite)
# ✅ Notifications (toggles, schedule)
# ✅ Preferences (theme, language, diet)
# ✅ Privacy (data export, analytics)
# ✅ Help & Support
# ✅ Account (sign out, delete)

# Test theme toggle
# Preferences → Theme → Dark
# App should switch to dark mode immediately

# Test language change
# Preferences → Language → Español (or Français)
# All UI text should update immediately
```

**Success Criteria**:
- ✅ All 8 sections visible
- ✅ All toggles work
- ✅ Theme persists
- ✅ Language persists
- ✅ Form validation works
- ✅ Sign out clears auth state

### W8 (Sync)
```bash
pnpm --filter @wfl/mobile dev

# Add an item
# Expected: Appears in list + sync status shows "syncing"

# Disable network
# Expected: Sync status shows "offline"
# Add another item
# Expected: Item appears locally, queued for sync

# Re-enable network
# Expected: Sync status "syncing" → "synced"
# Both items now marked as synced

# Check WatermelonDB
# Sync metadata (_version, _last_changed_at) should be updated
```

**Success Criteria**:
- ✅ Pull-to-refresh works
- ✅ Auto-sync on reconnect
- ✅ Offline queue persists
- ✅ Conflict detection works
- ✅ Sync status UI updates
- ✅ No data loss

### W9 (QA/Testing)
```bash
# Run unit tests
pnpm test
# Expected: Tests run, coverage report shown

# Run Storybook a11y tests
pnpm --filter @wfl/mobile storybook
# Each story can be tested for a11y issues

# Run E2E flows
maestro test .maestro/flows
# Execute critical user journeys

# Manual testing on device
# Follow checklist in PHASE_D_TESTING_STRATEGY.md
```

**Success Criteria**:
- ✅ Unit tests pass
- ✅ Component a11y tests pass
- ✅ E2E flows pass
- ✅ Manual QA checklist 100% done
- ✅ No critical bugs

### W10 (Design)
```bash
# Review Tamagui tokens
apps/mobile/tamagui.config.ts
# Verify colors, typography, spacing match design

# Check Storybook
pnpm --filter @wfl/mobile storybook
# Visual review of all 13 components

# Test dark mode
# Preferences → Theme → Dark
# All components should have correct colors

# Test animations
# Each component should animate smoothly
# With reduce-motion enabled, animations should be instant
```

**Success Criteria**:
- ✅ All tokens applied
- ✅ Dark mode works
- ✅ Component library consistent
- ✅ Animations smooth
- ✅ Brand guidelines followed

---

## Common Scenarios & Fixes

### Scenario 1: "pnpm install fails"
```bash
# Clear cache
pnpm store prune

# Retry
pnpm install --prefer-offline

# If still stuck
rm pnpm-lock.yaml
pnpm install --force
```

### Scenario 2: "TypeScript errors after git pull"
```bash
pnpm typecheck  # Show errors
# Edit files to fix type issues
pnpm typecheck  # Verify fixed
```

### Scenario 3: "Expo dev server won't start"
```bash
# Check if port 19000 is in use
lsof -i :19000  # (Mac/Linux)
netstat -ano | findstr :19000  # (Windows)

# Kill process
kill -9 <PID>  # (Mac/Linux)
taskkill /PID <PID> /F  # (Windows)

# Restart
pnpm --filter @wfl/mobile dev
```

### Scenario 4: "iOS simulator not working"
```bash
# Start simulator first
open -a Simulator

# Then press 'i' in Expo dev server
```

### Scenario 5: "Android emulator issues"
```bash
# List available AVDs
emulator -list-avds

# Start emulator
emulator -avd <AVD_NAME>

# Then press 'a' in Expo dev server
```

---

## Daily Standup Template (Days 28-36)

Share in team meetings:

```markdown
## Team [NAME] — Phase D Status

**Date**: [DATE]
**Day**: 28-36

### Completed Yesterday
- [ ] Local environment working
- [ ] [Feature 1] tested
- [ ] [Feature 2] validated
- [ ] [Test] passed

### In Progress Today
- [ ] [Task 1]
- [ ] [Task 2]
- [ ] Testing [Feature]

### Blockers
- [ ] Issue: [Description]
  - Impact: [What this blocks]
  - Resolution: [Plan to fix]
  - Escalation: [Who to notify]

### QA Sign-Off Checklist
- [ ] Feature works locally
- [ ] Tests pass (unit/integration/E2E)
- [ ] Accessibility verified
- [ ] Performance budget met
- [ ] No critical bugs
- [ ] Documentation updated
```

---

## Success = Phase D Sign-Off ✅

When **all teams** have completed:

- ✅ Local validation (all features work on device/simulator)
- ✅ Test suite passes (unit + component + E2E)
- ✅ Accessibility verified (VoiceOver/TalkBack)
- ✅ Performance budgets met (<3s cold start, <300ms transitions, ≥60fps scroll)
- ✅ Integration points verified (mobile ↔ backend ↔ sync)
- ✅ Zero critical bugs
- ✅ Documentation complete

**Then**: Proceed to Phase E (Days 36-39) → AWS deployment + Beta testing

---

## Resources

**Documentation**:
- `PHASE_C_STATUS_INTEGRATION.md` — Architecture + integration points
- `PHASE_D_TESTING_STRATEGY.md` — Full testing plan
- `BUILD_READY_SUMMARY.md` — What's ready, what's next
- `W6_PHASE_B_KICKOFF.md` — Dashboard scope + examples
- `W7_PHASE_B_KICKOFF.md` — Settings scope + examples
- `W8_PHASE_B_KICKOFF.md` — Sync scope + examples

**Code**:
- `apps/mobile/` — Mobile app source
- `infra/cdk/` — Infrastructure as code
- `services/` — Backend services
- `packages/shared/` — Shared types + utilities

**Chat / Issues**:
- Slack: #whatsforlunch-dev
- GitHub: github.com/argie33/whatsforlunch/issues
- Dashboard: [Project board](link-to-board)

---

## Go Build! 🚀

**You have everything you need.**

- ✅ Code is written
- ✅ Dependencies installed
- ✅ Documentation ready
- ✅ Tests scaffolded
- ✅ Local dev working

**Next 2 weeks**: Validate, test, fix, deploy.

**Target**: App Store / Play Store launch by May 6, 2026 ✅

**Let's ship this!** 🚀
