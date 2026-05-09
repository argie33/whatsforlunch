# Device Testing Execution Framework

**Version**: 1.0.0  
**Purpose**: Systematic framework for running production validation tests  
**Target**: Run all 7 test suites on real devices (iOS + Android)

---

## 📱 Test Environment Setup

### Required Devices

- **iPhone** (iOS 15+): iPhone 12 or newer
- **iPhone SE** (iOS 15+): Older device for compatibility
- **iPad** (iOS 15+, optional): Tablet screen testing
- **Android** (8.0+): Pixel 6 or similar
- **Android** (8.0+): Older device (2017+)

### Required Tools

- Xcode 14+ (for iOS testing)
- Android Studio (for Android testing)
- Expo CLI (`npm install -g expo-cli`)
- Git
- Text editor for logging results
- Network throttling tool (Chrome DevTools or Charles Proxy)

### Pre-Test Setup

```bash
# 1. Clone/pull latest code
git pull origin main

# 2. Install dependencies
pnpm install

# 3. Verify code is ready
pnpm typecheck
pnpm test

# 4. Build for testing
pnpm ios          # iOS build
pnpm android      # Android build
# OR for Expo:
pnpm dev          # Expo server
```

---

## 🎯 Test Suite Execution

### Suite T1: Authentication & Onboarding

**Duration**: 15 minutes per device  
**Devices**: All (iOS + Android)  
**Precondition**: Fresh app install

**Steps**:

```
1. [ ] Launch app - see onboarding screen
2. [ ] Tap "Sign Up"
3. [ ] Enter new email (test_001@example.com)
4. [ ] Verify email validation error for invalid email
5. [ ] Enter valid email, password, confirm
6. [ ] Review password requirements displayed
7. [ ] Tap "Create Household"
8. [ ] Enter household name
9. [ ] Complete setup - redirects to dashboard
10. [ ] Close app completely (swipe away)
11. [ ] Reopen app - should show dashboard (session persisted)
12. [ ] Tap settings, then "Sign Out"
13. [ ] Confirm sign out
14. [ ] Should return to login screen
15. [ ] Tap "Sign In"
16. [ ] Use previously created account to sign in
17. [ ] Should redirect to dashboard
18. [ ] Tap "Forgot Password"
19. [ ] Enter email, tap "Send Reset Email"
20. [ ] Check email client (note: using test email)
21. [ ] Log result as PASS/FAIL
```

**Result Template**:

```
Device: [iPhone 12/iPhone SE/Pixel 6/etc]
iOS/Android Version: [15.0/12/etc]
Test Suite: T1 - Authentication
Duration: [X minutes]
Result: [PASS/FAIL]
Issues Found: [List any issues]
```

---

### Suite T2: Core Inventory Management

**Duration**: 20 minutes per device  
**Devices**: All  
**Precondition**: Signed in, empty inventory

**Steps**:

```
1. [ ] Navigate to Inventory tab
2. [ ] See "No items yet" empty state
3. [ ] Tap "+" FAB to add item
4. [ ] Enter item name: "Milk"
5. [ ] Select category: "Dairy"
6. [ ] Select location: "Fridge"
7. [ ] Set expiry date: +7 days
8. [ ] Tap "Add" or "Save"
9. [ ] Item appears in list immediately
10. [ ] Add 4 more items with different expiry dates
    - Item 2: "Lettuce" (Vegetable, Fridge, +14 days)
    - Item 3: "Bread" (Bakery, Counter, +3 days) - should show URGENT
    - Item 4: "Frozen Pizza" (Frozen, Freezer, +30 days)
    - Item 5: "Yogurt" (Dairy, Fridge, +1 day) - should show URGENT
11. [ ] Verify items sorted by expiry (soonest first)
12. [ ] Verify status stripe colors:
    - Green (fresh): Milk, Lettuce, Pizza
    - Yellow (soon): None in this test
    - Red (urgent): Bread, Yogurt
13. [ ] Tap search icon
14. [ ] Type "Milk" - only milk shows
15. [ ] Clear search
16. [ ] Tap filter: "Urgent" - only Bread & Yogurt show
17. [ ] Tap filter: "Fridge" - Milk, Lettuce, Yogurt show
18. [ ] Tap item card to view details
19. [ ] Verify all fields editable
20. [ ] Change quantity, save
21. [ ] Return to list
22. [ ] Long-press or tap 3-dot menu on item
23. [ ] Mark as "Eaten" - item disappears
24. [ ] Item count in header updated
25. [ ] Log result as PASS/FAIL
```

