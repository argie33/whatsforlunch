# Phase D Test Execution Tracker

**Phase**: Phase D (Days 28-39) — Integration Testing  
**Current Date**: April 28, 2026 (Day 28)  
**Status**: 🟢 KICKOFF COMPLETE

---

## Team Progress Dashboard

### Day 28 — Local Validation ✓

| Team | Owner | Status | Tests | Issues | ETA |
|------|-------|--------|-------|--------|-----|
| W1 (Infra) | W1 Lead | 🟡 In Progress | Health/GraphQL | TBD | Today |
| W2 (Backend) | W2 Lead | 🟡 In Progress | Resolvers/Lambdas | TBD | Today |
| W3 (Auth) | W3 Lead | 🟡 In Progress | Sign-in flow | TBD | Today |
| W4 (AI/ML) | W4 Lead | 🟡 In Progress | Lambda calls | TBD | Today |
| W5 (Mobile) | W5 Lead | 🟡 In Progress | Components | TBD | Today |
| W6 (Dashboard) | W6 Lead | 🟡 In Progress | Items list | TBD | Today |
| W7 (Settings) | W7 Lead | 🟡 In Progress | All sections | TBD | Today |
| W8 (Sync) | W8 Lead | 🟡 In Progress | Pull/push/offline | TBD | Today |
| W9 (QA) | QA Lead | 🟡 In Progress | Test framework | TBD | Today |
| W10 (Design) | Design Lead | 🟡 In Progress | Design tokens | TBD | Today |

---

## Days 28-31 — Detailed Test Plan

### Day 28 (Local Validation)

#### W1 — Infrastructure
```bash
# Health check
curl http://localhost:3001/health
# Expected: { "status": "ok" }

# GraphQL endpoint
curl -X POST http://localhost:3001/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ __schema { types { name } } }"}'
# Expected: List of GraphQL types

# Offline mode
# 1. Disable network (airplane mode)
# 2. Verify app continues working with local data
```

**Success Criteria:**
- [ ] Health endpoint responds 200
- [ ] GraphQL schema query succeeds
- [ ] Offline mode works (local data persists)
- [ ] All 10 teams can reach local API

---

#### W2 — Backend
```bash
# Verify resolvers
pnpm --filter @wfl/backend typecheck
# Expected: 0 errors

# Verify Lambdas exist
ls infra/cdk/lib/appsync/lambdas/
# Expected: delete-account-handler.js, notify-expiring-handler.js, food-rules-publish-handler.js

# CDK synthesis
pnpm --filter @wfl/infrastructure run "cdk synth" 2>&1 | head
# Expected: CloudFormation template
```

**Success Criteria:**
- [ ] All 56 resolvers compile
- [ ] 3 Lambda functions present and accessible
- [ ] CDK synth succeeds
- [ ] Step Functions defined

---

#### W3 — Auth
```bash
# Start dev server
pnpm --filter @wfl/mobile dev

# In Expo
# Press 'w' (web), 'i' (iOS), or 'a' (Android)

# Verify sign-in screen:
# - Magic link input visible
# - Apple Sign-In button visible
# - Google Sign-In button visible
# - Dev bypass button visible

# Test dev bypass:
# Enter: dev@local.test
# Expected: Navigate to dashboard
```

**Success Criteria:**
- [ ] All 3 auth methods visible
- [ ] Dev bypass works in local mode
- [ ] Sign-in navigates to dashboard
- [ ] Session persists across app restart

---

#### W4 — AI/ML
```bash
# Test Lambda callability
# Via mobile app > Scan screen > Photo mode

# Expected responses (mock):
# - Food classification: { foodType: "...", confidence: 0.95 }
# - Date extraction: { date: "2026-05-15" }

# Error handling:
# - Service returns error
# - App shows "Manual entry" fallback
# - User can continue
```

**Success Criteria:**
- [ ] Lambda functions deployable
- [ ] Mock responses working
- [ ] Service layer calls correct endpoints
- [ ] Error handling works (fallback to manual)

---

#### W5 — Mobile Foundation
```bash
# Start Storybook
pnpm --filter @wfl/mobile storybook

# Verify in Storybook:
# - 13 components present
# - 50+ stories render
# - Each story has accessibility labels
# - Reduce-motion is respected

# Check components:
# Button, Card, Input, ListRow, StatusBadge, Avatar, Icon,
# Sheet, Toast, Tag, SegmentedControl, IconButton, EmptyState
```

**Success Criteria:**
- [ ] 13/13 components have stories
- [ ] 50+ stories render without errors
- [ ] All stories have accessibility labels
- [ ] Reduce-motion support verified
- [ ] Render performance <100ms

---

#### W6 — Dashboard
```bash
# Start dev server
pnpm --filter @wfl/mobile dev

# Navigate to Dashboard (first tab)
# Verify:
# - Item list visible (or empty state)
# - Storage filters present (all/fridge/freezer/pantry)
# - Search bar functional
# - FAB button to add item

# Test interactions:
# - Add item (tap FAB, fill form, submit)
# - Item appears in list
# - Swipe right -> "Mark Eaten"
# - Swipe left -> "Mark Tossed"
# - Tap item -> Detail screen
# - Pull-to-refresh -> sync indicator
```

