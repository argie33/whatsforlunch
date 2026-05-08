# React ↔ HTML Alignment Checklist

## North Star: Match `app.html` Exactly

The HTML mockup is the source of truth. React must replicate every visual, interaction, and behavioral detail.

---

## STATUS OVERVIEW

### ✅ Currently Aligned

- **Color Tokens** — All brand colors, accents, status colors match design tokens
- **Typography System** — h1-h4, body, body-sm, caption, eyebrow all defined
- **Dashboard/Home Screen** — Overall layout matches, stats cards, hero sections present
- **Navigation Structure** — 5-tab structure (Home, Inventory, Scan, Recipes, More) matches HTML

### ⚠️ Needs Review/Fixes

- **Item Cards** — Stripe colors, layout, interaction states need verification
- **Detail Screens** — Item detail hero, action buttons, layout details
- **Form/Input Styling** — Search bar, text fields need polish
- **Button Styles** — All button variants (primary, secondary, ghost, icon, fab)
- **Modal/Transitions** — Slide up animations, fade effects
- **Settings/Navigation** — Settings screens may need layout review

---

## DETAILED ALIGNMENT REVIEW

### 1. COLOR SYSTEM ✅ (Mostly Done)

**HTML Source:**

- Brand: `#0E5C3A` (deep verdant green)
- Accents: Coral, Honey, Berry, Sky, Plum + soft versions
- Status: Fresh, Soon, Urgent, Expired with backgrounds
- Surface: Base, Raised, Sunken with warm premium feel
- Text: Primary, Secondary, Tertiary, Inverse
- Borders: Subtle, Strong

**React Status:** ✅ All tokens in `src/theme/tokens.ts` match exactly

- [ ] Verify dark mode versions match intent
- [ ] Check all color usages in screens match intended status/role

### 2. TYPOGRAPHY SYSTEM ✅ (Complete)

**HTML Definitions:**

```
h1: 34px 800 -1.2px letter-spacing
h2: 28px 800 -0.8px letter-spacing
h3: 22px 700 -0.4px letter-spacing
h4: 18px 700 -0.2px letter-spacing
body: 16px 400 1.45 line-height
body-sm: 14px 400 1.4 line-height
caption: 12px 600 0.3px letter-spacing uppercase
eyebrow: 11px 800 1.5px letter-spacing uppercase
serif: Fraunces (for numbers in stats, insight titles)
```

**React Status:** ✅ Defined in `src/theme/tokens.ts`

- [ ] Verify all heading sizes use correct typography
- [ ] Check serif font (Fraunces) for stat numbers and cards
- [ ] Ensure letter-spacing applied consistently

### 3. BUTTON SYSTEM

**HTML Button Variants:**

```
.btn-primary: Brand background, white text, glow shadow, scale 0.97 on active
.btn-coral: Coral background, white text, coral shadow
.btn-secondary: White background, text color, subtle border, sunken bg on active
.btn-ghost: Transparent bg, brand text, brand-soft on active
.btn-icon: 44px circular, white bg, subtle border, centered icon
.btn-icon.glass: Frosted glass effect, light backdrop-filter
.fab: 60px circular, gradient (brand → brand-light), glow shadow, scale effects
```

**React Status:** ⚠️ Partially implemented

- [ ] Review Dashboard home FAB button — matches spec?
- [ ] Check all icon buttons (notification, settings, search, more) — correct size, border, styling?
- [ ] Verify button hover/active states (scale, shadow, color)
- [ ] Check FAB gradient direction and scale animations
- [ ] Glass button effect on item detail actions

### 4. CARDS & CONTAINERS

**HTML Specifications:**

#### Item Card

```
Structure:
  - 4px colored stripe (fresh/soon/urgent/expired gradient)
  - Content flex container
  - Icon: 52px square, rounded 12px, status-colored background
  - Info: name (17px 700), meta (13px secondary), optional badge
  - Pressable with scale 0.98 on active, shadow on hover

Stripe Gradients:
  - Fresh: #1F9956 → #34B86C
  - Soon: #E08F1B → #F4B942
  - Urgent: #E0392B → #FF6B47
  - Expired: #6B6B6B (solid)
```

**React Status:** ⚠️ Needs verification

- [ ] Item card stripe colors — use gradients or solid?
- [ ] Item card icon background — correct status color applied?
- [ ] Item card dimensions, padding, borders — match spec exactly?
- [ ] Hover/active interactions — shadow change, scale?
- [ ] Badge styling — correct padding, radius, typography?

