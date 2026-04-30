# Accessibility Manual Test Protocol — VoiceOver & TalkBack

**Owner**: W10 (Accessibility Lead)  
**Executor**: QA team / Manual testers (Days 29-35)  
**Standard**: WCAG 2.1 Level AA + Apple MASVS-L1 + Android Accessibility guidelines  
**Devices**: iPhone (VoiceOver) + Android (TalkBack)

---

## Pre-Test Setup

### Device Configuration

#### iOS (VoiceOver)

1. **Enable VoiceOver**:
   - Settings → Accessibility → VoiceOver → On
   - Confirm: Single tap now triggers double-tap, double-tap triggers selection

2. **Rotor Shortcuts** (optional, for faster testing):
   - Settings → Accessibility → VoiceOver → Rotor
   - Enable: Headings, Links, Form Controls (makes navigation faster)

3. **Test Account**:
   - Sign in with: `qa-accessibility@wfl-test.app` (or use test credentials)
   - Ensure full household setup (Alice + Bob) for multi-user testing

#### Android (TalkBack)

1. **Enable TalkBack**:
   - Settings → Accessibility → TalkBack → On
   - Confirm: Single tap announces content, double-tap activates

2. **Magnification** (optional):
   - Settings → Accessibility → Magnification → On
   - Simulates older/low-vision user behavior

3. **Test Account**:
   - Same `qa-accessibility@wfl-test.app` account

---

## Test Navigation Basics

### iOS (VoiceOver)

| Action               | Gesture                         |
| -------------------- | ------------------------------- |
| **Next element**     | Swipe right                     |
| **Previous element** | Swipe left                      |
| **Activate button**  | Double-tap (anywhere on screen) |
| **Scroll**           | Three-finger swipe up/down      |
| **Open rotor**       | Swipe up with two fingers       |

### Android (TalkBack)

| Action                 | Gesture                           |
| ---------------------- | --------------------------------- |
| **Next element**       | Swipe right                       |
| **Previous element**   | Swipe left                        |
| **Activate button**    | Double-tap                        |
| **Scroll**             | Two-finger swipe up/down          |
| **Local context menu** | Swipe down then right (L-gesture) |

---

## Test Flows (30 min per flow)

Each flow tests a critical user journey. Run with screen reader enabled; mark PASS/FAIL for each item.

### Flow 1: Authentication & Onboarding (5 min)

**Goal**: New user can sign up and onboard without seeing the screen.

**Steps**:

1. Open app (cold start)
2. Screen reader should announce: "Sign in screen" or similar header role
3. Swipe through all elements (email field, sign-in button, social buttons):
   - [ ] Each button has `accessibilityRole="button"`
   - [ ] Each button has an `accessibilityLabel` (e.g., "Sign in with Apple")
   - [ ] Labels are action-focused, not just "Button"
4. Tap email field:
   - [ ] VoiceOver announces "Email, Text Field, required"
   - [ ] TalkBack announces role + label
5. Type email, tap Sign In:
   - [ ] Button is announced as enabled (not disabled)
6. Onboarding slides:
   - [ ] Each slide announces title via header role
   - [ ] Slide dots/page indicator announces current position ("Page 2 of 4")
   - [ ] Skip button is always reachable
7. Magic link email verification:
   - [ ] "Link sent" message announces clearly
   - [ ] No placeholder text or generic "Button" announcements

**Result**: [ ] PASS [ ] FAIL  
**Notes**: ****\_\_\_****

---

### Flow 2: Dashboard List Navigation (7 min)

**Goal**: User can navigate item list, understand status, and tap to view details — without reading the screen.

**Steps**:

1. Sign in → dashboard loads
2. Screen reader announces: "Dashboard" (header role) + sync status
3. **Item list**:
   - [ ] Swipe right: announces first item
   - [ ] Label includes: name, status (urgency color name, NOT just "red"), expiry countdown
   - Example: "Greek yogurt, Urgent — expires today"
   - [ ] Swipe right again: next item announced similarly
   - [ ] Status is conveyed by TEXT + ICON, never color alone
4. **Tap an item**:
   - [ ] Screen reader announces navigation to detail screen
   - [ ] Item detail screen has header role on title
5. **Swipe to bottom of list**:
   - [ ] No infinite scroll confusion — clear end of list announced

**Result**: [ ] PASS [ ] FAIL  
**Notes**: ****\_\_\_****

---

### Flow 3: Scan Screen (5 min)

**Goal**: User can switch scan modes and understand camera permissions — without seeing.

**Steps**:

1. Dashboard → tap camera/scan FAB
2. Screen reader announces: "Camera screen" or similar
3. **Permission check**:
   - [ ] If permission denied, permission button announced with `accessibilityRole="button"` and label
   - [ ] Permission label: "Allow camera access" (action-focused)
