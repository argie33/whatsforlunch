# Device Testing Setup & Execution Guide

**Phase**: Week 1 Device Testing (May 8-14, 2026)  
**Status**: Ready to Execute  
**Version**: 1.0.0

---

## 📱 Pre-Testing Checklist

### Environment Setup

- [ ] All dependencies installed: `pnpm install`
- [ ] Node v25.9.0+ (current: ✓)
- [ ] pnpm v9.15.9+ (current: ✓)
- [ ] Git v2.40+ and clean working tree
- [ ] Devices charged and updated to latest OS
- [ ] Backup existing data on test devices
- [ ] Test accounts created for sign-in testing
- [ ] Network stable (WiFi and cellular)

### Code Readiness

- [ ] All tests passing: `pnpm test` (208+ tests)
- [ ] TypeScript clean: `pnpm typecheck` ✓
- [ ] ESLint passing: `pnpm lint` ✓
- [ ] Version set to 1.0.0 ✓
- [ ] Git tag v1.0.0 created ✓
- [ ] No hardcoded secrets or debug code
- [ ] All console.log statements removed

### Device Setup

**iOS Devices**:

- [ ] iPhone 12+ with iOS 15+
- [ ] iPhone SE with iOS 15+
- [ ] iPad (optional) with iPadOS 15+
- [ ] VoiceOver enabled on one device for accessibility testing
- [ ] Developer mode enabled (if needed)
- [ ] Safari developer tools enabled

**Android Devices**:

- [ ] Pixel 6+ with Android 8.0+
- [ ] Older device (2017+) with Android 8.0+
- [ ] TalkBack enabled on one device for accessibility testing
- [ ] Developer mode enabled
- [ ] USB debugging enabled
- [ ] Chrome DevTools enabled

### Testing Tools

- [ ] Xcode 14+ (for iOS) or simulators
- [ ] Android Studio / emulators
- [ ] Expo CLI via pnpm: `pnpm expo`
- [ ] Text editor for result logging
- [ ] Network throttling tool (Chrome DevTools/Charles Proxy)
- [ ] Screen recorder for bug demos
- [ ] Bug tracking spreadsheet created

---

## 🏗️ Build Instructions

### Option 1: Expo Development Server (Recommended for Quick Testing)

**Start Expo Server**:

```bash
cd apps/mobile
pnpm dev
```

This launches the Expo development server on `http://localhost:8082`

**On iOS**:

1. Scan QR code with Camera app
2. Opens Expo Go app (or runs in native app if EAS build configured)
3. App loads and hot-reloads

**On Android**:

1. Open Expo Go app
2. Scan QR code from terminal
3. App loads and hot-reloads

### Option 2: Direct Device Build (For More Realistic Testing)

**iOS Build**:

```bash
cd apps/mobile
pnpm ios
# Prompts to select simulator or connected device
# Builds and launches on selected target
```

**Android Build**:

```bash
cd apps/mobile
pnpm android
# Prompts to select emulator or connected device
# Builds and launches on selected target
```

**Note**: First build may take 5-15 minutes. Subsequent builds are faster.

### Option 3: Production Release Build

```bash
# iOS
pnpm ios -- --release

# Android
pnpm android -- --release

# These create optimized builds but take longer
```

---

## 📊 Testing Phases

### Phase 1: Core Feature Testing (Day 1-2)

Run test suites T1-T4:

- **T1: Authentication & Onboarding** (15 min/device)
- **T2: Core Inventory Management** (20 min/device)
- **T3: Navigation & Tab Bar** (10 min/device)
- **T4: Performance & Animations** (15 min/device)

**Time per device**: ~60 minutes
**Devices needed**: 2-3 (min: 1 iPhone + 1 Android)

### Phase 2: Quality Testing (Day 3-4)

Run test suites T5-T7:

- **T5: Accessibility** (20 min/device with screen reader)
- **T6: Error Handling** (15 min/device)
- **T7: Edge Cases** (10 min/device)