#### Stat Card (Hero Stats)

```
Grid: 3 columns, 10px gap
Each:
  - 52px × 52px background, rounded 16px (actually 22px in token), border
  - Large number (32px 800 -1.5px, serif font, colored by status)
  - Label (12px 600, secondary text)
  - Pressable: scale 0.95 on active
  - Optional: gradient overlay on hover (opacity 0.5)
```

**React Status:** ⚠️ Needs review

- [ ] Stat card size — 52px or 54px? Check padding + border
- [ ] Number font — is it serif (Fraunces)?
- [ ] Hover gradient overlay — is it present?
- [ ] Active scale — 0.95 correct?
- [ ] Gap spacing — 10px between cards?

#### Insight Card

```
Gradient background: Brand primary → brand-light
Color: White text
Padding: 22px
Position: relative (overflow hidden for decorative circles)

Decorative elements:
  - ::before circle (top-right): 180px, radial gradient white 15% transparent
  - ::after circle (bottom-left): 140px, radial gradient white 8% transparent

Content structure:
  - Eyebrow: 11px 800 uppercase 2px spacing 85% opacity
  - Title: 26px 800 -0.6px serif font
  - Text: 14px 92% opacity max-width 75%
  - Icon: 56px circular, white 18% bg, backdrop blur, centered emoji

Shadow: glow shadow (brand color 0.25 opacity)
```

**React Status:** ⚠️ Partially done

- [ ] Decorative circle position and size — correct?
- [ ] Title font — is it serif?
- [ ] Icon style — is it the right size, background opacity?
- [ ] Text max-width — 75% constraint?
- [ ] Shadow — using brand glow shadow?

#### Streak Card

```
Gradient: Coral → Honey
Padding: 18px, margin: 0 22px 16px
Flex: align center, gap 14px
Position: relative (overflow hidden for 🔥 emoji)

Number: 40px 900 serif -2px spacing
Title: 18px 800 white
Subtitle: 13px 95% opacity

Decorative: 🔥 absolute top -10 right -10, font-size 100px, 15% opacity
Shadow: coral shadow
```

**React Status:** ⚠️ Needs verification

- [ ] Number font — is it serif?
- [ ] Emoji size — 100px correct?
- [ ] Subtitle positioning and styling?
- [ ] Shadow effect — coral glow?

### 5. NAVIGATION & LAYOUT

#### Tab Bar

```
Background: rgba(250,246,238,0.85) with backdrop-filter blur(20px) saturate(1.4)
Height: 88px
Padding: top 8px, bottom 28px
Border: 0.5px solid border/subtle
Icons: 22px emoji, opacity 0.5 inactive, 1 active
Labels: 10px 700 uppercase 0.2px spacing, margin-top 3px
Active tint: brand/primary
Inactive tint: text/tertiary
Center "Scan" button: special treatment (large circular, floating up)
```

**React Status:** ⚠️ Partially implemented

- [ ] Backdrop filter blur + saturate on tab bar?
- [ ] Tab bar background opacity correct?
- [ ] Icon opacity states (0.5 inactive, 1 active)?
- [ ] Label styling — 10px, 700, uppercase, letter-spacing?
- [ ] Scan button — circular, positioned correctly, grows on focus?

#### Top Bar (on screens with content)

```
Sticky positioning
Padding: 12px 22px 18px
Background: rgba(250,246,238,0.85) with backdrop blur(20px) saturate(1.4)
Border-bottom: 0.5px solid transparent initially, becomes border/subtle when scrolled
Z-index: 5

Content:
  - Left: flex column (title, optional subtitle) gap 2px
  - Right: flex row gap 8px (action icons, usually notifications + user avatar)
```

**React Status:** ⚠️ Needs implementation

- [ ] Is there a sticky top bar with title on screens?
- [ ] Does border-bottom appear on scroll?
- [ ] Backdrop filter effect?
- [ ] Proper z-index and layering?

### 6. STATUS & VISUAL INDICATORS

#### Status Badge

```
HTML structure: padding 5px 10px, border-radius full, uppercase, 11px 700, 0.4px spacing

States:
  - Fresh: background fresh-bg, text fresh color
  - Soon: background soon-bg, text soon color
  - Urgent: background urgent-bg, text urgent color
  - Expired: background expired-bg, text expired color
```

**React Status:** ⚠️ Needs verification

- [ ] Badge padding — 5px 10px?
- [ ] Font size — 11px?
- [ ] Font weight — 700?
- [ ] Text transform — uppercase?
- [ ] Colors — match status exactly?

