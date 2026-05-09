# Phase 3D: Production Validation Testing Guide

This document provides a comprehensive testing checklist for validating the WhatsForLunch mobile app before production deployment.

## Pre-Testing Setup

### Environment Requirements

- [ ] iOS 15+ (for testing)
- [ ] Android 8+ (for testing)
- [ ] Test devices with varying screen sizes (phone, tablet, small/large screens)
- [ ] Network conditions: WiFi, 4G, 3G (if possible)
- [ ] Screen reader enabled for accessibility testing (iOS VoiceOver / Android TalkBack)

### Build Preparation

```bash
# Build for iOS
pnpm ios

# Build for Android
pnpm android

# Or use Expo for faster testing
pnpm dev
```

## Test Suites

### T1: Authentication & Onboarding

**Acceptance Criteria**: Users can successfully sign up, sign in, and access the main app

- [ ] Sign up with new email
  - [ ] Email validation works
  - [ ] Password requirements enforced
  - [ ] Household creation during onboarding
  - [ ] Redirects to dashboard after signup
- [ ] Sign in with existing account
  - [ ] Email/password validation
  - [ ] Error handling for invalid credentials
  - [ ] Redirects to dashboard after signin
- [ ] Password reset flow
  - [ ] Request reset email
  - [ ] Reset link works
  - [ ] New password set successfully
- [ ] Session persistence
  - [ ] Token stored securely (async-storage)
  - [ ] Session persists after app close/reopen
  - [ ] Automatic logout on token expiry

### T2: Core Features - Inventory Management

**Acceptance Criteria**: Users can manage food items with full CRUD operations

#### Add Items

- [ ] Add item with all fields
  - [ ] Food name input
  - [ ] Category selection (vegetable, fruit, dairy, etc.)
  - [ ] Storage location selection (fridge, freezer, pantry, counter)
  - [ ] Expiry date picker
  - [ ] Quantity field
- [ ] Add item with minimal fields (just name, optional expiry)
- [ ] Item appears in inventory immediately
- [ ] Items are sorted by expiry date (soonest first)

#### View Items

- [ ] Inventory screen shows all active items
  - [ ] Correct count displayed in header
  - [ ] Item cards display with emoji, name, location, days-to-expiry
  - [ ] Status stripe colors accurate (fresh/soon/urgent/expired)
- [ ] Search functionality
  - [ ] Filter items by name (case-insensitive)
  - [ ] Clear search button works
- [ ] Filter by status/location
  - [ ] "All" shows all items
  - [ ] "Urgent" shows items expiring within 3 days
  - [ ] Location filters (fridge, freezer, pantry, counter) work
  - [ ] Filter chips animate on press

#### Edit Items

- [ ] Open item detail from list
  - [ ] All item fields editable
  - [ ] Changes saved immediately
  - [ ] Back button returns to list

#### Delete Items

- [ ] Mark item as "eaten" - removes from inventory
- [ ] Mark item as "tossed" - removes from inventory
- [ ] Bulk delete with bulk mode
  - [ ] Select multiple items
  - [ ] Confirm actions work
  - [ ] Items removed from inventory

#### Item Expiry Statuses

- [ ] **Fresh** (7+ days): Green stripe, standard display
- [ ] **Soon** (3-7 days): Yellow stripe, warning display
- [ ] **Urgent** (0-3 days): Red stripe, highlighted display
- [ ] **Expired** (past date): Red stripe, highlighted display

### T3: Containers Management

**Acceptance Criteria**: Users can organize items into containers

- [ ] View containers list
  - [ ] All containers displayed with item count
  - [ ] Hero card shows active container count
  - [ ] Empty state displays when no containers exist
- [ ] Create container
  - [ ] Scan QR code to add container
  - [ ] Add container manually with name
  - [ ] Container appears in list immediately
- [ ] View container items
  - [ ] Open container shows all contained items
  - [ ] Can add/remove items from container
- [ ] Archive containers
  - [ ] Toggle archived view
  - [ ] Archived containers hidden by default
  - [ ] Can restore archived containers

### T4: Recipes Screen

**Acceptance Criteria**: Users can browse recipe recommendations

- [ ] Recipes load and display
  - [ ] Multiple recipe cards visible
  - [ ] Each recipe has name, image placeholder, ingredients
  - [ ] Gradient backgrounds display correctly
- [ ] Scroll performance
  - [ ] Smooth scrolling with many recipes
  - [ ] No janky animations or frame drops
- [ ] Recipe interactions
  - [ ] Tap recipe for details (if implemented)
  - [ ] Share recipe functionality works

### T5: Settings & Preferences

**Acceptance Criteria**: Users can configure app settings

- [ ] View settings screen
  - [ ] Profile information displayed (name, email, initials avatar)
  - [ ] Profile stats show (items, day streak, saved amount)
  - [ ] Subscription card visible (if not premium)
