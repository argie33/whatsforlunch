# HTML to React Visual Alignment Audit

## Executive Summary

- **HTML Screens**: 62 complete screen designs
- **React Screens**: 43 implemented screens
- **Gap**: 19 missing/incomplete screens
- **Key Issues**: Component styling, color system inconsistencies, animation, layout precision

## A. MISSING SCREENS (19 screens)

1. screen-a11y (Accessibility)
2. screen-barcode-result (Barcode scan results)
3. screen-biometric (Biometric auth)
4. screen-conflict (Sync conflict resolution)
5. screen-container-claim (Container claiming)
6. screen-empty-state (Generic empty state)
7. screen-gallery (Photo gallery)
8. screen-lightbox (Lightbox viewer)
9. screen-magic-consumed (Magic link consumed)
10. screen-manage-sub (Subscription mgmt)
11. screen-ocr-result (OCR results)
12. screen-permission (Permissions screen)
13. screen-receipt-scan (Receipt scanner UI)
14. screen-share-recipe (Recipe sharing)
15. screen-smart-home (Smart home)
16. screen-stickers (Sticker pack)
17. screen-storage (Storage mgmt)
18. screen-temp-sensor (Temp sensor)
19. screen-voice (Voice commands)

## B. CRITICAL COMPONENT STYLING GAPS

### Button Variants (HTML has 5 types, React may be inconsistent)

- `.btn-primary`: Green brand with glow shadow, scale 0.97 on press
- `.btn-secondary`: Raised with 1.5px border, scale 0.97 on press
- `.btn-coral`: Coral red with coral shadow, scale 0.97 on press
- `.btn-ghost`: Transparent, brand text, background on press
- `.btn-icon`: 44px circle, scale 0.9 on press
- All with proper transitions: 0.15s transform (var --quick), 0.2s others

### Card System

- `.card`: Raised bg, 1px border (--b1), shadow (--s-1), 18px padding, 22px border-radius
- `.card-pressable`: scale 0.98 on active with 0.15s transition
- React needs exact styling match in Tamagui

### Color System (40+ CSS Variables)