#### Item Icon Background

```
Status-specific backgrounds:
  - Fresh: #E0F4E8
  - Soon: #FCEFD3
  - Urgent: #FBE0DD
  - Expired: #ECECEC
Size: 52px × 52px
Border-radius: 12px (r-md)
Inset shadow: 0 0 0 1px rgba(0,0,0,0.04)
```

**React Status:** ⚠️ Check implementation

- [ ] Icon backgrounds using correct status colors?
- [ ] Size — 52px square with rounding?
- [ ] Inset shadow — is it there?

### 7. SCREENS TO VERIFY

#### Home/Dashboard Screen

**Should have:**

1. ✅ Topbar with "Welcome back" + synced pill + greeting
2. ✅ Notification bell + user avatar buttons (top right)
3. ✅ Hero stats (3 columns: Fresh, Use soon, Eat today)
4. ✅ "Today's Pick" coral CTA card with gradient overlay
5. ✅ Insight card (savings info) with decorative circles
6. ✅ Streak card (days, zero waste message)
7. ✅ "Eat soon" section (3 items, sortable)
8. ✅ "Tonight's ideas" section (recipe carousel or single card)
9. ✅ "Quick actions" grid (10 cards in 2 columns)
10. ✅ Premium upsell card (berry colored)
11. ✅ Weekly recap card (brand gradient)
12. ✅ Floating FAB button for adding items

**React Status:** ⚠️ Mostly present, needs detail check

- [ ] All sections rendering?
- [ ] Correct card styles, shadows, spacing?
- [ ] FAB button styling and positioning?
- [ ] Quick actions grid — correct layout?

#### Items/Inventory Screen

**Should have:**

1. Header (counts, title, action buttons)
2. Search bar (22px horizontal padding, 48px height, magnifying glass)
3. Filter pills (All, Urgent, Fridge, Freezer, Pantry, Counter)
4. Item cards with status stripes
5. Empty state (emoji + message) when no items
6. Bulk selection mode (checkboxes, action bar)

**React Status:** ⚠️ Partially implemented

- [ ] All UI elements present?
- [ ] Item card styling matches spec?
- [ ] Search bar styled correctly?
- [ ] Empty state visual?
- [ ] Filter pills — interaction, styling?

#### Item Detail Screen

**Should have:**

1. Hero section (status color background, large emoji)
2. Back button (top-left, glass morphism white)
3. Action buttons (top-right: heart/favorite + more menu, glass style)
4. Status badge
5. Item name (large heading)
6. Metadata (expiry, location, category)
7. Action buttons: Eaten, Frozen, Tossed, Snooze, Partial, Move
8. Delete button (destructive style)
9. Notes/history (if available)

**React Status:** ⚠️ Partially implemented

- [ ] Hero background color based on status?
- [ ] Glass button styling — backdrop filter?
- [ ] All action buttons present and styled?
- [ ] Action button interactions?
- [ ] Delete button — red/destructive style?

#### Recipe Detail Screen

**Should have:**

1. Header with recipe name
2. Ingredients list with status indicators
3. Instructions
4. Cook time, servings
5. Actions: Cook, Save, Share

**React Status:** ⚠️ Check implementation

- [ ] Screen exists and renders?
- [ ] Layout and styling?

#### Settings Navigation

**Should have:**

1. Settings hub screen (links to sub-pages)
2. Sub-screens: Profile, Preferences, Households, Notifications, Privacy, Subscription, About, Delete Account, Support

**React Status:** ⚠️ Needs verification

- [ ] All settings screens implemented?
- [ ] Navigation working?
- [ ] Styling consistent with design system?

### 8. ANIMATIONS & INTERACTIONS

**HTML Specifies:**

```
Transitions:
  - Screen transitions: 0.45s ease cubic-bezier(0.16,1,0.3,1)
  - Button interactions: 0.15s quick cubic-bezier(0.4,0,0.2,1)
  - Shadow/background: 0.2s quick

Button scales:
  - Primary: 0.97 on active
  - Icon: 0.9 on active
  - Card pressable: 0.98 on active
  - Stat: 0.95 on active
  - FAB: 0.92 on active, 1.05 on hover

FAB special: scale up on focus with spring curve
```

**React Status:** ⚠️ Partially implemented

- [ ] Screen transitions smooth and timed correctly?
- [ ] Button scale interactions working?
- [ ] FAB animations correct?
- [ ] All pressable elements have proper feedback?

### 9. SHADOWS & ELEVATION

