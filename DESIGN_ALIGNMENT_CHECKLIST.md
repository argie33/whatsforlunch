# React ↔ HTML Design Alignment Checklist

**Goal:** Make the React app match the HTML mockup exactly in look, feel, and functionality.
**Status:** Starting Phase — Full audit of design system and screens needed
**Last Updated:** 2026-05-08

---

## 📊 DESIGN SYSTEM (THE FOUNDATION)

### Color Palette

Your HTML has a **captivating, food-forward design system**. React needs to implement ALL these colors:

#### Brand Greens

- [ ] `--brand: #0E5C3A` (Primary - deep verdant green)
- [ ] `--brand-dark: #08402A` (Dark variant)
- [ ] `--brand-light: #1F8B5C` (Light variant)
- [ ] `--brand-glow: #2DBC83` (Glowing variant)
- [ ] `--brand-soft: #E6F2EC` (Soft background)
- [ ] `--brand-tint: #F2F8F4` (Tint background)

#### Accent Colors

- [ ] `--coral: #FF6B47` (Energy, urgency)
- [ ] `--coral-soft: #FFE5DD`
- [ ] `--honey: #F4B942` (Warmth, joy)
- [ ] `--honey-soft: #FDF1D9`
- [ ] `--berry: #C2185B` (Premium, indulgent)
- [ ] `--berry-soft: #FCE4EC`
- [ ] `--sky: #4A90E2` (Trust, calm)
- [ ] `--sky-soft: #E3F0FB`
- [ ] `--plum: #6B5B95` (Subscription, premium)
- [ ] `--plum-soft: #EFEBF7`

#### Status Colors

- [ ] `--fresh: #1F9956` (Good)
- [ ] `--fresh-bg: #E0F4E8`
- [ ] `--soon: #E08F1B` (Warning)
- [ ] `--soon-bg: #FCEFD3`
- [ ] `--urgent: #E0392B` (Alert)
- [ ] `--urgent-bg: #FBE0DD`
- [ ] `--expired: #6B6B6B` (Dead)
- [ ] `--expired-bg: #ECECEC`

#### Surface Colors

- [ ] `--bg: #FAF6EE` (Main background - warm cream)
- [ ] `--bg2: #F4EEDD`
- [ ] `--raised: #FFFFFF` (Card surfaces)
- [ ] `--sunken: #F5F1E5` (Pressed state)
- [ ] `--overlay: rgba(15,28,17,0.45)`

#### Text Colors

- [ ] `--t1: #0F1A11` (Primary text)
- [ ] `--t2: #4D5A4F` (Secondary text)
- [ ] `--t3: #7B8580` (Tertiary text)
- [ ] `--t-inv: #FFFFFF` (Inverse text)

#### Borders

- [ ] `--b1: #E8E0CC` (Primary border)
- [ ] `--b2: #D6CDB6` (Secondary border)

### Typography

#### Fonts

- [ ] Primary: **Inter** (400, 500, 600, 700, 800, 900)
- [ ] Display: **Fraunces** (serif; 500, 600, 700, 800)

#### Scale

- [ ] `.h1` — 34px, 800wt, -1.2px letter-spacing
- [ ] `.h2` — 28px, 800wt, -0.8px letter-spacing
- [ ] `.h3` — 22px, 700wt, -0.4px letter-spacing
- [ ] `.h4` — 18px, 700wt, -0.2px letter-spacing
- [ ] `.body` — 16px, line-height 1.45
- [ ] `.body-sm` — 14px, line-height 1.4, color: `var(--t2)`
- [ ] `.caption` — 12px, 600wt, 0.3px tracking, color: `var(--t2)`
- [ ] `.eyebrow` — 11px, 800wt, 1.5px tracking, UPPERCASE, color: `var(--t2)`

### Spacing & Radii

- [ ] `--r-xs: 8px`
- [ ] `--r-sm: 12px`
- [ ] `--r-md: 16px` (Most common)
- [ ] `--r-lg: 22px` (Cards)
- [ ] `--r-xl: 32px` (Large cards, modals)
- [ ] `--r-full: 9999px` (Pill buttons, avatars)

### Shadows

- [ ] `--s-1` — Subtle (1px, 2px drops)
- [ ] `--s-2` — Medium (2px, 8px drops)
- [ ] `--s-3` — Large (8px, 20px drops)
- [ ] `--s-glow` — Brand glow effect (8px, 32px, 25% opacity)
- [ ] `--s-coral` — Coral glow effect

### Animations

- [ ] `--spring: cubic-bezier(0.34,1.56,0.64,1)` (Bouncy)
- [ ] `--ease: cubic-bezier(0.16,1,0.3,1)` (Smooth)
- [ ] `--quick: cubic-bezier(0.4,0,0.2,1)` (Fast)

