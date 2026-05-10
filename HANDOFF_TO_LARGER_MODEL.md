# Handoff Document: HTML to React Visual Alignment

**Mission**: Make the React mobile app **visually identical** to the HTML mockup in every way. The HTML is the north star - nothing less than perfect visual parity will do.

---

## The Complete Picture

### What We Have

- **HTML Mockup** (`app.html`): Complete, polished design with 62 screens, all CSS, all interactions
- **React App** (`apps/mobile/`): 43 screens implemented, but styling is inconsistent and incomplete
- **Audit Document** (`VISUAL_ALIGNMENT_AUDIT.md`): Detailed breakdown of every difference
- **20 Concrete Tasks**: Specific, actionable work items

### The Gap

- **19 missing screens** to implement
- **40+ CSS color variables** need exact values
- **5 button variants** need precision styling
- **Item cards** missing the signature colored left stripe
- **TopBar** missing backdrop blur effect
- **FAB** animation needs spring curve adjustment
- **Typography** inconsistencies throughout
- **Spacing & padding** not pixel-perfect
- **All animations** need timing verification

### Success Criteria

Each pixel, color, animation, and interaction matches the HTML mockup exactly. This is a high-fidelity design-to-code project.

---

## The Exhaustive Task List (20 Items)

### CRITICAL PRIORITY (Do These First - Foundation)

**Task #2: Implement CSS Color Variables (40+ variables)**

- File: `apps/mobile/src/theme/tokens.ts`
- Brand, accents, status, surface, text, border colors
- All shadow definitions
- All border radius tokens
- Must match HTML exactly - this is foundational

**Task #3: Fix Button Component (All 5 Variants)**

- File: `apps/mobile/src/components/ui/Button.tsx`
- btn-primary, btn-secondary, btn-coral, btn-ghost, btn-icon
- Correct press animations (0.97 scale, 0.9 for icons)
- Correct shadow assignments
- Correct padding/sizing

**Task #4: Fix Card Component**

- File: `apps/mobile/src/components/ui/Card.tsx`
- Base card styling with raised bg, border, shadow
- card-flat and card-pressable variants
- Must use tokens from Task #2

**Task #5: Implement Item Card with Colored Stripe**

- The signature visual element of the app
- 4px left gradient stripe (status-specific)
- 52px square icon background
- Proper typography for name/metadata
- Used throughout items and dashboard

**Task #17: Fix Typography System**

- All screens and components use consistent sizes/weights
- h1, h2, body, caption, overline styles
- Exact font-family fallbacks
- Letter-spacing and line-height precision
- Font smoothing and feature settings

### HIGH PRIORITY (Do After Foundation)

**Task #6: Update TopBar with Backdrop Blur**

- File: `apps/mobile/src/components/ui/TopBar.tsx`
- Sticky with backdrop-filter: blur(20px) saturate(1.4)
- Dynamic border on scroll
- Proper z-index and padding

**Task #7: Fix Hero Stats**

- 3-column grid in dashboard
- 32px bold serif numbers
- Status-colored text
- Press scale 0.95

**Task #8: Implement Insight Card**

- Gradient background card
- Decorative radial gradient overlays
- White text on gradient
- Used on dashboard

**Task #9: Implement Streak Card**

- Large serif number display
- Flex row layout
- Used on dashboard

**Task #10: Fix FAB Styling**

- File: `apps/mobile/src/components/ui/FAB.tsx`
- 60px gradient circle
- Spring animation (0.3s cubic-bezier(0.34,1.56,0.64,1))
- Correct positioning and shadows

**Task #11: Fix TabBar Styling**

- File: `apps/mobile/src/components/ui/TabBar.tsx`
- 5 tabs with proper styling
- Active state indicator
- Safe area handling

**Task #12: Polish Dashboard Screen**

- Verify all components integrated correctly
- Proper spacing and layout
- All visual elements match HTML

**Task #13: Update Items List**

- Item cards with colored stripes
- Proper icon styling
- Metadata display
- Filter sections

**Task #14: Fix Settings Screens**

- Multiple sub-screens with consistent styling
- Profile, household, notifications, privacy, subscription, about, support, delete-account
- Proper row layouts and typography

### MEDIUM PRIORITY (Complete After High)

**Task #15: Update Recipes Screen**

- Recipe cards styling
- Ingredient list formatting
- Difficulty/rating display

**Task #16: Update Shopping List**

- Category grouping
- Checkbox styling
- Swipe actions

**Task #19: Add Responsive Design**

- Safe area insets
- Bottom padding for tab bar
- Proper breakpoints
- Notch handling

### LOWER PRIORITY (Final Phase)

**Task #18: Implement Missing 19 Screens**

- a11y, barcode-result, biometric, conflict, container-claim
- empty-state, gallery, lightbox, magic-consumed, manage-sub
- ocr-result, permission, receipt-scan, share-recipe, smart-home
- stickers, storage, temp-sensor, voice
- Each should match HTML design exactly

**Task #20: Test All Animations**

- Verify all press/hover states
- Confirm timing and scaling
- Test on actual mobile device

**Task #21: Verify Responsive Breakpoints**

- Test on different screen sizes
- Verify safe areas
- Check tab bar positioning

---

## Detailed Implementation Notes

### Colors (Task #2)

All 40+ CSS variables MUST be exact. These are used everywhere.

```
Brand: #0E5C3A (primary), #08402A (dark), #1F8B5C (light), #2DBC83 (glow), #E6F2EC (soft), #F2F8F4 (tint)
Status Fresh: #1F9956, Soon: #E08F1B, Urgent: #E0392B, Expired: #6B6B6B
And 30+ more... see VISUAL_ALIGNMENT_AUDIT.md for complete list
```