- [ ] Edit profile
  - [ ] Update name
  - [ ] Change profile photo
  - [ ] Update dietary preferences
- [ ] Manage households
  - [ ] View current household members
  - [ ] Invite new members
  - [ ] Remove members (if owner)
- [ ] Notification settings
  - [ ] Toggle notifications on/off
  - [ ] Different notification types configurable
- [ ] Theme/Preferences
  - [ ] Toggle dark mode (if available)
  - [ ] Change units (imperial/metric)
  - [ ] Change language
- [ ] Privacy & Security
  - [ ] Privacy policy accessible
  - [ ] Data export option available
  - [ ] Delete account option
- [ ] Sign out
  - [ ] Sign out button works
  - [ ] User redirected to login screen
  - [ ] Previous session cleared

### T6: Navigation & Tab Bar

**Acceptance Criteria**: All navigation flows work smoothly

- [ ] Tab bar visible and responsive
  - [ ] Inventory tab (home/dashboard)
  - [ ] Containers tab
  - [ ] Recipes tab
  - [ ] Settings tab
- [ ] Tab transitions
  - [ ] Screen fades in/out smoothly (300ms entrance, 200ms exit)
  - [ ] Active tab indicator updates
  - [ ] Badge counts update in real-time
- [ ] Deep linking
  - [ ] Can link directly to specific item detail
  - [ ] Can link to container detail
  - [ ] Links work from notifications
- [ ] Back navigation
  - [ ] Back button returns to previous screen
  - [ ] Hardware back button works (Android)
  - [ ] Gesture back works (iOS)

### T7: Performance & Animations

**Acceptance Criteria**: App performs smoothly with fluid animations

#### Bundle Size

- [ ] Check app size
  - [ ] iOS: < 50MB (uncompressed)
  - [ ] Android APK: < 40MB
  - [ ] Bundle analysis shows no unexpected large dependencies

#### Animation Smoothness

- [ ] FAB press animation (scale 0.92 with haptic)
  - [ ] Smooth spring animation
  - [ ] 60 FPS maintained
- [ ] Button press feedback
  - [ ] Header buttons (sort, search) scale down
  - [ ] Item cards background changes on press
  - [ ] Opacity changes smooth
- [ ] Screen transitions
  - [ ] Entrance animations (FadeInUp) smooth
  - [ ] Exit animations (FadeOutDown) smooth
  - [ ] No lag during transition
- [ ] List scrolling
  - [ ] 60 FPS maintained while scrolling items
  - [ ] No stutter when scrolling long lists
  - [ ] Images load without blocking scroll
- [ ] Filter chips
  - [ ] Chips animate on selection (scale 0.95)
  - [ ] Multiple filters can be applied smoothly

#### Network Performance

- [ ] Slow network (3G)
  - [ ] App loads within 10 seconds
  - [ ] Shows loading states appropriately
  - [ ] Error handling for failed requests
- [ ] Offline mode
  - [ ] Can view cached items while offline
  - [ ] Changes queue for sync when online
  - [ ] Shows offline indicator

### T8: Accessibility (a11y)

**Acceptance Criteria**: App is usable with screen readers and accessibility tools

#### VoiceOver (iOS) / TalkBack (Android)

- [ ] Dashboard accessible
  - [ ] All buttons labeled with accessibilityLabel
  - [ ] Notification button: "View notifications"
  - [ ] Settings button: "Account settings"
  - [ ] Item counts and stats announced correctly
- [ ] Inventory screen accessible
  - [ ] Header text announced
  - [ ] Item count announced
  - [ ] Filter chips labeled as radio group
  - [ ] Each item readable: name, location, expiry info
  - [ ] Sort/search buttons properly labeled
- [ ] Settings screen accessible
  - [ ] All sections properly titled
  - [ ] All buttons labeled
  - [ ] Settings rows have proper roles and states
  - [ ] Sign out button clearly labeled as destructive
- [ ] Tab bar accessible
  - [ ] Each tab labeled properly
  - [ ] Currently selected tab announced
  - [ ] Badge counts announced for tabs with notifications

#### Color Contrast

- [ ] Text meets WCAG AA standards (4.5:1 for normal text)
  - [ ] Primary text on base background ✓
  - [ ] Secondary text on raised background ✓
  - [ ] Status text (urgent, fresh, soon) ✓
- [ ] Focus indicators visible
  - [ ] Interactive elements have visible focus rings (iOS/Android)

#### Dynamic Font Sizes

- [ ] Text scales with system font size settings
  - [ ] Large text mode still readable
  - [ ] Layout doesn't break with large fonts

### T9: Regression Testing

**Acceptance Criteria**: Previous functionality still works after new changes