**Brand**: #0E5C3A (primary), #08402A (dark), #1F8B5C (light), #2DBC83 (glow), #E6F2EC (soft), #F2F8F4 (tint)
**Accents**: coral (#FF6B47), honey (#F4B942), berry (#C2185B), sky (#4A90E2), plum (#6B5B95) + soft versions
**Status**: fresh (#1F9956), soon (#E08F1B), urgent (#E0392B), expired (#6B6B6B) + bg variants
**Surface**: bg (#FAF6EE), bg2 (#F4EEDD), raised (#FFFFFF), sunken (#F5F1E5), overlay
**Text**: t1 (#0F1A11), t2 (#4D5A4F), t3 (#7B8580), t-inv (#FFFFFF)
**Border**: b1 (#E8E0CC), b2 (#D6CDB6)
**Radii**: r-xs (8px), r-sm (12px), r-md (16px), r-lg (22px), r-xl (32px), r-full (9999px)
**Shadows**: s-1 (subtle), s-2 (medium), s-3 (large), s-glow (brand glow), s-coral (coral glow)

### Item Card Styling (Complex)

- Left stripe: 4px wide, gradient background (status-specific)
  - fresh: linear-gradient(180deg, #1F9956 0%, #34B86C 100%)
  - soon: linear-gradient(180deg, #E08F1B 0%, #F4B942 100%)
  - urgent: linear-gradient(180deg, #E0392B 0%, #FF6B47 100%)
  - expired: solid #6B6B6B
- Icon: 52px square, status-colored background, 28px emoji font
- Name: 17px bold, -0.2px letter-spacing, color t1
- Meta: 13px gray (t2), 6px gaps between items
- Badge: 11px bold, 5px 10px padding, status-colored
- Press: scale 0.98 with 0.15s transition
- Hover: shadow s-2

### Topbar/Header

- Sticky, padding 12px 22px 18px
- Background: rgba(250,246,238,0.85) with blur(20px) saturate(1.4)
- Border-bottom: 0.5px transparent → appears on scroll
- Scrolled state: bg 0.95 opacity, border color b1
- Z-index: 5
- Content: gap 2px (title), flex gap 8px (actions)

### Hero Stats

- 3-column grid, 10px gap, padding 4px 22px 16px
- Each stat: raised card, 16px 14px padding, border b1
- Number: 32px bold serif, status-colored
- Label: 12px gray, 600 weight
- Press: scale 0.95
- Hover: gradient overlay opacity 0.5

### Insight Card

- Full width with 22px padding, 4px top 22px sides margin
- Background: linear-gradient(135deg, brand 0%, brand-light 100%)
- Border-radius: 32px (r-xl)
- Shadow: s-glow
- Color: white text
- Decorative overlays: 2 radial gradients with rgba white overlays
- Content: flex row with icon on right

### Streak Card

- Large serif number (40px+), bold
- Adjacent text: flex column with 18px bold serif header
- Label: smaller gray text
- Full width section padding

### FAB (Floating Action Button)

- 60px diameter circle
- Background: linear-gradient(135deg, brand 0%, brand-light 100%)
- Position: absolute, bottom 100px, right 22px
- Border-radius: 9999px (full)
- Shadow: s-glow + 0 4px 12px rgba(14,92,58,0.4)
- Icon: 28px, white, font-weight 300
- Z-index: 25
- Press: scale 0.92 with 0.3s spring animation

## C. ANIMATION TIMING

HTML animation curves:

- `--spring`: cubic-bezier(0.34,1.56,0.64,1) [used for FAB]
- `--ease`: cubic-bezier(0.16,1,0.3,1)
- `--quick`: cubic-bezier(0.4,0,0.2,1) [used for all interactions]

Standard durations:

- Transform press: 0.15s with --quick
- Other properties: 0.2s with --quick
- FAB animations: 0.3s with --spring

## D. TYPOGRAPHY PRECISION

Font family: 'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui
Serif family: 'Fraunces', Georgia, serif

Key sizes:

- h1: 28px, weight 800, -0.8px letter-spacing, 31px line-height (Fraunces)
- h2: 20px, weight 700, serif, -0.3px letter-spacing
- Item name: 17px, weight 700, -0.2px letter-spacing
- Body: 16px, weight 400
- Caption: 12px, weight 500-600, color t2
- Overline: 11px, weight 800, uppercase, 0.4px letter-spacing

All with:

- -webkit-font-smoothing: antialiased
- -moz-osx-font-smoothing: grayscale
- text-rendering: optimizeLegibility
- font-feature-settings: 'cv11', 'ss01'

## E. LAYOUT & SPACING

Standard measurements:

- Horizontal padding: 22px (section edge)
- Section padding: 8px 22px (vertical), 16px (bottom)
- Card padding: 18px
- Icon button: 44px (both w/h)
- Gap values: 10px (cards), 8px (standard), 6px (compact), 5px (meta items)
- Button padding: 18px 28px (lg), varies by type
- Top bar: 12px 22px 18px padding
- Scroll padding-bottom: 80px+ (for tab bar safety)

## F. CRITICAL SCREENS TO FIX

### Dashboard (HIGH PRIORITY)

HTML includes:

- Welcome message with synced status pill
- Notification badge (9px red dot)
- 3-stat hero grid with onclick handlers
- Gradient "Today's pick" card
- Insight card (white text on gradient)
- 7-day streak card
- "Eat soon" section with item cards
- "Tonight's ideas" recipe cards
- Quick actions grid (shopping, scan, etc.)
- Proper section headers with serif fonts

### Items List (HIGH PRIORITY)

- Colored left stripe on each item card
- Proper icon styling (52px square)
- Metadata: container chip + days text + dot separator
- Status badges
- Swipe/delete actions
- Filter sections

### Settings Screens (HIGH PRIORITY)

Multiple screens need styling:

- Profile, household, notifications, privacy, subscription, about, support, delete account
- Consistent row styling throughout
- Proper navigation back buttons
- Form inputs and toggles

### Shopping List (MEDIUM-HIGH)

- Category grouping
- Checkboxes with brand accent color
- Swipe to delete
- Item count displays

### Recipes (MEDIUM)

- Recipe cards with image placeholders
- Ingredient list formatting
- Difficulty badges
- Rating displays

## G. RESPONSIVE DESIGN

Phone frame dimensions:

- Width: max 420px (min 100%)
- Height: max 900px (min 100vh)
- Border radius: 48px (desktop), 0 (mobile)
- Status bar: 54px height (fixed)
- Notch: 110px wide, 30px height (iPhone style)
- Safe area: 28px horizontal padding for status bar

At < 480px: removes frame styling, goes edge-to-edge.

## H. TESTING CHECKLIST

For each updated component:

- [ ] All colors use correct CSS variable values
- [ ] Border radius matches spec (mostly 22px for cards, 32px for featured)
- [ ] Font sizes within 1px of spec
- [ ] Letter-spacing exact (check with -0.x notation)
- [ ] Line-height appropriate (usually 1 for headers, 1.15+ for body)
- [ ] All shadows match blur/spread/opacity exactly
- [ ] Padding/margins within 2px of spec
- [ ] Press/hover animations scale correctly (0.97, 0.98, etc.)
- [ ] Animation timing matches (0.15s, 0.2s, 0.3s)
- [ ] Responsive breakpoints honored
- [ ] No visual regressions on other screens

## Work Prioritization

**CRITICAL FIRST** (These make the biggest visual impact):

1. Dashboard visual styling (hero stats, cards, topbar)
2. Button component system (all 5 variants)
3. Color CSS variables (40+ variables)
4. Item card styling (left stripe, icon, badges)
5. Typography system (font sizes, weights, spacing)

**HIGH PRIORITY** (Do next): 6. TopBar backdrop blur effects 7. Settings screens visual polish 8. TabBar styling 9. FAB styling and animations 10. Card interactions and press states

**MEDIUM PRIORITY** (Finish after high): 11. Recipes screen styling 12. Shopping list interactions 13. Analytics screen 14. All remaining styled screens

**LOW PRIORITY** (Final pass): 15. 19 missing screens 16. Advanced animations 17. Edge case styling 18. Performance optimizations

---

## File References

React components needing updates:

- `apps/mobile/src/theme/tokens.ts` - CSS color variables
- `apps/mobile/src/components/ui/Button.tsx` - Button variants
- `apps/mobile/src/components/ui/Card.tsx` - Card styling
- `apps/mobile/src/components/ui/TopBar.tsx` - Header with blur
- `apps/mobile/src/components/ui/TabBar.tsx` - Tab bar
- `apps/mobile/src/components/ui/FAB.tsx` - Floating button
- `apps/mobile/app/(main)/index.tsx` - Dashboard
- All other screen files in `apps/mobile/app/(main)/`

HTML Reference:

- `app.html` (301KB) - Complete design system with all screens and styles
