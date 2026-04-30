# Visual QA Checklist — Design Tokens & Final Polish

**Owner**: W10 (Design)  
**Executor**: Design lead + manual QA (Days 29-34)  
**Goal**: Verify all Tamagui tokens applied correctly; no visual regressions; dark mode consistency

---

## Design Token Verification (Light & Dark Theme)

### Color Palette

#### Brand Colors

- [ ] Primary brand green (#2F7D5B light, #5FB389 dark): buttons, highlights, active states
  - [ ] Button hover/press state darkens correctly
  - [ ] Disabled state becomes muted (#E8F2EC light, #1E3329 dark)
- [ ] Primary dark variant (#1F5A40 light) used for dark button borders

#### Status Colors (Icon + Text Always Paired)

| Status     | Light Color | Dark Color | Used In              | Verified |
| ---------- | ----------- | ---------- | -------------------- | -------- |
| Fresh      | #3A8C5F     | #5FB389    | Green status badge   | [ ]      |
| Fresh BG   | #E8F2EC     | #1E3329    | Item card background | [ ]      |
| Soon       | #C98A2B     | #E5B566    | Yellow status badge  | [ ]      |
| Soon BG    | #FAF1E1     | #3A2E18    | Item card background | [ ]      |
| Urgent     | #C24A3E     | #F07566    | Red status badge     | [ ]      |
| Urgent BG  | #FAE8E5     | #3A1F1B    | Item card background | [ ]      |
| Expired    | #6B6B6B     | #8E8E93    | Gray status badge    | [ ]      |
| Expired BG | #F0EFEC     | #222423    | Item card background | [ ]      |

**Verification Steps**:

1. Navigate to dashboard
2. Verify at least one item in each status (fresh, soon, urgent, expired)
3. Check: color + icon pair convey status (never color alone)
4. Confirm icons are visible and match status

#### Surface Colors

| Type   | Light   | Dark    | Notes                  | Verified |
| ------ | ------- | ------- | ---------------------- | -------- |
| Base   | #FBFAF7 | #0E110F | App background         | [ ]      |
| Raised | #FFFFFF | #1A1F1B | Card/modal background  | [ ]      |
| Sunken | #F2F0EB | #070908 | Input field background | [ ]      |

**Verification**:

- [ ] Dashboard background is light base / dark base
- [ ] Cards are raised (slightly brighter than background)
- [ ] Input fields are sunken (slightly darker than cards)
- [ ] No jarring contrast switches between light/dark

#### Text Colors

| Type      | Light   | Dark    | Used In              | Verified |
| --------- | ------- | ------- | -------------------- | -------- |
| Primary   | #0F1411 | #F4F2EE | Body text            | [ ]      |
| Secondary | #5C615E | #A8ACA9 | Labels, hints        | [ ]      |
| Tertiary  | #8B908D | #6B706D | Disabled, timestamps | [ ]      |
| Inverse   | #FFFFFF | #0E110F | Button text          | [ ]      |

**Verification**:

- [ ] All text readable (contrast >= 4.5:1 for normal, 3:1 for large)
- [ ] Primary text dark on light, light on dark
- [ ] Secondary/tertiary appropriately muted
- [ ] No white text on white, black text on black

#### Border Colors

| Type   | Light   | Dark    | Used In                    | Verified |
| ------ | ------- | ------- | -------------------------- | -------- |
| Subtle | #E8E5DE | #252A26 | Card borders, dividers     | [ ]      |
| Strong | #D2CFC7 | #3A3F3B | Focus rings, active states | [ ]      |

**Verification**:

- [ ] Borders visible but not overwhelming
- [ ] Focus rings (strong) clearly highlight active element
- [ ] No invisible borders

---

## Typography Verification

### Font: SF Pro Display / Inter (fallback)

#### Sizes Used in App

| Type    | Size | Weight        | Line Height | Used In                | Verified |
| ------- | ---- | ------------- | ----------- | ---------------------- | -------- |
| Display | 34pt | Bold (700)    | 41pt        | Screen titles          | [ ]      |
| Title 1 | 28pt | Bold (700)    | 34pt        | Section titles         | [ ]      |
| Title 2 | 22pt | Bold (700)    | 26pt        | Card titles            | [ ]      |
| Body    | 16pt | Regular (400) | 20pt        | Paragraphs, list items | [ ]      |
| Caption | 13pt | Regular (400) | 16pt        | Labels, hints          | [ ]      |
| Small   | 11pt | Regular (400) | 13pt        | Tags, badges           | [ ]      |

**Verification Steps**:

1. Open app in light mode
2. Check each screen for typography:
   - [ ] Dashboard: Title 1 "Dashboard" at top (28pt bold)
   - [ ] Item card: Title 2 "Greek yogurt" (22pt bold)
   - [ ] Item detail: Display title (34pt bold)
   - [ ] Body text for descriptions (16pt regular)
   - [ ] Caption text for hints (13pt)
   - [ ] Small text for tags/timestamps (11pt)
3. Switch to dark mode; verify all readable

#### Line Heights

- [ ] Display: 41pt (text is spacious, not cramped)
- [ ] Body: 20pt (comfortable reading distance)
- [ ] Small: 13pt (still readable)

#### Font Weights

- [ ] Bold (700): Headers, buttons, emphasis
- [ ] Regular (400): Body text, labels
- [ ] No extra-light or extra-bold

---

## Spacing Verification

### Token Scale (8px base unit)

| Token | Size | Used In         | Verified |
| ----- | ---- | --------------- | -------- |
| $1    | 8px  | Minimal margins | [ ]      |
| $2    | 16px | Item spacing    | [ ]      |
| $3    | 24px | Section gaps    | [ ]      |
| $4    | 32px | Card padding    | [ ]      |
| $5    | 40px | Screen padding  | [ ]      |
| $6    | 48px | Large gaps      | [ ]      |

**Verification Steps**:

1. Dashboard:
   - [ ] Cards have $4 padding (32px) on all sides
   - [ ] Item rows have $3 gap (24px) between them
   - [ ] Top/bottom navigation has $5 padding (40px)
2. Item detail:
   - [ ] Hero photo top padding is $4 (32px)
   - [ ] Text content has $4 padding (32px)
3. Settings:
   - [ ] Sections have $5 gap (40px) between
   - [ ] Toggle rows have $4 padding (32px)

#### Consistent Margins

- [ ] No random 10px, 14px, 18px values (should be multiples of 8)
- [ ] Padding inside containers is consistent ($4 for most cards)
- [ ] Gaps between sections are $5 or $6

---

## Radius Verification

### Border Radius Token

| Token | Size | Used In         | Verified |
| ----- | ---- | --------------- | -------- |
| $xs   | 4px  | Small tags      | [ ]      |
| $sm   | 8px  | Buttons, inputs | [ ]      |
| $md   | 12px | Cards           | [ ]      |
| $lg   | 16px | Bottom sheets   | [ ]      |
| $xl   | 20px | Large buttons   | [ ]      |

**Verification**:

- [ ] Small elements (tags, badges): $xs or $sm radius
- [ ] Cards: $md radius (not sharp)
- [ ] Buttons: $sm radius
- [ ] Bottom sheets: $lg radius at top
- [ ] No inconsistent radius values (e.g., 5px, 10px, 15px)

---

## Component Visual Consistency

### Buttons

- [ ] **Filled buttons** (primary):
  - Light: Green (#2F7D5B) background, white text
  - Dark: Green (#5FB389) background, dark text
  - Hover/press: Darkens slightly
  - Disabled: Muted green (#E8F2EC light / #1E3329 dark), gray text
  - Radius: $sm (8px)
  - Padding: $3 vertical, $4 horizontal

- [ ] **Tinted buttons** (secondary):
  - Light: Light green bg (#E8F2EC), green text (#2F7D5B)
  - Dark: Dark green bg (#1E3329), green text (#5FB389)
  - Hover: Slightly darker

- [ ] **Destructive buttons** (delete):
  - Light: Red (#C24A3E) background, white text
  - Dark: Red (#F07566) background, dark text
  - Disabled: Muted red (#FAE8E5 light / #3A1F1B dark)

### Cards

- [ ] **Inactive cards** (display only):
  - Radius: $md (12px)
  - Padding: $4 (32px)
  - Border: Subtle color
  - Background: Raised color
  - No shadow or minimal shadow

- [ ] **Interactive cards** (tap to open):
  - Same as above +
  - Hover state: Border color strengthens (Strong border)
  - Press state: Background darkens slightly
  - Ripple effect (if used): Subtle

### Input Fields

- [ ] Text input background: Sunken color
- [ ] Placeholder text: Tertiary color (muted)
- [ ] Border: Subtle color (when unfocused)
- [ ] Focused border: Strong color (#D2CFC7 light / #3A3F3B dark)
- [ ] Focused outline: 2px ring in primary brand color
- [ ] Clear button: Small "X" icon, tertiary color, hover darkens

### Status Badge

- [ ] Icon + text always paired (never color alone)
- [ ] Fresh: green icon + "Fresh" text
- [ ] Soon: yellow icon + "Use soon" text
- [ ] Urgent: red icon + "Eat today" text
- [ ] Expired: gray icon + "Expired" text
- [ ] Background matches status (fresh/soon/urgent/expired BG colors)

### Toggles / Switches

- [ ] Off state: Gray track, light/dark appropriate
- [ ] On state: Green track (#2F7D5B light, #5FB389 dark)
- [ ] Thumb position: Clearly moves left/right
- [ ] No animation stutter (smooth slide)

### Bottom Sheets

- [ ] Top radius: $lg (16px) — sharp bottom
- [ ] Background: Raised color
- [ ] Drag handle: Subtle gray pill (if visible)
- [ ] Content padding: $5 (40px)
- [ ] Closes on backdrop tap: Test with accessibility settings on

---

## Dark Mode Consistency

### Verification Checklist

**Light → Dark transition**:

1. Settings → Preferences → Theme → Dark
2. Return to each screen and verify:

- [ ] **Dashboard**:
  - Base background is very dark (#0E110F)
  - Cards are slightly lighter (#1A1F1B)
  - Text is light (#F4F2EE)
  - Status colors are adjusted (bright yellow for "Soon", lighter green)
  - No jarring contrast

- [ ] **Scan screen**:
  - Camera view is dark (appropriate)
  - Controls are readable (bright button text)
  - Mode tabs have sufficient contrast

- [ ] **Item detail**:
  - Hero photo isn't blown out by dark background
  - Text on backgrounds is readable
  - Status stripe uses dark-mode colors

- [ ] **Settings**:
  - Toggles are clearly on/off in dark
  - All section titles readable
  - No invisible text

### Color Transitions

- [ ] No colors that look good in light but terrible in dark (or vice versa)
- [ ] Status colors remain distinguishable in dark mode
- [ ] Text always has sufficient contrast

---

## Animation Polish

### Reduce Motion Setting

**Test with Accessibility → Reduce Motion → ON**:

- [ ] Animations disabled or instant (no springs, fades only)
- [ ] App is still responsive (no lag, no freezes)
- [ ] Haptics still fire (separate from animation setting)

**Then turn OFF Reduce Motion**:

- [ ] Smooth animations resume
- [ ] No jank or frame drops
- [ ] Transitions are 200-300ms (not too fast, not sluggish)

### Specific Animations

- [ ] **Pull-to-refresh**: Smooth spinner, completes in < 500ms
- [ ] **Item card tap**: Scale or fade, smooth feedback
- [ ] **Bottom sheet open/close**: Sliding motion, smooth
- [ ] **FAB button press**: Haptic + slight scale, no animation needed if on dark/reduce-motion

---

## Empty States

- [ ] Each major list has an empty state (dashboard, containers, recipes)
- [ ] Empty state includes:
  - [ ] Illustration (accessible={false}, decorative)
  - [ ] Header title (accessibilityRole="header")
  - [ ] Description text
  - [ ] Optional: Primary action button (e.g., "Add first item")
- [ ] Empty state is centered, not cramped
- [ ] Illustration is appropriately sized (200-300px wide)

---

## Error States

- [ ] Network error toast displayed:
  - [ ] Clear message (not just "Error")
  - [ ] Announced to screen reader
  - [ ] Optional: Retry button
- [ ] Form validation errors:
  - [ ] Error message appears near field
  - [ ] Text color is red (status/urgent)
  - [ ] Icon + text (not color alone)
- [ ] Offline mode:
  - [ ] "Offline" badge visible at top
  - [ ] All inputs still work (local-first)
  - [ ] No red X or angry warnings

---

## Touch Target Verification

### Minimum Size: 44pt (iOS) / 48dp (Android)

- [ ] All buttons: >= 44pt on all sides
- [ ] All interactive elements: >= 44pt minimum dimension
- [ ] Icons: 24pt (inside button container >= 44pt)
- [ ] Text inputs: >= 44pt height
- [ ] List rows: >= 48pt height (with padding)

**Verification Tool**: Xcode Accessibility Inspector or Android Accessibility Scanner

---

## Final Checklist (Day 34)

### Visual Consistency

- [ ] All brand colors consistent across screens
- [ ] All typography sizes correct (no random 15pt, 27pt)
- [ ] All spacing multiples of 8px
- [ ] All radius tokens applied (no 3px, 7px, 14px)

### Accessibility

- [ ] Dark mode readable (contrast >= 4.5:1)
- [ ] Status colors paired with icon/text (never color alone)
- [ ] Empty/error states fully designed
- [ ] Touch targets >= 44pt

### Responsiveness

- [ ] Layout works on iPhone SE (small) and iPhone 16 Pro Max (large)
- [ ] Text doesn't truncate unexpectedly
- [ ] Buttons remain tappable on all sizes

### Animations

- [ ] Reduce Motion respected (no springs when enabled)
- [ ] Smooth 60fps transitions
- [ ] No jank on slow devices

### Dark Mode

- [ ] All colors adjusted and readable
- [ ] No hardcoded light/dark colors in components
- [ ] Consistent appearance across both themes

---

## Sign-Off

**Designer/QA**: ********\_********  
**Date**: ********\_********  
**Light Mode**: [ ] PASS [ ] FAIL  
**Dark Mode**: [ ] PASS [ ] FAIL  
**Animation**: [ ] PASS [ ] FAIL  
**Overall**: [ ] READY FOR SUBMISSION [ ] NEEDS FIXES

**Issues Found** (if any):

1. ***
2. ***
3. ***

**Fix Due Date**: ********\_********