#### Features from Phase 3A (Performance)

- [ ] Memoized components don't cause stale data
  - [ ] Item list updates when items added/removed
  - [ ] Stats update in real-time
  - [ ] Filters still apply correctly
- [ ] useCallback dependencies correct
  - [ ] Handlers don't have stale closures
  - [ ] Filter changes trigger correct re-renders

#### Features from Phase 3B (Accessibility)

- [ ] Accessibility attributes preserved
  - [ ] All buttons still have labels
  - [ ] All interactive elements accessible
  - [ ] Focus order makes sense
- [ ] VoiceOver/TalkBack still works with new animations

#### Core App Features

- [ ] Login/authentication still works
- [ ] Items sync with backend
- [ ] Containers management functional
- [ ] Settings persist
- [ ] Notifications work

### T10: Edge Cases & Error Handling

**Acceptance Criteria**: App handles errors gracefully

- [ ] Network errors
  - [ ] Handle timeout gracefully
  - [ ] Retry mechanism works
  - [ ] User sees appropriate error message
- [ ] Invalid data
  - [ ] Null/undefined items handled
  - [ ] Missing fields don't crash app
  - [ ] Graceful fallbacks for missing data
- [ ] Extreme inputs
  - [ ] Very long item names (100+ chars)
  - [ ] Very old/far future expiry dates
  - [ ] Large quantities (1000+ items)
  - [ ] Special characters in inputs
- [ ] Device memory pressure
  - [ ] App doesn't crash with low memory
  - [ ] Images cached appropriately
  - [ ] Memory leaks avoided

### T11: Platform-Specific Testing

#### iOS

- [ ] Layout respects safe areas
  - [ ] Notch/Dynamic Island handled
  - [ ] Bottom home indicator area cleared
- [ ] Portrait and landscape orientations
  - [ ] UI responsive in both
  - [ ] Items list works in landscape
- [ ] iOS-specific gestures
  - [ ] Swipe back gesture works
  - [ ] Pull to refresh (if implemented)
  - [ ] 3D Touch (if implemented)

#### Android

- [ ] Status bar colors correct
  - [ ] Light/dark theme aware
- [ ] Portrait and landscape orientations
  - [ ] UI responsive in both
  - [ ] Keyboard doesn't overlap fields
- [ ] Hardware back button
  - [ ] Back button behavior correct
  - [ ] Navigation stack managed properly
- [ ] Material Design compliance
  - [ ] Touch targets 48dp minimum
  - [ ] Ripple effects on press

### T12: Camera & Scanning (if implemented)

**Acceptance Criteria**: Barcode/QR scanning works

- [ ] Camera permission flow
  - [ ] Permission request shown
  - [ ] Access granted/denied handled
- [ ] QR code scanning
  - [ ] Scan container QR codes
  - [ ] Add containers via QR
  - [ ] Error handling for invalid codes
- [ ] Barcode scanning
  - [ ] Scan food barcodes (if implemented)
  - [ ] Look up nutritional info
  - [ ] Auto-populate fields

## Testing Workflow

### Daily Testing Cycle

1. **Build & Install**

   ```bash
   pnpm ios  # or pnpm android
   ```

2. **Smoke Test** (5 min)
   - App launches without crash
   - Can sign in or see dashboard
   - Tab navigation works
   - Can add an item

3. **Feature Test** (20 min)
   - Pick one test suite above
   - Execute all checkpoints
   - Document any issues

4. **Regression Test** (10 min)
   - Spot check previously working features
   - Ensure no new crashes

### Issue Reporting Template

```
Title: [Feature] Short description
Device: [iPhone 14 / Pixel 6 / etc]
OS Version: [iOS 17 / Android 13 / etc]
Steps to Reproduce:
1.
2.
3.

Expected:
Actual:
Screenshot/Video: [attach if helpful]
```

## Acceptance Criteria Summary

The app is **PRODUCTION READY** when:

- ✓ All T1-T11 test suites pass with < 5 non-critical issues
- ✓ Zero crashes on any core flow
- ✓ Bundle size within limits
- ✓ 60 FPS animation performance maintained
- ✓ Accessible with screen readers
- ✓ Works on iOS 15+ and Android 8+
- ✓ Works on WiFi and cellular networks
- ✓ Offline mode functional (if implemented)

## Post-Launch Monitoring

### Metrics to Track

- App crash rate (target: < 0.1%)
- Session duration (target: > 10 min for daily active users)
- Feature adoption (items added per user/day)
- Animation frame rate (target: 60 FPS)
- API response time (target: < 1 second)

### Critical Issues

Immediately rollback if:

- Auth system broken (users can't log in)
- Data loss (items disappear unexpectedly)
- App crashes on core flow (add item, view inventory)
- Security issues discovered
