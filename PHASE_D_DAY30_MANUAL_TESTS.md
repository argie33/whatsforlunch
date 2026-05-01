# Phase D Day 30-31 Manual Test Validation

**Date:** 2026-05-01 (Day 30)  
**Objective:** Validate Phase C features on native emulator  
**Platform:** iOS Simulator (macOS) / Android Emulator  
**Test Duration:** 30-45 minutes

---

## ✅ Jest Baseline (Completed Day 30 Morning)

```
Test Suites: 17 passed, 17 total
Tests:       208 passed, 208 total
Coverage:    65% (Overall), 93% (Database), 80%+ (Services)
```

**Coverage Breakdown:**
- ✅ Database layer: 93% (sync, conflict resolution, queue)
- ✅ Item utilities: 100% (item status, days remaining calculations)
- ✅ Containers service: 85% (container management)
- ✅ Households service: 100% (team management)
- ✅ Profile service: 93% (user profile)
- ✅ Auth service: 45% (AWS integration paths not fully mocked - expected)
- ✅ Sync service: 0% (integration tested via e2e, not unit level)

---

## 📱 Manual Test Checklist — Native Emulator

### Pre-Test Setup
- [ ] iOS Simulator running (or Android Emulator)
- [ ] App installed and ready
- [ ] No console errors visible
- [ ] Internet connection available

### Test 1: Sign-In Flow (5 min)

**Path:** App Start → Auth Screen → Sign-In

**Steps:**
1. [ ] Launch app
   - Expected: Splash screen → White screen → Auth screen
   - No errors in console
   - Loading state if fetching

2. [ ] Verify auth screen layout
   - [ ] Email input visible
   - [ ] "Sign in" button visible
   - [ ] "Development bypass" link at bottom
   - [ ] No console errors

3. [ ] Use dev bypass
   - [ ] Tap "Development bypass"
   - [ ] See email input with focus
   - [ ] Enter: `dev@local.test`
   - [ ] Tap "Sign in"

4. [ ] Verify navigation to dashboard
   - [ ] Navigation succeeds (no crash)
   - [ ] Dashboard screen loads
   - [ ] No authentication errors

**Pass Criteria:** ✅ All steps succeed without crashes/errors

---

### Test 2: Dashboard Screen (5 min)

**Path:** Auth Success → Dashboard

**Steps:**
1. [ ] Verify dashboard layout
   - [ ] Bottom tab bar visible (Dashboard, Scan, Containers, Settings)
   - [ ] Current tab: Dashboard
   - [ ] Header: "Dashboard" or "My Items"
   - [ ] Floating Action Button (FAB) in bottom right

2. [ ] Verify empty state
   - [ ] If no items: "No items yet" or similar message
   - [ ] If items exist: List displays items
   - [ ] Each item shows name, status, days remaining

3. [ ] Check list rendering
   - [ ] Items display correctly
   - [ ] Status badge/emoji shows (🟢 Fresh, 🟡 Expiring, 🔴 Expired, etc.)
   - [ ] Days remaining calculation shows (e.g., "5 days left")
   - [ ] No rendering errors or flickers

4. [ ] Verify navigation tabs
   - [ ] All tabs tappable (Dashboard, Scan, Containers, Settings)
   - [ ] Switching tabs works smoothly
   - [ ] Dashboard tab is highlighted when active

**Pass Criteria:** ✅ All UI elements visible, no crashes, smooth navigation

---

### Test 3: Create Item (10 min)

**Path:** Dashboard → FAB → Create Item Form → Save

**Steps:**
1. [ ] Tap Floating Action Button (FAB)
   - [ ] Create item form opens (bottom sheet or modal)
   - [ ] Form fields visible
   - [ ] Keyboard may appear (expected)

2. [ ] Fill in item details
   - [ ] Food name input: Enter "Apple"
   - [ ] Expiry date: Set to tomorrow
   - [ ] Location (optional): Leave blank or enter "Fridge"
   - [ ] Notes (optional): Leave blank

3. [ ] Submit form
   - [ ] Tap "Save" button
   - [ ] Form closes (expected)
   - [ ] No validation errors

4. [ ] Verify item appears in list
   - [ ] Return to dashboard (form should close)
   - [ ] "Apple" item visible in list
   - [ ] Status shows 🟢 (Fresh)
   - [ ] Days left shows 1 (tomorrow)
   - [ ] Item is selectable (can tap to view details)

**Pass Criteria:** ✅ Item created and appears in list with correct data

---

### Test 4: Edit Item (5 min)

**Path:** Dashboard → Item Detail → Edit

**Steps:**
1. [ ] Tap the "Apple" item created in Test 3
   - [ ] Item detail screen opens
   - [ ] Shows: Name, Status, Expiry date, Created date
   - [ ] Edit button visible

2. [ ] Tap Edit button
   - [ ] Edit form opens with existing data
   - [ ] All fields prefilled

3. [ ] Change item details
   - [ ] Change name: "Apple" → "Apple (Red)"
   - [ ] Keep expiry same
   - [ ] Tap "Save"