**HTML Shadow System:**

```
--s-1: 0 1px 2px rgba(15,26,17,0.04), 0 2px 6px rgba(15,26,17,0.04)
--s-2: 0 2px 4px rgba(15,26,17,0.04), 0 8px 20px rgba(15,26,17,0.07)
--s-3: 0 8px 16px rgba(15,26,17,0.06), 0 20px 40px rgba(15,26,17,0.10)
--s-glow: 0 8px 32px rgba(14,92,58,0.25)     [brand primary with 25% opacity]
--s-coral: 0 8px 24px rgba(255,107,71,0.30) [coral with 30% opacity]
```

**React Status:** ⚠️ Needs verification

- [ ] Glow shadow on brand elements?
- [ ] Coral shadow on coral cards?
- [ ] Card shadows — s-1 or s-2?
- [ ] FAB shadow — glow?
- [ ] All colored elements have matching shadow?

### 10. SPACING & RADII

**HTML Token System:**

```
Radii:
  --r-xs: 8px
  --r-sm: 12px
  --r-md: 16px
  --r-lg: 22px
  --r-xl: 32px
  --r-full: 9999px

Padding/Spacing:
  Main horizontal: 22px
  Sections: 8px 22px 16px (top/horizontal/bottom for padding)
  Cards: 18px internal
  Stat cards: 16px 14px
  Icon buttons: 44px diameter
  FAB: 60px diameter
```

**React Status:** ⚠️ Needs spot-check

- [ ] All paddings using 22px horizontal?
- [ ] Card padding 18px?
- [ ] Border radii consistent with token?
- [ ] Icon button size 44px?
- [ ] FAB size 60px?

---

## IMPLEMENTATION PRIORITY

### Phase 1: Foundation (Critical)

1. **Verify all color/shadow/token usage** — spot-check 5-10 screens
2. **Confirm button interactions** — test all button types for correct scale/shadow
3. **Check card styling** — item cards, stat cards, insight cards exact match
4. **Test navigation transitions** — smooth, correct timing

### Phase 2: Details (Polish)

1. **Typography verification** — ensure all text uses correct sizes/weights
2. **Spacing audit** — padding, margins, gaps all correct
3. **Icon styling** — size, color, states
4. **Empty states** — verify styling and messaging

### Phase 3: Advanced (Refinement)

1. **Animation timing** — match cubic-bezier curves and durations
2. **Gesture feedback** — ensure all interactions feel responsive
3. **Dark mode consistency** — if supported, verify colors/contrast
4. **Edge cases** — long text truncation, overflow states

---

## VIEW BOTH SIDE-BY-SIDE

### HTML Mockup

**File:** `C:\Users\arger\code\whatsforlunch\app.html`
**How to view:**

```bash
# Option 1: Open in browser
open app.html
# or drag file to Chrome/Safari

# Option 2: Use local server
python -m http.server 8000
# Then visit: http://localhost:8000/app.html
```

### React App (Mobile)

**How to view:**

```bash
cd apps/mobile
npm run dev
# Opens Expo dev client
# Use phone/simulator to view app

# Or web preview:
npm run web
# Opens at http://localhost:19006
```

### Comparison Approach

1. **Open HTML in desktop browser** — full screen on one monitor/window
2. **Open React in mobile simulator** — side by side or alternate windows
3. **Screen-by-screen:**
   - Home → Home
   - Items list → Items/Inventory
   - Item detail → Items/[id]
   - Recipes → Recipes
   - Settings → Settings
4. **Test interactions:**
   - Button presses, screen transitions, form inputs
   - Scroll behavior, overflow states
   - Dark mode (if applicable)

---

## NOTES FOR IMPLEMENTATION

- **Don't assume:** Every visual detail in HTML is intentional. Verify before implementing.
- **Measure carefully:** Use browser DevTools to inspect exact sizes, colors, spacing in HTML.
- **Test on device:** React Native on actual phone/simulator will look different than web — prioritize that.
- **Gradients:** Item stripe gradients may need special handling in React Native.
- **Shadows:** React Native shadows use different props — verify they render correctly.
- **Typography:** Ensure Inter and Fraunces fonts are loaded and used correctly.

---

## NEXT STEPS

1. ✅ Review this checklist against both versions
2. ⏭️ Create detailed diff document (HTML vs React, screen by screen)
3. ⏭️ Start fixing from Phase 1 items
4. ⏭️ Test each change on actual device
5. ⏭️ Take screenshots side-by-side to verify alignment