**Success Criteria:**
- [ ] Items list renders
- [ ] Filters work correctly
- [ ] Search functional
- [ ] Add item form works
- [ ] Swipe actions work
- [ ] Navigation works
- [ ] Pull-to-refresh works

---

#### W7 — Settings
```bash
# Navigate to Settings (4th tab)
# Verify all 8 sections:
# - Profile (name, email, photo, timezone)
# - Households (members, invite)
# - Notifications (toggles, schedule)
# - Preferences (theme, language, diet)
# - Privacy (data export, analytics)
# - Help & Support
# - Account (sign out, delete)
# - About/Legal

# Test theme toggle:
# Preferences -> Theme -> Dark
# Verify: App switches to dark mode immediately

# Test language change:
# Preferences -> Language -> Español
# Verify: All UI text updates immediately
```

**Success Criteria:**
- [ ] All 8 sections visible
- [ ] All toggles work
- [ ] Theme persists across restart
- [ ] Language persists across restart
- [ ] Form validation works
- [ ] Sign out clears session

---

#### W8 — Sync
```bash
# Add an item
# Verify: Item appears in list, sync status shows "syncing"

# Disable network (airplane mode)
# Add another item
# Verify:
# - Item appears locally
# - Sync status shows "offline"
# - Item queued for sync

# Re-enable network
# Verify:
# - Sync status "syncing" -> "synced"
# - Both items now marked synced
# - WatermelonDB metadata updated
```

**Success Criteria:**
- [ ] Pull-to-refresh works
- [ ] Auto-sync on reconnect
- [ ] Offline queue persists
- [ ] Conflict detection works
- [ ] Sync status UI updates
- [ ] No data loss

---

#### W9 — QA/Testing
```bash
# Run unit tests
pnpm test
# Expected: Tests run, coverage report shown

# Check Storybook a11y
pnpm --filter @wfl/mobile storybook
# Expected: Stories run, a11y tests available

# Verify E2E flows
maestro test .maestro/flows
# Expected: Critical user journeys execute
```

**Success Criteria:**
- [ ] Unit tests pass locally
- [ ] Component a11y tests pass
- [ ] E2E flows execute
- [ ] Manual QA checklist prepared
- [ ] No critical bugs

---

#### W10 — Design
```bash
# Review Tamagui tokens
apps/mobile/tamagui.config.ts
# Verify colors, typography, spacing

# Check Storybook components
pnpm --filter @wfl/mobile storybook
# Visual review of all 13 components

# Test dark mode
# Preferences -> Theme -> Dark
# Verify: All components have correct colors
```

**Success Criteria:**
- [ ] All tokens applied correctly
- [ ] Dark mode works for all components
- [ ] Component library consistent
- [ ] Animations smooth
- [ ] Brand guidelines followed

---

## Days 29-31 — Unit/Component Tests

Each team runs:
```bash
pnpm test --coverage
```

Targets:
- Unit tests: >80% coverage
- Component stories: All visible + a11y pass
- E2E critical flows: 5/5 passing

---

## Days 32-35 — Deep Testing

### Performance Profiling
- Cold start: Target <3s (profile with dev tools)
- Screen transitions: Target <300ms (measure with Reanimated)
- Memory usage: Target <150MB (profile on device)

### Accessibility Validation
- VoiceOver (iOS): Navigation, labels, gestures
- TalkBack (Android): Navigation, labels, gestures
- WCAG 2.1 Level AA: Verify all components

---

## Day 36 — Sign-Off

Final checklist:
- [ ] All features work locally
- [ ] All tests pass
- [ ] All performance budgets met
- [ ] Zero critical bugs
- [ ] All documentation updated
- [ ] All teams sign off

---

## Days 37-39 — AWS Deployment

- [ ] CDK stack deployment successful
- [ ] TestFlight + Play Store internal testing
- [ ] Beta feedback collection
- [ ] Critical bugs from beta fixed

---

## Critical Issues Log

| Issue | Team | Status | Owner | ETA |
|-------|------|--------|-------|-----|
| (none yet) | — | — | — | — |

---

## Team Communication

### Daily Standup (9:30 AM PT)
**Template:**
```markdown
## Team [NAME] — Day [NUMBER]

**Completed**:
- [ ] [Task 1]
- [ ] [Task 2]

**In Progress**:
- [ ] [Task 1]

**Blockers**:
- [Issue] — Impact: [what's blocked] — Resolution: [plan]

**ETA**: [Next milestone]
```

### Escalation
- **Blocking issue**: Slack @eng-lead
- **Architecture question**: Comment on GitHub
- **Need AWS help**: Check docs/DEPLOYMENT_GUIDE_AWS.md

---

## Resources

- **Quick Start**: PHASE_D_START_HERE.md
- **Testing Plan**: PHASE_D_TESTING_STRATEGY.md
- **Build Ready**: BUILD_READY_SUMMARY.md
- **Team Guides**: W6/W7/W8_PHASE_B_KICKOFF.md
- **Infrastructure**: docs/DEPLOYMENT_GUIDE_AWS.md

---

**Updated**: April 28, 2026  
**Next Update**: End of Day 28  
**Phase D Sign-Off Target**: Day 36 (May 4, 2026)
