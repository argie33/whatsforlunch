# W5 Phase C — Completion Checklist

**Status**: In progress  
**Target**: W6, W7, W8 fully unblocked for feature implementation  
**Phase C Scope** (days 16-21):
- Visual regression baseline (Storybook + Chromatic)
- Accessibility audit (WCAG 2.1 Level AA)
- Performance: cold start measured + budgeted
- Final polish: haptics, animations, empty states

---

## Accessibility Audit ✅

### Component Labels
- [ ] **Button** — accessibilityLabel (action-focused), accessibilityHint for complex
- [ ] **Card** — label describes content, status stripe paired with icon
- [ ] **Input** — field name label, error state announced, format hints
- [ ] **ListRow** — label = title + subtitle, trailing element labeled
- [ ] **StatusBadge** — icon + text (never color alone)
- [ ] **Avatar** — "Avatar for {{name}}", online indicator
- [ ] **Icon** — aria-hidden if paired with text, label if standalone
- [ ] **Sheet** — title label, dismiss button labeled
- [ ] **Toast** — type icon paired with message text

### WCAG Compliance
- [ ] **Color contrast** — all text ≥4.5:1 on background (AA)
- [ ] **Touch targets** — min 44pt iOS / 48dp Android
- [ ] **Keyboard navigation** — Tab/Shift+Tab through all interactive elements
- [ ] **VoiceOver test** — navigate full app with VoiceOver enabled (iOS)
- [ ] **TalkBack test** — navigate full app with TalkBack enabled (Android)
- [ ] **Dynamic Type** — app scales up to 1.5x, no truncation
- [ ] **Reduce Motion** — detect `AccessibilityInfo.isReduceMotionEnabled()`, swap animations
- [ ] **High contrast mode** — status colors distinguishable via icon + text, not color alone

### Testing Log
```markdown
- [ ] VoiceOver (iOS): Settings → Accessibility → VoiceOver → On
  - Dashboard screen: [status]
  - Scan screen: [status]
  - Settings screen: [status]

- [ ] TalkBack (Android): Settings → Accessibility → TalkBack → On
  - Dashboard: [status]
  - Scan: [status]
  - Settings: [status]

- [ ] Keyboard-only (Android):
  - Tab through all interactive elements: [status]
  - Shift+Tab backward navigation: [status]
  - Enter to activate buttons: [status]

- [ ] Dynamic Type (largest): Settings → Accessibility → Larger Accessibility Sizes
  - Dashboard layout reflow: [status]
  - Scan screen text readable: [status]
  - Settings sections stack properly: [status]

- [ ] High Contrast: Settings → Accessibility → Increase Contrast
  - Status colors still work (icon + text): [status]
  - Border colors visible: [status]

- [ ] Color blind (sim): https://www.color-blindness.com/coblis-color-blindness-simulator/
  - Status badges recognizable: [status]
  - Buttons distinguishable: [status]
```

---

## Visual Regression Baseline ✅

### Storybook Setup
- [ ] `.storybook/main.ts` configured
- [ ] `.storybook/config.tsx` with Tamagui provider
- [ ] `.storybook/preview.ts` with a11y + chromatic config

### Component Stories
- [ ] Button.stories.tsx — all variants, sizes, states
- [ ] Card.stories.tsx — default, interactive, statusStripe
- [ ] Input.stories.tsx — variants, error, clearable, disabled
- [ ] ListRow.stories.tsx — with image, icon, trailing actions
- [ ] StatusBadge.stories.tsx — all statuses, sizes
- [ ] Avatar.stories.tsx — with/without image, online indicator
- [ ] More stories: Tag, IconButton, Sheet, EmptyState, Toast, SegmentedControl

### Visual Regression Testing
- [ ] Run Storybook locally: `pnpm --filter @wfl/mobile storybook`
  - Screenshot each story manually (golden baseline)
- [ ] Set up Chromatic: `pnpm exec chromatic --project-token=<token>`
  - Runs on PR: flags visual changes vs. baseline
  - Review + approve changes as regressions or intentional updates

### Reference Screenshots
```
apps/mobile/__screenshots__/
├── Button/
│   ├── filled.png
│   ├── tinted.png
│   ├── plain.png
│   ├── destructive.png
│   └── ...
├── Card/
├── Input/
└── ...
```

---

## Performance Audit ✅