**Result Template**:

```
Device: [Device name]
OS Version: [Version]
Test Suite: T2 - Inventory Management
Duration: [X minutes]
Result: [PASS/FAIL]
Issues:
- [Issue 1]
- [Issue 2]
```

---

### Suite T3: Navigation & Tab Bar

**Duration**: 10 minutes per device  
**Devices**: All  
**Precondition**: App open with items added

**Steps**:

```
1. [ ] Verify 4 tabs visible at bottom:
   - Inventory (home icon)
   - Containers
   - Recipes
   - Settings
2. [ ] Inventory tab active (highlighted)
3. [ ] Tap "Containers" tab
   - Smooth fade transition
   - Containers screen appears
   - Tab bar shows Containers as active
4. [ ] Tap "Recipes" tab
   - Smooth transition
   - Recipes visible with gradients
5. [ ] Tap "Settings" tab
   - Smooth transition
   - Profile section visible
6. [ ] Tap back (iOS) or hardware back (Android)
   - Should go to previous tab (Recipes)
7. [ ] Tap "Inventory" to return home
8. [ ] Deep link test (if available):
   - Open item directly from notification
   - Should navigate to item detail
9. [ ] Verify no stuck states
10. [ ] Log result
```

---

### Suite T4: Performance & Animations

**Duration**: 15 minutes per device  
**Devices**: All  
**Precondition**: App with 20+ items

**Steps**:

```
STARTUP PERFORMANCE
1. [ ] Force close app
2. [ ] Start timer
3. [ ] Tap app icon to open
4. [ ] Stop timer when dashboard is fully interactive
5. [ ] Time should be < 2 seconds
6. [ ] Log startup time

ANIMATION SMOOTHNESS
7. [ ] Tap "Containers" tab
   - Watch transition (should be smooth)
   - No stuttering or pauses
   - 60 FPS visual
8. [ ] Tap item card
   - Background changes smoothly
   - Shadow elevation smooth
   - No lag
9. [ ] Open settings
   - Entrance animation smooth (FadeInUp)
   - No jank visible
10. [ ] Scroll through 20+ items
    - Smooth scrolling maintained
    - No frame drops
    - FPS stable
11. [ ] Apply filter "Urgent"
    - List updates instantly
    - No lag
12. [ ] Test FAB press
    - Spring animation visible
    - Haptic feedback felt
    - Smooth return

FRAME RATE TESTING (if tools available)
13. [ ] Use DevTools or profiler
14. [ ] Record FPS while scrolling
15. [ ] Record FPS during animation
16. [ ] Expected: 60 FPS, not dropping below 50 FPS
17. [ ] Log frame rate data

MEMORY USAGE
18. [ ] Open DevTools memory profiler
19. [ ] Note initial memory
20. [ ] Add 10 more items
21. [ ] Note memory increase
22. [ ] Expected: < 100 MB total
23. [ ] No memory leak over 5 minutes

NETWORK PERFORMANCE
24. [ ] Throttle network to 3G (slow)
25. [ ] Try syncing changes
26. [ ] Should show loading state
27. [ ] Should complete sync within 5 seconds
28. [ ] Log all performance data
```

---

### Suite T5: Accessibility

**Duration**: 20 minutes per device  
**Devices**: All (with screen reader enabled)

**Steps**:

