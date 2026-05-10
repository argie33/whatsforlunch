# React ↔ HTML Alignment Audit

**Status**: App is 60% complete. Screens exist but need visual refinement to match HTML exactly.

---

## ✅ What's Already Done

### Navigation & Architecture

- ✅ expo-router fully configured
- ✅ Auth gate with proper redirects
- ✅ (auth) group: splash, onboarding, signin, verify
- ✅ (main) group with all major screens
- ✅ Provider setup (database, sync, theme, notifications)

### Design System

- ✅ Design tokens match HTML exactly (colors, typography, spacing, radius, shadows)
- ✅ Light & dark theme defined
- ✅ Database schema & WatermelonDB integration
- ✅ GraphQL API connection ready

### Screens Implemented (20+)

1. ✅ **Auth**: splash, onboarding, signin, verify
2. ✅ **Dashboard** (index.tsx) - with item stats
3. ✅ **Items List** - with filters, search, bulk actions
4. ✅ **Item Detail** - items/[id].tsx
5. ✅ **Add Item** - items/add.tsx (modal)
6. ✅ **Scan** - scanning & result screens
7. ✅ **Recipes** - list & detail
8. ✅ **Shopping** - shopping list
9. ✅ **Containers** - grid & management
10. ✅ **Analytics** - stats & charts
11. ✅ **Achievements** - badge grid
12. ✅ **Activity** - feed
13. ✅ **Meal Plan** - recommendations
14. ✅ **Settings** - with sub-screens
15. ✅ **Notifications** - notification center
16. ✅ **Restaurants** - quick meal ideas
17. ✅ **Stickers** - QR generation
18. ✅ **Digest** - daily what-to-eat
19. ✅ **Receipt Review** - receipt parsing
20. ✅ **Search** - unified search

### UI Components (30 components)

- ✅ Button (with variants: filled, tinted, plain, ghost, destructive)
- ✅ Card, Input, Avatar, Icon, IconButton
- ✅ ListRow, Sheet, Toast, StatusBadge
- ✅ SegmentedControl, Tag, EmptyState
- ✅ StarRating, SyncStatusBadge

### Features

- ✅ Database persistence (WatermelonDB)
- ✅ Real-time sync with conflict resolution
- ✅ Push notifications setup
- ✅ Haptic feedback integration
- ✅ Dark mode support
- ✅ i18n/localization framework
- ✅ Error boundaries & Sentry integration

---

## 🚨 What Needs Work (Refinement Focus)

### HIGH PRIORITY - Visual/UX Alignment

#### 1. **Button Component Styling** ⚠️

- Current: Basic button with scale press effect
- Needed: Match HTML button styles exactly
  - [ ] Verify exact border-radius (should be 12px from design)
  - [ ] Check shadow on buttons (should match HTML)
  - [ ] Verify exact color values for all variants
  - [ ] Test disabled state styling

#### 2. **Card Component Styling** ⚠️

- Current: Basic card
- Needed: Match HTML cards with status stripes
  - [ ] Status stripe variant (colored left border)
  - [ ] Item card with image + metadata layout
  - [ ] Container card styling
  - [ ] Recipe card styling
  - [ ] Proper shadow levels (s-1, s-2, s-3)

#### 3. **SearchBar Component** ⚠️ (MISSING)

- Current: Basic TextInput in screens
- Needed: Full SearchBar with glass effect
  - [ ] Backdrop blur effect
  - [ ] Placeholder styling
  - [ ] Clear button
  - [ ] Search icon
  - [ ] Focus state

#### 4. **FAB (Floating Action Button)** ⚠️ (MISSING)

- Current: No FAB component
- Needed: Premium FAB with gradient
  - [ ] Gradient background (brand gradient)
  - [ ] Icon + label
  - [ ] Scale animation on press (0.95x)
  - [ ] Shadow (s-glow or s-coral)
  - [ ] Expandable menu option

#### 5. **TabBar Component** ⚠️ (MISSING)

- Current: Not implemented at bottom
- Needed: Bottom tab bar for main navigation
  - [ ] 5-6 tabs with icons
  - [ ] Active tab underline indicator
  - [ ] Badge counts on tabs
  - [ ] Icon scale animation

#### 6. **Chip/Filter Component** ⚠️ (MISSING)

- Current: Used as inline buttons
- Needed: Proper Chip component
  - [ ] Selected state styling
  - [ ] Clearable chips
  - [ ] Badge with count
  - [ ] Grouped chip display

#### 7. **Modal/BottomSheet** ⚠️

- Current: Basic Sheet implementation
- Needed: Full featured modal
  - [ ] Backdrop blur
  - [ ] Swipe to dismiss
  - [ ] Proper animations (slide-up, fade)
  - [ ] Keyboard handling
  - [ ] Full-screen & partial variants

#### 8. **Animations** ⚠️

- Current: Basic fade/slide
- Needed: All HTML animations
  - [ ] Splash logo floating (continuous)
  - [ ] Scan line animation (moving line in scan screen)
  - [ ] Button press scale (0.98x smooth)
  - [ ] Tab icon scale on active
  - [ ] Screen transitions (slide left/right + fade)
  - [ ] Modal slide-up animation
  - [ ] Parallax effects in scrollable content