### Button Animations (Task #3)

- Normal buttons: scale 0.97 on press, 0.15s timing
- Icon buttons: scale 0.9 on press
- Cards: scale 0.98 on press
- Timing curve: cubic-bezier(0.4,0,0.2,1) (--quick)
- Transform duration: 0.15s
- Other properties: 0.2s

### Item Card Stripe (Task #5)

This is THE signature visual of the app. Must be perfect.

- Fresh: linear-gradient(180deg, #1F9956 0%, #34B86C 100%)
- Soon: linear-gradient(180deg, #E08F1B 0%, #F4B942 100%)
- Urgent: linear-gradient(180deg, #E0392B 0%, #FF6B47 100%)
- Expired: solid #6B6B6B
- Width: 4px (not 3, not 5)
- Position: left edge

### TopBar Blur (Task #6)

Required for modern feel:

```css
background: rgba(250,246,238,0.85) with backdrop-filter
backdrop-filter: blur(20px) saturate(1.4)
-webkit-backdrop-filter: blur(20px) saturate(1.4)
scrolled: background opacity 0.95, border visible
```

### Typography Sizes (Task #17)

Critical for visual hierarchy:

- h1 (Hero titles): 28px, 800 weight, Fraunces, -0.8px letter-spacing
- h2 (Section headers): 20px, 700 weight, Fraunces
- Item name: 17px, 700 weight, -0.2px letter-spacing
- Body: 15-16px, 400-600 weight
- Caption: 12-13px, 500-600 weight, t2 color
- Overline: 11px, 800 weight, uppercase

---

## File Structure Reference

### Components to Update/Create

```
apps/mobile/src/components/ui/
  ├── Button.tsx (Task #3)
  ├── Card.tsx (Task #4)
  ├── TopBar.tsx (Task #6)
  ├── TabBar.tsx (Task #11)
  ├── FAB.tsx (Task #10)
  ├── ItemCard.tsx (Task #5) [may need creation]
  ├── HeroStats.tsx (Task #7) [may need creation]
  ├── InsightCard.tsx (Task #8) [may need creation]
  └── StreakCard.tsx (Task #9) [may need creation]

apps/mobile/src/theme/
  └── tokens.ts (Task #2)

apps/mobile/app/(main)/
  ├── index.tsx (Task #12 - Dashboard)
  ├── items/
  │   └── index.tsx (Task #13 - Items List)
  ├── recipes.tsx (Task #15)
  ├── shopping.tsx (Task #16)
  ├── settings/ [multiple files] (Task #14)
  └── ... [other screens]
```

### Reference Files

- `app.html` - Master design reference (301KB)
- `VISUAL_ALIGNMENT_AUDIT.md` - Complete audit document
- `HOW_TO_VIEW_BOTH_VERSIONS.md` - Viewing instructions

---

## Testing Strategy

### Per Component (Immediate)

1. Update/create component
2. Check colors against tokens
3. Verify sizing and spacing
4. Test press/hover animations
5. Compare visually against HTML

### Per Screen (After 3-4 components done)

1. Navigate to same screen in both HTML and React
2. Side-by-side visual comparison
3. Use browser DevTools to inspect exact values
4. Fix any discrepancies
5. Move to next screen

### Final (After all tasks)

1. Test all 43+ screens
2. Test all animations and interactions
3. Test on actual mobile device
4. Verify responsive breakpoints
5. Check for regressions

---

## Success Checklist

- [ ] All 40+ color variables match HTML exactly
- [ ] All 5 button variants style and animate correctly
- [ ] Cards have correct styling with shadows and borders
- [ ] Item cards have the colored left stripe visible
- [ ] TopBar has backdrop blur effect
- [ ] Hero stats display with correct colors and sizing
- [ ] Insight and streak cards render correctly
- [ ] FAB has gradient and spring animation
- [ ] TabBar shows 5 tabs with proper styling
- [ ] Dashboard looks visually identical to HTML
- [ ] Items list matches HTML styling
- [ ] All settings screens styled consistently
- [ ] Recipes and shopping screens match HTML
- [ ] All typography sizing/spacing exact
- [ ] All animations timing correct (0.15s, 0.2s, etc.)
- [ ] Responsive design works at all breakpoints
- [ ] 19 missing screens implemented
- [ ] Zero visual differences from HTML mockup

---

## Context for the Larger Model

The user's explicit requirement: **"We love everything about the HTML so we will not settle for anything less."**

This is a design-to-code project where the HTML mockup is the complete specification. The React implementation must match it pixel-perfectly:

- Every color must be exact
- Every font size/weight must be exact
- Every spacing and padding must be precise
- Every animation timing must match
- Every interaction must work the same
- The overall feel and polish must be identical

This is high-fidelity work, not approximate styling. Use the HTML as the constant reference and make the React match it exactly.

---

## Quick Stats

- **Total Tasks**: 20 specific, actionable items
- **Critical Tasks**: 5 (foundation)
- **High Priority Tasks**: 11 (main implementation)
- **Medium/Lower Tasks**: 4 (polish and missing screens)
- **Audit Document**: Comprehensive breakdown of all 62 screens and 40+ CSS variables
- **Estimated Scope**: Large, but structured and well-documented
- **Success Criteria**: Visual parity with HTML mockup

Ready to implement? Start with Task #2 (colors), then #3 (buttons), then #4 (cards). Once those foundation pieces are solid, the rest will come together quickly.