---

## 🖼️ COMPONENT LIBRARY

### Buttons

- [ ] `.btn-primary` — Brand green, glow shadow, scales to 0.97 on active
- [ ] `.btn-secondary` — White with border, scales to 0.97
- [ ] `.btn-ghost` — Transparent, green text, bg on hover
- [ ] `.btn-coral` — Coral background, coral glow
- [ ] `.btn-apple` — Black background
- [ ] `.btn-google` — White background, dark text, border
- [ ] `.btn-icon` — 44x44px, circular, white bg with border
- [ ] `.btn-icon.glass` — Frosted glass effect
- [ ] `.btn-block` — Full width
- [ ] `.btn-lg` — 18px padding, larger size

### Cards

- [ ] `.card` — White, border, soft shadow, 18px padding
- [ ] `.card-flat` — No border, no shadow
- [ ] `.card-pressable` — Scales 0.98 on active
- [ ] `.item-card` — Colored stripe on left (4px), flex layout
- [ ] `.recipe-card` — Image + body, border, shadow, scales 0.98
- [ ] `.detail-hero` — Large icon bg (280px height)
- [ ] `.insight` — Gradient bg (brand to brand-light), white text, glow shadow
- [ ] `.streak-card` — Coral+honey gradient, white text

### Form Elements

- [ ] `.input` — Full width, 16px padding, brand border on focus
- [ ] `.searchbar` — Icon + input, flexible, brand border on focus
- [ ] `.chip` — Pill-shaped, toggleable active state with glow
- [ ] `.picker` — Small button variant for selections
- [ ] `.toggle` — iOS-style toggle switch

### Layout Components

- [ ] `.topbar` — Sticky, blurred, 54px height, optional border on scroll
- [ ] `.tabbar` — Bottom navigation, 88px height with tab-safe area
- [ ] `.tab` — Flex column, scale icon on active, brand underline
- [ ] `.fab` — 60px circle, brand gradient, glow shadow, spring animation
- [ ] `.settings-section` — Rounded container with rows
- [ ] `.settings-row` — Left icon (colored bg), flex content, chevron right

### Data Display

- [ ] `.stat` — 3-column grid, status-colored numbers, border
- [ ] `.item-stripe` — 4px colored bar (fresh, soon, urgent, expired)
- [ ] `.item-badge` — Inline pill badge, status-colored
- [ ] `.hero-stats` — 3-stat grid display
- [ ] `.metric-card` — Large value + change indicator
- [ ] `.bar-chart` — Flex bars with gradient fills

### Specialized

- [ ] `.empty` — Centered empty state with emoji circle
- [ ] `.splash` — Full-screen brand gradient with floaty animation
- [ ] `.onboard-page` — Centered onboarding page
- [ ] `.scan` — Dark bg for camera, frame corners, scanline animation
- [ ] `.detail-body` — Rounded top on item/recipe detail
- [ ] `.notif` — Notification card with left accent stripe

---

## 🎬 SCREENS INVENTORY

### Current React Screens

These exist in the React codebase:

**Auth Flow:**

- [x] Auth/Onboarding (partially)
- [x] Settings (various)
- [x] Profile/Account

**Main App:**

- [x] Dashboard (index.tsx)
- [x] Items List (items/index.tsx)
- [x] Add Item (items/new.tsx)
- [x] Item Detail (items/[id].tsx)
- [x] Recipes (recipes.tsx)
- [x] Recipe Detail (recipes/[id].tsx)
- [x] Analytics/Stats
- [x] Containers
- [x] Search
- [x] Various settings sub-screens

**Missing/To Match:**

- [ ] Splash screen
- [ ] Onboarding flow (4 pages with dots)
- [ ] Magic link sent screen
- [ ] All dashboard "quick actions" cards styled correctly
- [ ] Insight/savings cards styled correctly
- [ ] Streak card
- [ ] Scan screen (dark, with frame, camera overlay)
- [ ] And 40+ more screens...

### HTML-Designed Screens (57 Total)