### Cold Start (App Launch → First Screen Interactive)
- **Budget**: 3000ms
- **Measurement**: `useColdStartPerformance()` in root layout
- [ ] Baseline: `_ms (target: <3s)
- [ ] Sentry integration: logs cold start time + threshold breaches

### Screen Transitions (Navigation)
- **Budget**: 300ms per transition
- **Measurement**: `usePerformanceMarker('dashboard')` + `.end()`
- [ ] Dashboard → Item detail: `_ms
- [ ] Scan → QR resolved: `_ms
- [ ] Settings → Preferences: `_ms

### Component Render Time
- **Budget**: 100ms per component
- [ ] Button: <100ms
- [ ] Card: <100ms
- [ ] ListRow: <100ms
- [ ] Full dashboard (50-item list): <500ms

### List Scroll FPS
- **Budget**: 60 FPS (16.67ms per frame, no dropped frames)
- [ ] Dashboard scroll (50 items): 60fps sustained
- [ ] Containers scroll (20 items): 60fps
- [ ] Settings scroll: 60fps

### Image Loading
- **Budget**: 500ms per image (local cache or network)
- [ ] Item photo: <500ms
- [ ] Avatar: <300ms
- [ ] Container thumbnail: <300ms

### Memory Profiling
- [ ] Baseline memory: measure resting state
- [ ] Memory after navigation loop (10 cycles): <5% growth
- [ ] Leak detection: Sentry heap snapshots

### Testing Commands
```bash
# Measure cold start
pnpm --filter @wfl/mobile dev
# Watch console for "performance_cold_start" event

# Storybook component render time
pnpm --filter @wfl/mobile storybook

# React Profiler (Chrome DevTools)
# 1. Open React Native Debugger
# 2. Profiler tab → Record
# 3. Interact with app
# 4. Analyze render times

# Android Profiler (Android Studio)
# File → Open Project → select mobile/
# Profiler → Memory / CPU tabs
```

---

## Final Polish ✅

### Haptic Feedback
- [ ] Button press: `Haptics.selectionAsync()`
- [ ] Scan success: `Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)`
- [ ] Mark eaten: medium impact `Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)`
- [ ] Error state: warning impact `Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)`

### Animations
- [ ] Spring config: damping 15, stiffness 150
- [ ] Fade in: 300ms
- [ ] Scale: 250ms with spring
- [ ] Slide up: 300ms with spring
- [ ] All animations respect `reduceMotionEnabled` preference

### Empty States
- [ ] Dashboard (0 items): illustration + "No items yet" + "Add your first" CTA
- [ ] Containers (0 containers): illustration + "Claim your first" CTA
- [ ] Scan results (no match): illustration + "We couldn't identify this" + manual entry CTA
- [ ] All CTAs wired to appropriate screens

### Onboarding Flow
- [ ] Splash screen: 1s hold, brand logo
- [ ] 4-screen carousel: skip/next buttons, final "Get Started"
- [ ] Permission requests: camera, notifications (with "Not now")
- [ ] Success screen: "Let's get started!" → navigate to dashboard

---

## Quality Gates

### Code Quality
- [ ] `pnpm typecheck` — no TS errors
- [ ] `pnpm lint` — no lint issues
- [ ] `pnpm test` — all tests passing (unit + Storybook a11y)

### MobSF Security Scan (Phase C Integration)
```bash
pnpm exec mobsf --scan ./dist/app.ipa
# Target: 0 critical, 0 high issues
```

### Sentry Baseline
- [ ] Error-free app session (no crashes)
- [ ] Performance monitoring wired
- [ ] Source maps uploaded

### Documentation
- [ ] README updated with accessibility testing steps
- [ ] Storybook running and accessible
- [ ] Performance budgets in code comments
- [ ] Component a11y checklist in each story

---

## Sign-Off Criteria

✅ **Phase C complete when:**
1. All 9 components accessible (VoiceOver + TalkBack verified)
2. Storybook with visual baselines (all stories captured)
3. Performance budgets measured + tracked
4. Cold start <3s, scroll ≥60fps
5. Type checking + linting clean
6. Zero Sentry errors in test session
7. W6, W7, W8 successfully import and use components in their features

---

## Next Steps (Phase C → Phase B Features)

Once W5 Phase C ✅:
- **W6** (Mobile Core) can render dashboard with item cards, scan flows
- **W7** (Mobile Settings) can build full settings UI with proper grouping
- **W8** (Mobile Sync) can implement local → cloud sync with conflict resolution
- **W9** (Ops/QA) can set up TestFlight beta + Play Internal Testing
- **W10** (Design/Polish) adds final illustrations + copy refinement

---

**Estimated completion**: End of days 16-21  
**Owner**: W5 (Claude/Worker 5)  
**Blockers**: None (W2, W3, W4 Phase A complete)