4. **Camera active**:
   - [ ] Camera viewfinder is NOT announced (has `accessible={false}`)
   - [ ] Swipe right: announces next scan mode (QR | Barcode | Photo | Date)
   - [ ] Mode tabs have `accessibilityRole="radio"` or similar
   - [ ] Current mode announced as "selected" or "checked"
5. **Tap a mode**:
   - [ ] Mode changes; new mode announced as active
6. **Scan success**:
   - [ ] After scanning, `AccessibilityInfo.announceForAccessibility()` fires immediately
   - [ ] Announcement: "QR code scanned successfully" or similar
   - [ ] No reliance on haptic feedback alone (haptics + announcement)

**Result**: [ ] PASS [ ] FAIL  
**Notes**: ****\_\_\_****

---

### Flow 4: Add/Edit Item (7 min)

**Goal**: User can fill form fields and understand errors — without seeing.

**Steps**:

1. Dashboard → "+" FAB → Add Item form
2. **Form structure**:
   - [ ] Form title announced as header
   - [ ] Each field is a TextInput with `accessibilityLabel` (field name)
   - [ ] Swipe through all fields: Photo, Name, Location, Expiry, etc.
3. **Photo field**:
   - [ ] Announced as "Photo, Button" (tappable)
   - [ ] After selecting photo, confirmation announced
4. **Location picker** (if dropdown/segmented control):
   - [ ] Radio group role with options (Fridge | Freezer | Pantry)
   - [ ] Current selection announced as "selected"
5. **Expiry field**:
   - [ ] Text field or stepper control
   - If stepper: increment/decrement buttons have labels ("Increase expiry", "Decrease expiry")
6. **Submit button**:
   - [ ] Button role + label "Save item" or similar
   - [ ] If form incomplete, button disabled state announced
7. **Error feedback**:
   - [ ] If validation error (e.g., empty name), error message announced
   - [ ] Use `AccessibilityInfo.announceForAccessibility()` or inline `accessibilityLiveRegion`

**Result**: [ ] PASS [ ] FAIL  
**Notes**: ****\_\_\_****

---

### Flow 5: Settings & Preferences (5 min)

**Goal**: User can toggle settings and adjust preferences — without seeing.

**Steps**:

1. Dashboard → Settings tab → Preferences
2. **Theme selector**:
   - [ ] Radio group role with options (Auto | Light | Dark)
   - [ ] Current theme announced as selected
3. **Toggle switches**:
   - [ ] Each switch has `accessibilityRole="switch"`
   - [ ] Label describes what's being toggled (e.g., "Notifications enabled")
   - [ ] State announced: "on" or "off" (via `accessibilityState={{ checked: true/false }}`)
4. **Quiet hours stepper** (if present):
   - [ ] Start/end time selectors with +/− buttons
   - [ ] Button labels: "Increase quiet hours start", "Decrease quiet hours start"
   - [ ] Current value announced after change
5. **Tag cloud** (dietary preferences):
   - [ ] Each tag is a checkbox: `accessibilityRole="checkbox"`
   - [ ] Label: tag name (e.g., "Vegan")
   - [ ] State: "checked" or "unchecked"

**Result**: [ ] PASS [ ] FAIL  
**Notes**: ****\_\_\_****

---

### Flow 6: Dark Mode Rendering (3 min)

**Goal**: App is usable in dark mode with proper contrast.

**Steps**:

1. Settings → Preferences → Theme → Dark
2. Return to dashboard
3. **Visual verification** (with screen reader off):
   - [ ] All text readable (sufficient contrast)
   - [ ] Status colors (green/yellow/red) distinguishable
   - [ ] Buttons clearly visible
   - [ ] No text disappears in dark background
4. **Re-enable screen reader**:
   - [ ] Announcements same as light mode (no extra noise)
   - [ ] Labels unchanged

**Result**: [ ] PASS [ ] FAIL  
**Notes**: ****\_\_\_****

---

### Flow 7: Animations & Reduce Motion (3 min)

**Goal**: Animations respect system reduce-motion setting.

**Steps**:

1. Settings → Accessibility → Motion → Reduce Motion → On
2. Return to app (may need to restart)
3. **Haptics & animations**:
   - [ ] No spring animations (swaps to fade if used)
   - [ ] LottiePlayer animations should be disabled or instant (read component tests)
   - [ ] Haptics still fire (separate from motion reduction)
4. **Turn OFF Reduce Motion**:
   - [ ] Animations resume smoothly
   - [ ] No crashes or UI glitches

**Result**: [ ] PASS [ ] FAIL  
**Notes**: ****\_\_\_****

---

## Screen-Specific Checklists

### Scan Screen Deep Dive