4. [ ] Verify changes
   - [ ] Return to dashboard
   - [ ] Item name updated to "Apple (Red)"
   - [ ] Status/expiry unchanged

**Pass Criteria:** ✅ Edit succeeds, changes persist in list view

---

### Test 5: Delete Item (5 min)

**Path:** Item Detail → Delete Option

**Steps:**
1. [ ] Tap the "Apple (Red)" item again
   - [ ] Detail screen opens

2. [ ] Find delete option
   - [ ] Scroll to see "Delete" button (usually bottom)
   - [ ] Tap "Delete"

3. [ ] Confirm deletion
   - [ ] Confirmation dialog appears
   - [ ] Tap "Delete" to confirm

4. [ ] Verify deletion
   - [ ] Item disappears from list
   - [ ] Return to empty state if no other items
   - [ ] No crashes

**Pass Criteria:** ✅ Item deleted without errors

---

### Test 6: Offline Behavior (5 min)

**Path:** Settings → Connection Toggle OR System Settings

**Steps:**
1. [ ] Enable offline mode (simulator setting)
   - [ ] iOS: Settings → Disable WiFi/Cellular
   - [ ] Android: Airplane mode or disable connectivity

2. [ ] Try to create another item
   - [ ] Form opens normally
   - [ ] Can fill and save form
   - [ ] Expected: Succeeds (offline-first sync)

3. [ ] Re-enable internet
   - [ ] App syncs automatically
   - [ ] Item should persist
   - [ ] No error messages

4. [ ] Check sync status
   - [ ] Optional: Check Settings for sync status
   - [ ] Should show "In sync" or similar

**Pass Criteria:** ✅ Offline create succeeds, sync happens on reconnect

---

### Test 7: Settings Navigation (3 min)

**Path:** Dashboard → Settings Tab

**Steps:**
1. [ ] Tap Settings tab (bottom right)
   - [ ] Settings screen loads
   - [ ] Multiple setting options visible

2. [ ] Verify setting groups
   - [ ] Account settings visible
   - [ ] Notification settings visible
   - [ ] Preferences visible
   - [ ] All sections are tappable

3. [ ] Check no crashes
   - [ ] Scroll through settings
   - [ ] Tap a few settings
   - [ ] No crashes or errors

**Pass Criteria:** ✅ Settings navigate and display correctly

---

### Test 8: Error Handling (3 min)

**Path:** Any screen → Trigger error scenario

**Steps:**
1. [ ] Create scenario that might cause error
   - [ ] Try to create item with empty name (should be rejected)
   - [ ] Expected: Validation error or toast

2. [ ] Verify error message
   - [ ] Clear, user-friendly error shown
   - [ ] No technical stack traces
   - [ ] Can dismiss/retry

3. [ ] Verify app recovery
   - [ ] Can continue using app after error
   - [ ] No hung state

**Pass Criteria:** ✅ Error handling works, app recovers gracefully

---

## 📊 Overall Test Summary

| Test | Status | Notes |
|------|--------|-------|
| Sign-In Flow | [ ] | |
| Dashboard Screen | [ ] | |
| Create Item | [ ] | |
| Edit Item | [ ] | |
| Delete Item | [ ] | |
| Offline Behavior | [ ] | |
| Settings Navigation | [ ] | |
| Error Handling | [ ] | |

---

## 🎯 Success Criteria

**Phase D Days 30-31 is PASS if:**
1. ✅ All 8 manual tests pass without crashes
2. ✅ All 208 Jest tests remain passing
3. ✅ No critical bugs found
4. ✅ App is responsive and smooth
5. ✅ Navigation flows work correctly

**If any test fails:**
- [ ] Document exact reproduction steps
- [ ] Note error message (if any)
- [ ] Check Jest coverage for that feature
- [ ] Create GitHub issue or task for fix

---

## 🔧 Troubleshooting

### App won't start
```bash
pnpm ios  # Full rebuild and install

# Or manually in Xcode:
# Product → Clean Build Folder → Build → Run
```

### Sign-in fails
```
Expected: Dev bypass works
If failed: Check EXPO_PUBLIC_AUTH_MODE in .env.local
Should be: "development" or "local"
```

### Items don't persist
```
Expected: Items saved to WatermelonDB
If failed: Check console for database errors
May need to reset database: Clear app data in simulator
```

### Emulator too slow
```
Reduce: Background apps
Increase: Simulator CPU allocation
Or: Test on Android if iOS slow
```

---

## 📝 Test Log

**Tester:** [Your Name]  
**Date:** 2026-05-01  
**Platform:** iOS Simulator / Android Emulator  
**Start Time:** [XX:XX]  
**End Time:** [XX:XX]

### Test Results:
[Update as tests complete]

### Issues Found:
- [ ] None
- [x] [List any issues found]

### Recommendations:
- [Next steps if issues found]

---

**Next Phase:** If all tests pass:
- Days 32-33: Backend integration testing
- Days 34-35: Performance & accessibility audit
- Day 36: QA sign-off and merge to main

**Status at Day 31 EOD:** Target = All 8 tests passing ✅