```
ENABLE SCREEN READER
1. [ ] iOS: Enable VoiceOver (Settings > Accessibility > VoiceOver)
2. [ ] Android: Enable TalkBack (Settings > Accessibility > TalkBack)

DASHBOARD ACCESSIBILITY
3. [ ] VoiceOver/TalkBack announces screen title
4. [ ] Item count announced correctly
5. [ ] "View notifications" button announced
6. [ ] "Settings" button announced
7. [ ] Notification bell icon has label
8. [ ] Settings icon has label

INVENTORY SCREEN
9. [ ] "Inventory" announced on tab focus
10. [ ] Item count header announced
11. [ ] First item card announced with:
    - Item name
    - Storage location
    - Days until expiry
    - Status (fresh/soon/urgent)
12. [ ] Filter chips announced as radio group
13. [ ] Each chip label clear
14. [ ] Sort button labeled
15. [ ] Search button labeled

NAVIGATION
16. [ ] Tab bar properly labeled
17. [ ] Current tab identified as active
18. [ ] Tab navigation works with accessibility
19. [ ] Focus order makes sense
20. [ ] Back button accessible

SETTINGS SCREEN
21. [ ] Profile section announced
22. [ ] "Sign out" button clearly labeled
23. [ ] Destructive action indicated
24. [ ] All settings rows readable

COLOR CONTRAST
25. [ ] Text readable on all backgrounds
26. [ ] Status colors not only source of info
27. [ ] Labels always present with colors
28. [ ] All text at least 4.5:1 contrast ratio

FONT SCALING
29. [ ] Set system font size to largest
30. [ ] App layouts don't break
31. [ ] Text still readable
32. [ ] No overflow issues
33. [ ] UI responsive to font size

ACCESSIBILITY RESULT
34. [ ] Log which features work well
35. [ ] Log any issues with screen readers
36. [ ] Note if any barriers found
```

---

### Suite T6: Error Handling

**Duration**: 15 minutes per device  
**Devices**: All

**Steps**:

```
NETWORK ERRORS
1. [ ] Turn off WiFi + cellular (airplane mode)
2. [ ] Try to add item
3. [ ] Should show "No connection" error
4. [ ] Error message is user-friendly
5. [ ] Tap "Retry" or similar
6. [ ] Re-enable network
7. [ ] Retry succeeds
8. [ ] Item added successfully

INVALID INPUT
9. [ ] Try to add item with empty name
10. [ ] Should show validation error
11. [ ] Clear error message provided
12. [ ] Can't submit with error
13. [ ] Fix error and submit works

EDGE CASES
14. [ ] Add item with very long name (100+ chars)
    - Should not break layout
    - Text truncates or wraps properly
15. [ ] Add item with special characters: @#$%&
    - Should save and display correctly
16. [ ] Add item with no expiry date
    - Should show as "No expiry" or similar
17. [ ] Add item with future date (2050)
    - Should not cause errors
18. [ ] Add item with past date
    - Should mark as expired
19. [ ] Add 100+ items
    - Should not slow down significantly
20. [ ] Search/filter with 100+ items
    - Should still be responsive

ERROR RESULT
21. [ ] Log any unhandled errors
22. [ ] Note if app crashes
23. [ ] Note if UI breaks
24. [ ] All errors should be recoverable
```

---

### Suite T7: Edge Cases

**Duration**: 10 minutes per device  
**Devices**: All

**Steps**:

```
1. [ ] Empty household (no items) - shows empty state
2. [ ] Max items (100+) - scrolling still smooth
3. [ ] Long item names (100+ chars) - layout intact
4. [ ] Special characters in names - displayed correctly
5. [ ] Very old dates (1900) - no crashes
6. [ ] Very future dates (2100) - no crashes
7. [ ] Duplicate items - allowed and works
8. [ ] Rapid item additions - no data loss
9. [ ] Rapid filter changes - no UI glitches
10. [ ] Switch tabs repeatedly - smooth transitions
11. [ ] Kill app mid-sync - data not corrupted
12. [ ] Low memory device - app doesn't crash
13. [ ] Device rotation (if applicable) - layout adapts
14. [ ] Large text + many items - no overflow
15. [ ] Test passed/failed - log results
```

---

## 📝 Test Result Logging

### Log Template