- [ ] Close button announces "Close camera" (not just "X")
- [ ] LottiePlayer reticle has `accessible={false}` (not announced)
- [ ] LottiePlayer success animation has `accessible={false}`
- [ ] Mode hint text hidden from screen readers (not relevant, mode already announced via tab)
- [ ] All scan mode tabs have role="radio" + selected state
- [ ] Success announcement fires via `AccessibilityInfo.announceForAccessibility()`

### Dashboard Deep Dive

- [ ] Sync status badge announced ("In sync" or "Syncing")
- [ ] Swipe order: title → filters → list items → FAB → tab bar
- [ ] Item card label auto-built: "item name, status, days left"
- [ ] Status colors paired with icon + text (red + "Urgent" icon, never color alone)
- [ ] Pull-to-refresh hint or indicator announced

### Settings Deep Dive

- [ ] Delete Account warning has `accessibilityRole="alert"` or at least clear heading
- [ ] Delete Account button disabled until confirmation text entered
- [ ] Bullet points (•) in delete warning are `accessible={false}` (decorative)
- [ ] Household members list announces member names + status (online/offline)

---

## Edge Cases & Error States

### Empty State

- [ ] Empty fridge message announced as header ("No items yet")
- [ ] Illustration has `accessible={false}` (decorative)
- [ ] "Add first item" button is reachable and labeled

### Loading State

- [ ] Loading spinner announced ("Loading" or "In progress")
- [ ] Should auto-announce when done: "Content loaded" (via `announceForAccessibility`)

### Network Error

- [ ] Error message announced in full (not truncated)
- [ ] Retry button clearly labeled "Retry" (not just "Try again")
- [ ] Error state should use `accessibilityLiveRegion="assertive"` (or `announceForAccessibility`)

### Offline Mode

- [ ] "Offline" badge announced
- [ ] Sync paused message announced
- [ ] All inputs still work (local-first)

---

## Pass/Fail Criteria

### PASS

- ✅ All interactive elements have roles + labels
- ✅ Screen reader navigation is logical (top-to-bottom, left-to-right)
- ✅ Status never conveyed by color alone
- ✅ Touch targets >= 44pt (verified via snapshot)
- ✅ No placeholder text or generic "Button" announcements
- ✅ Errors/confirmations announced clearly
- ✅ Dark mode is readable
- ✅ Reduce Motion respected

### FAIL

- ❌ Missing `accessibilityRole` on button or interactive element
- ❌ Missing `accessibilityLabel` on interactive element
- ❌ Color-only status indicator (no icon/text pair)
- ❌ Navigation order is illogical (jumps around screen)
- ❌ Announcements are generic ("Button", "Text")
- ❌ Invisible elements are announced (should have `accessible={false}` or be hidden)
- ❌ Error messages not announced to screen reader
- ❌ Animations don't respect Reduce Motion
- ❌ Dark mode text is unreadable

---

## Reporting Issues

When you find an issue, create a GitHub issue with:

**Title**: `a11y: [Component] — [Issue]`  
Example: `a11y: scan.tsx — LottiePlayer success animation not hidden from screen reader`

**Template**:

```markdown
## Screen Reader

- [ ] iOS VoiceOver
- [ ] Android TalkBack

## Issue

[Description of the problem]

## Expected

[What should happen]

## Actual

[What currently happens]

## Steps to Reproduce

1. Enable screen reader
2. ...

## Component

- [ ] Button
- [ ] Card
- [ ] IconButton
- [ ] Input
- [ ] ListRow
- [ ] SegmentedControl
- [ ] Tag
- [ ] Avatar
- [ ] EmptyState
- [ ] StatusBadge
- [ ] Other: **\_\_\_\_**

## Severity

- [ ] Blocker (cannot use feature)
- [ ] Major (feature significantly impaired)
- [ ] Minor (workaround exists)
```

---

## Testing Timeline

- **Day 29**: Flow 1-2 (Auth, Dashboard)
- **Day 30**: Flow 3-4 (Scan, Add/Edit)
- **Day 31**: Flow 5-7 (Settings, Dark Mode, Reduce Motion)
- **Day 32**: Edge cases + re-test any failed items
- **Day 33**: Report all issues; W10 triage and fix
- **Day 34-35**: Re-test fixes

**Target**: All flows PASS by Day 35 (before submission)

---

## Tools & Resources

- **iOS Accessibility Inspector**: Xcode → Window → Accessibility Inspector
- **Android Accessibility Scanner**: Play Store → "Accessibility Scanner" app
- **WCAG 2.1 Reference**: https://www.w3.org/WAI/WCAG21/quickref/
- **Apple MASVS**: https://developer.apple.com/accessibility/

---

## Sign-Off

**Tester**: ********\_********  
**Date**: ********\_********  
**Overall Result**: [ ] PASS [ ] FAIL  
**Blockers for Launch**: ****\_\_\_****