1. screen-splash ✓
2. screen-onboarding (4 pages) ✓
3. screen-auth ✓
4. screen-magic ✓
5. screen-dashboard ✓
6. screen-items ✓
7. screen-add ✓
8. screen-scan ✓
9. screen-detail ✓
10. screen-recipes ✓
11. screen-recipe-detail ✓
12. screen-analytics ✓
13. screen-achievements ✓
14. screen-containers ✓
15. screen-shopping ✓
16. screen-notifications ✓
17. screen-settings ✓
18. screen-household ✓
19. screen-invite ✓
20. screen-activity ✓
21. screen-profile-edit ✓
22. screen-cooking ✓
23. screen-restaurants ✓
24. screen-recap ✓
25. screen-ai-result ✓
26. screen-ocr-result ✓
27. screen-barcode-result ✓
28. screen-container-claim ✓
29. screen-container-detail ✓
30. screen-stickers ✓
31. screen-receipt-scan ✓
32. screen-receipt-review ✓
33. screen-digest ✓
34. screen-paywall ✓
35. screen-privacy-policy ✓
36. screen-export ✓
37. screen-delete-account ✓
38. screen-support ✓
39. screen-notif-prefs ✓
40. screen-dietary ✓
41. screen-ai-usage ✓
42. screen-intake ✓
43. screen-friends ✓
44. screen-gallery ✓
45. screen-share-recipe ✓
46. screen-smart-home ✓
47. screen-temp-sensor ✓
48. screen-tos ✓
49. screen-permission ✓
50. screen-magic-consumed ✓
51. screen-signup ✓
52. screen-search ✓
53. screen-voice ✓
54. screen-achievement-unlock ✓
55. screen-lightbox ✓
56. screen-conflict ✓
57. screen-manage-sub ✓
    (+ more...)

---

## 🎨 DESIGN PRIORITY PHASES

### Phase 1: Foundation (Design System) — THIS WEEK

**Make sure ALL colors, fonts, spacing, and animations are available in React**

- [ ] Create `lib/theme.ts` or Tailwind config with all CSS variables
- [ ] Set up global styles with Inter + Fraunces fonts
- [ ] Create reusable color palette constants
- [ ] Verify spacing scale (radii, padding, gaps)
- [ ] Test all shadow variants

### Phase 2: Component Library — NEXT WEEK

**Build/refactor all UI components to match HTML exactly**

- [ ] Button variants (primary, secondary, ghost, coral, icon, lg, block)
- [ ] Card variants (default, flat, pressable, item, recipe)
- [ ] Form inputs (input, searchbar, chip, picker, toggle)
- [ ] Layout (topbar, tabbar, fab, settings section/row)
- [ ] Data display (stat grid, item stripe, badge, metric card)
- [ ] Specialized (empty state, splash, detail hero, insight card)

### Phase 3: Screen-by-Screen — FOLLOWING WEEKS

**Match each screen's layout, typography, colors, spacing, and interactions**

Priority order (based on user journey):

1. Splash → Onboarding → Auth → Magic link → Dashboard
2. Items → Add item → Item detail → Recipes → Recipe detail
3. Analytics, Containers, Settings
4. Secondary features (Shopping, Activity, Achievements, etc.)

---

## 🔍 HOW TO SEE BOTH SIDE BY SIDE

### Option 1: Browser-Based (Easiest)

```bash
# Terminal 1: Start your web dev server
cd C:\Users\arger\code\whatsforlunch\apps\web
npm run dev
# Open: http://localhost:3000

# Terminal 2: Start your mobile dev server
cd C:\Users\arger\code\whatsforlunch\apps\mobile
npm run web
# Open: http://localhost:8081

# Then open C:\Users\arger\code\whatsforlunch\app.html in another browser tab
# This shows the HTML mockup in a phone frame
```

### Option 2: Side-by-Side Comparison

Open all three in split-screen windows:

- **Left:** app.html (HTML mockup in phone frame)
- **Middle:** http://localhost:8081 (React web version)
- **Right:** React code (VS Code)

### Option 3: Direct File Comparison

Use a diff/comparison tool to compare:

- HTML styles (app.html: lines 15-1600 contain all CSS)
- React component styles (apps/mobile/components/)

---

## ✅ NEXT STEPS

### Immediate (Today)

1. [ ] Review this checklist with the design system
2. [ ] Open app.html in browser to see the target design
3. [ ] Take screenshot comparisons of key screens
4. [ ] Identify which screens are most used first

### Short Term (This Week)

1. [ ] Extract ALL colors from HTML into React theme constants
2. [ ] Install Fraunces font in React
3. [ ] Create base component library stubs
4. [ ] Start with 2-3 most critical screens (Splash, Auth, Dashboard)

### Medium Term (Next 2 Weeks)

1. [ ] Refactor all existing components to match design system
2. [ ] Build missing component variants
3. [ ] Test all interactions match HTML (button scales, transitions, etc.)
4. [ ] Progressive enhancement: screen by screen

---

## 📋 TRACKING

Use this as your source of truth. Check off items as you implement them.

**Current Progress:**

- Design System: 0%
- Component Library: 0%
- Screen Alignment: ~30% (some screens partially match)

**Goal:** 100% visual parity with app.html

---

**Questions to clarify:**

- Which screens are used most frequently in your workflow? (Priority those first)
- Do you want to use Tailwind CSS or CSS-in-JS for the design system?
- Should I start with the design system foundation or jump to a critical screen first?