```markdown
# Device Testing Results - May 8, 2026

## Device Info

- Device: iPhone 14 Pro Max
- OS: iOS 17.4
- App Version: 1.0.0
- Build: 1
- Tester: [Name]
- Date: 2026-05-08
- Time: [14:30 - 15:45]

## Test Suite Results

### T1: Authentication & Onboarding

**Status**: PASS ✅
**Duration**: 15 minutes
**Issues**: None
**Notes**: All flows working smoothly

### T2: Core Inventory Management

**Status**: PASS ✅
**Duration**: 18 minutes
**Issues**: None
**Notes**: Filters working correctly, animations smooth

### T3: Navigation & Tab Bar

**Status**: PASS ✅
**Duration**: 9 minutes
**Issues**: None
**Notes**: All transitions smooth

### T4: Performance & Animations

**Status**: PASS ✅
**Duration**: 14 minutes
**Startup Time**: 1.2 seconds
**Frame Rate**: 59-60 FPS
**Memory**: 45 MB
**Issues**: None
**Notes**: Excellent performance

### T5: Accessibility

**Status**: PASS ✅
**Duration**: 19 minutes
**Screen Reader**: VoiceOver (iOS)
**Issues**: None
**Notes**: All elements properly labeled

### T6: Error Handling

**Status**: PASS ✅
**Duration**: 14 minutes
**Issues**: None
**Notes**: Good error messages

### T7: Edge Cases

**Status**: PASS ✅
**Duration**: 10 minutes
**Issues**: None
**Notes**: No crashes with extreme inputs

## Summary

- Total Time: 1 hour 39 minutes
- Tests Passed: 7/7
- Critical Issues: 0
- Warnings: 0
- Recommendations: None

## Sign-Off

Tester: ******\_\_\_******
Date: ******\_\_\_******
Ready for Beta: ✅ YES
```

---

## 🚀 Test Execution Checklist

### Pre-Testing (Day 1)

- [ ] All devices charged and updated
- [ ] Backup existing data on devices
- [ ] Clear app cache and fresh install
- [ ] Disable auto-lock on devices
- [ ] Enable crash logs (Xcode/Play Console)
- [ ] Prepare result logging spreadsheet
- [ ] Brief testers on test procedures

### During Testing (Days 2-3)

- [ ] Follow test suites in order
- [ ] Log results after each suite
- [ ] Take screenshots of any issues
- [ ] Note exact steps to reproduce issues
- [ ] Test on all 5 device types
- [ ] Log performance metrics
- [ ] Check crash logs frequently

### Post-Testing (Day 4)

- [ ] Compile results from all testers
- [ ] Categorize issues (P0, P1, P2)
- [ ] Create bug reports for each issue
- [ ] Assign issues to development
- [ ] Calculate overall pass rate
- [ ] Decide if ready for beta
- [ ] Report results to team

---

## 📊 Success Criteria

**All 7 Test Suites Must PASS:**

- ✅ T1: Authentication works
- ✅ T2: Features work correctly
- ✅ T3: Navigation smooth
- ✅ T4: Performance excellent
- ✅ T5: Accessibility works
- ✅ T6: Error handling good
- ✅ T7: No crashes on edge cases

**Performance Targets:**

- Startup < 2 seconds
- 60 FPS during animations
- < 100 MB memory
- < 0.1% crash rate

**Quality Targets:**

- Zero P0 bugs
- < 3 P1 bugs (acceptable to defer)
- Any P2 bugs documented
- All tested on 2+ devices

---

## 🎯 If Issues Are Found

### P0 (Critical) - Fix Before Beta

```
Examples:
- App crashes on startup
- Can't add items
- Authentication broken
- Data loss
```

**Process**:

1. Document exact reproduction steps
2. Create git issue
3. Assign to developer
4. Fix and re-test
5. Continue testing only after fix

### P1 (High) - Fix Before Launch

```
Examples:
- Feature not working correctly
- Animation glitchy
- Performance issue
- Layout broken on some devices
```

**Process**:

1. Document and log
2. Can defer to 1.0.1 if needed
3. Plan fix with developer
4. Test after fix

### P2 (Medium) - Log and Plan

```
Examples:
- Minor UI issue
- Edge case bug
- Wording unclear
```

**Process**:

1. Document
2. Plan for v1.1.0
3. Don't block launch

---

## Next Steps After Testing

1. **If All Pass**: Proceed to Beta Testing (Week 2)
2. **If P0 Issues**: Fix and re-test (extends timeline)
3. **If P1 Issues**: Fix and document as fixed
4. **If P2 Issues**: Log and plan for v1.1.0

Target: Complete device testing by May 14, begin beta May 15.