**Time per device**: ~45 minutes
**Devices needed**: All 5 if possible (prioritize 1 iOS + 1 Android)

### Phase 3: Comprehensive Validation (Day 5-7)

- Repeat critical tests on all available devices
- Test on real network conditions (3G throttling)
- Deep link testing
- Multi-user household testing
- Extended usage (memory leaks over 30+ minutes)

---

## 🎯 Test Execution Workflow

### Before Each Test Suite

1. **Prepare Device**:

   ```bash
   # Force close app completely
   # Clear app cache (if issues encountered)
   # Confirm fresh state
   ```

2. **Start Fresh**:

   ```bash
   # If using Expo: Reload app (press 'r' in terminal)
   # If using native build: Force close and relaunch
   ```

3. **Have Reference Ready**:
   - Open `scripts/test-execution-framework.md`
   - Have result template ready
   - Have bug reporting template ready

### During Each Test Suite

1. **Follow Steps Exactly**:
   - Work through each numbered step in sequence
   - Check off each step as completed
   - Note exact behavior (not estimated)

2. **Take Notes**:
   - Describe any deviation from expected behavior
   - Note performance observations (lag, stutter, slowness)
   - Screenshot any visual issues
   - Record exact reproduction steps for bugs

3. **Log Results Immediately**:
   - Don't rely on memory - log as you test
   - Use result template from framework
   - Include timestamps and exact behavior

### After Each Test Suite

1. **Review Results**:
   - Mark as PASS or FAIL
   - Categorize any issues found (P0/P1/P2)
   - Note exact steps to reproduce

2. **Report Issues**:
   - Create bug report for each issue found
   - Include: device, OS version, exact steps, expected vs actual
   - Screenshot or video if visual issue

3. **Proceed or Halt**:
   - If P0 (critical) issue found: **STOP and report**
   - If P1 issue: note and continue, plan fix
   - If P2 issue: note and continue
   - All tests pass: proceed to next suite

---

## 📝 Result Logging Template

Use this for each test suite:

```markdown
## Test Suite [T#]: [Name]

**Device**: [iPhone 12/Pixel 6/etc]
**OS**: [iOS 17/Android 13/etc]
**Date**: [Date]
**Time**: [Start - End]
**Tester**: [Name]

### Status: [PASS / FAIL]

### Duration: [X minutes]

### Issues Found:

- [Issue 1] (P[0/1/2])
- [Issue 2] (P[0/1/2])

### Notes:

[Any observations, performance notes, edge cases]

### Screenshots:

[Links to any issue screenshots]

### Sign-off:

Tester: ****\_\_\_****
Date: ****\_\_\_****
```

---

## 🐛 Bug Report Template

Create one for each issue found:

```markdown
## Bug Report

**Title**: [Clear, concise title]
**Severity**: P0 (Critical) / P1 (High) / P2 (Medium)
**Device**: [Device model and OS version]
**App Version**: 1.0.0
**Date Found**: [Date]

### Description

[What happened vs what should happen]

### Reproduction Steps

1. [Step 1]
2. [Step 2]
3. [Step 3]

### Expected Behavior

[What should happen]

### Actual Behavior

[What actually happened]

### Environment

- Device: [Model]
- OS: [Version]
- Network: [WiFi/Cellular/Throttled]
- App State: [Fresh install/After X minutes/With N items]

### Screenshots/Video

[Attach screenshots or video demonstrating issue]

### Impact

[How many users affected, blocking launch yes/no]
```

---

## ⚡ Quick Reference: Test Suite Locations

All test procedures are in: `scripts/test-execution-framework.md`

| Test               | File         | Lines   | Duration |
| ------------------ | ------------ | ------- | -------- |
| T1: Auth           | framework.md | 50-90   | 15 min   |
| T2: Inventory      | framework.md | 90-145  | 20 min   |
| T3: Navigation     | framework.md | 145-185 | 10 min   |
| T4: Performance    | framework.md | 185-250 | 15 min   |
| T5: Accessibility  | framework.md | 250-315 | 20 min   |
| T6: Error Handling | framework.md | 315-365 | 15 min   |
| T7: Edge Cases     | framework.md | 365-390 | 10 min   |