#### 9. **Gradients & Overlays** ⚠️

- Current: Some gradients in splash
- Needed: All 15+ gradient combinations
  - [ ] Brand gradient (dark to light)
  - [ ] Status gradients (fresh, soon, urgent)
  - [ ] Accent gradients (coral, honey, sky, plum)
  - [ ] Radial overlay gradients on hero images
  - [ ] Backdrop blur filters (20-24px)
  - [ ] Glass morphism effects

#### 10. **Shadow Variants** ⚠️

- Current: Using Tamagui defaults
- Needed: Exact HTML shadows
  - [ ] s-1: 0 1px 2px rgba(15,26,17,0.04), 0 2px 6px rgba(15,26,17,0.04)
  - [ ] s-2: 0 2px 4px rgba(15,26,17,0.04), 0 8px 20px rgba(15,26,17,0.07)
  - [ ] s-3: 0 8px 16px rgba(15,26,17,0.06), 0 20px 40px rgba(15,26,17,0.10)
  - [ ] s-glow: 0 8px 32px rgba(14,92,58,0.25)
  - [ ] s-coral: 0 8px 24px rgba(255,107,71,0.30)

### MEDIUM PRIORITY - Component Completeness

#### 11. **StatusBadge** - All status variants

- [ ] Fresh (green)
- [ ] Soon (orange)
- [ ] Urgent (red)
- [ ] Expired (gray)
- [ ] Inline & filled styles
- [ ] Size variants (sm, md, lg)

#### 12. **Input Component** - All variants

- [ ] Text input with label
- [ ] Helper text
- [ ] Error state with error message
- [ ] Clearable button
- [ ] Password toggle
- [ ] Textarea for multi-line
- [ ] Disabled state
- [ ] Focus ring styling

#### 13. **Picker Component** (MISSING)

- [ ] Date picker (native styled)
- [ ] Time picker
- [ ] Category picker
- [ ] Quantity picker
- [ ] Custom overlay styling

#### 14. **Lightbox/ImageViewer** (MISSING)

- [ ] Full-screen image viewer
- [ ] Pinch zoom
- [ ] Pan gesture
- [ ] Close button
- [ ] Image counter (1/5, etc)

### LOWER PRIORITY - Missing Screens/Features

#### 15. **Screens with UI Gaps**

- [ ] Detail screen - image hero sizing, metadata layout
- [ ] Analytics - chart implementation (bars, graphs)
- [ ] Achievements - unlock celebration modal
- [ ] Settings - grouping & collapsible sections
- [ ] Recipes - cooking mode with timer
- [ ] Containers - QR claim modal integration

#### 16. **Advanced Features** (Nice-to-have)

- [ ] Voice input modal styling
- [ ] Sync conflict resolution dialog
- [ ] Achievement unlock celebration
- [ ] Recipe share bottom sheet
- [ ] Permission request dialogs
- [ ] Smart home integration UI
- [ ] Data export progress screen
- [ ] Account deletion confirmation

---

## 📋 Work Breakdown (Realistic Priority)

### Phase 1: Core Component Refinement (3-5 days)

1. Create SearchBar with glass effect
2. Create FAB component with gradient
3. Create TabBar with proper styling
4. Create Chip component
5. Verify all button/card shadows match HTML exactly
6. Implement all gradient combinations
7. Implement all 5 shadow levels

### Phase 2: Advanced Components (2-3 days)

8. Enhanced Modal/BottomSheet with blur
9. Picker component (date/category)
10. Lightbox/ImageViewer
11. Input variants (error, helper text, etc)

### Phase 3: Animations & Polish (2-3 days)

12. All screen transitions
13. Button press scaling with Reanimated
14. Floating animations
15. Parallax effects
16. Gesture handling (swipe, pan, pinch)

### Phase 4: Screen-Specific Polish (2-3 days)

17. Detail screen hero image + layout
18. Analytics screen charts
19. Settings screen collapsible sections
20. Recipes cooking mode
21. Achievement celebration modal

### Phase 5: Testing & Performance (1-2 days)

22. Visual regression testing
23. Performance optimization
24. Dark mode verification
25. Accessibility audit

---

## 🎯 Recommended Next Steps

1. **Start the app locally** and compare with HTML side-by-side:

   ```bash
   cd apps/mobile
   pnpm dev
   # Navigate to http://localhost:8082
   # Login: test@local.dev / any
   ```

2. **Open HTML in browser**: `file:///C:/Users/arger/code/whatsforlunch/app.html`

3. **Pick the highest-impact component** to refine first:
   - **SearchBar** - used everywhere
   - **FAB** - central to navigation
   - **Button/Card shadows** - visible on every screen

4. **Update component library** to match HTML exactly

5. **Work through screens** in priority order:
   - Dashboard
   - Items list/detail
   - Recipes
   - Settings

---

## 📊 Estimated Timeline

- **Current State**: 60% complete (60 days → 40 days remaining)
- **With Opus help**: 15-20 days to reach 95% parity
- **Remaining**: Edge cases, testing, performance

**Key**: Most work is visual refinement, not feature building. Components exist, they just need styling tweaks.