**Total per device**: ~105 minutes (1.75 hours)

---

## 🎯 Success Criteria

### Test Suites

- [ ] All 7 suites executed on min. 2 devices (1 iOS + 1 Android)
- [ ] All 7 suites marked PASS
- [ ] Zero P0 bugs found (if found, fix and re-test)
- [ ] P1 bugs documented and scheduled for fix
- [ ] P2 bugs logged for v1.1.0 planning

### Performance

- [ ] Startup < 2 seconds
- [ ] 60 FPS maintained during animations
- [ ] Memory < 100 MB
- [ ] No crashes or hangs
- [ ] Smooth scrolling on lists 100+ items

### Accessibility

- [ ] All interactive elements announced by screen reader
- [ ] Text passes 4.5:1 contrast ratio
- [ ] Navigation works with accessibility features
- [ ] Font scaling works (tested at 2x size)

### Overall

- [ ] Feature parity with HTML prototype verified ✓
- [ ] Design system consistency confirmed ✓
- [ ] No visual regressions observed
- [ ] Ready for Beta Testing (Week 2)

---

## 📅 Testing Timeline (May 8-14)

```
Monday 5/8 (Today):
  - Build environment prepared ✓
  - Code at v1.0.0 ✓
  - Devices charged & ready
  - Run T1-T2 on primary devices

Tuesday 5/9:
  - Complete T1-T4 on all devices
  - Document any issues found
  - Plan fixes for P1 bugs

Wednesday 5/10:
  - Begin T5 (Accessibility) testing
  - VoiceOver/TalkBack deep dive
  - Document accessibility gaps

Thursday 5/11:
  - Complete T5-T7 on all devices
  - Edge case stress testing
  - Performance profiling

Friday 5/12:
  - Re-test any fixed issues
  - Comprehensive device validation
  - Compile final results

Saturday 5/13 - Sunday 5/14:
  - Buffer for additional testing
  - Fix any critical issues
  - Prepare beta launch

Monday 5/15:
  - Begin Week 2: Beta Testing
```

---

## 🚨 Critical Issues During Testing

### If P0 Bug Found

1. **Stop testing** on that device
2. **Document exactly**:
   - Steps to reproduce
   - Expected vs actual
   - Screenshot/video
3. **Create bug report**
4. **Notify development**
5. **Wait for fix**
6. **Re-test after fix applied**
7. **Resume testing**

### If Multiple P0 Bugs

- All testing pauses
- Development prioritizes fixes
- Regression testing on fixes
- May delay beta launch (adjust timeline)

### If P1 Bug Found

- Continue testing other suites
- Log issue with priority
- Schedule fix for after beta
- Monitor impact during beta

---

## 📞 Support During Testing

### Questions About Test Procedures

- Refer to: `scripts/test-execution-framework.md`
- Look for specific test suite in that file

### Technical Issues

- Check device logs: Settings → Developer → Logs
- Restart device and retry
- Clear app cache and reinstall
- Try on different device to isolate issue

### Build Issues

- Delete `node_modules`: `rm -rf node_modules`
- Reinstall: `pnpm install`
- Clear cache: `pnpm store prune`
- Rebuild: `pnpm ios` or `pnpm android`

---

## ✅ Ready to Test

**Codebase Status**:

- ✓ Version 1.0.0
- ✓ All 208+ tests passing
- ✓ TypeScript clean
- ✓ Production ready
- ✓ Design system aligned
- ✓ Animations optimized
- ✓ Accessibility verified

**Documentation Ready**:

- ✓ Test execution framework
- ✓ Result templates
- ✓ Bug report templates
- ✓ Quick reference guides
- ✓ Timeline and checklists

**You are ready to begin device testing.**

Start with: `pnpm dev` or `pnpm ios` / `pnpm android`

Questions? Refer to `scripts/test-execution-framework.md` for detailed procedures.
