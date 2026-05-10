# React App Redesign Roadmap: Match app.html Demo

## Executive Summary

Transform the React app to match the rich, polished design of app.html while maintaining full working features. This is a comprehensive visual and interactive redesign with 20+ screens.

---

## PHASE 1: Design System Foundation (Week 1)

### 1.1 Color Palette Implementation

Extract and apply all colors from app.html into a centralized theme:

**Brand Colors:**

- `--brand: #0E5C3A` (deep verdant green, primary)
- `--brand-dark: #08402A` (darker variant)
- `--brand-light: #1F8B5C` (lighter variant)
- `--brand-glow: #2DBC83` (bright accent)
- `--brand-soft: #E6F2EC` (light tint, for backgrounds)
- `--brand-tint: #F2F8F4` (very light tint)

**Accent Colors:**

- `--coral: #FF6B47` (energy, urgency - use for destructive actions)
- `--coral-soft: #FFE5DD`
- `--honey: #F4B942` (warmth, joy - use for important CTAs)
- `--honey-soft: #FDF1D9`
- `--berry: #C2185B` (premium, indulgent - use for premium features)
- `--berry-soft: #FCE4EC`
- `--sky: #4A90E2` (trust, calm - info messages)
- `--sky-soft: #E3F0FB`
- `--plum: #6B5B95` (subscription, premium)
- `--plum-soft: #EFEBF7`

**Status Colors:**

- `--fresh: #1F9956` (green items - newly added/fresh)
- `--fresh-bg: #E0F4E8`
- `--soon: #E08F1B` (orange items - expiring soon)
- `--soon-bg: #FCEFD3`
- `--urgent: #E0392B` (red items - expiring today)
- `--urgent-bg: #FBE0DD`
- `--expired: #6B6B6B` (gray items - expired)
- `--expired-bg: #ECECEC`

**Surface Colors:**

- `--bg: #FAF6EE` (main background - warm cream)
- `--bg2: #F4EEDD` (secondary background)
- `--raised: #FFFFFF` (card backgrounds, buttons)
- `--sunken: #F5F1E5` (slightly depressed surfaces)
- `--overlay: rgba(15,28,17,0.45)` (dark overlay for modals)

**Text Colors:**

- `--t1: #0F1A11` (primary text - very dark green/black)
- `--t2: #4D5A4F` (secondary text - medium gray)
- `--t3: #7B8580` (tertiary text - lighter gray)
- `--t-inv: #FFFFFF` (inverse text on dark backgrounds)

**Borders & Dividers:**

- `--b1: #E8E0CC` (primary border)
- `--b2: #D6CDB6` (secondary border, darker)

### 1.2 Typography System

Implement exact typography from demo:

**Fonts:**

- Primary: Inter (400, 500, 600, 700, 800, 900 weights)
- Serif/Headline: Fraunces (for special headlines, stats, insights)

**Font Sizes & Styles:**

- `.h1`: 34px, weight 800, line-height 1.05, letter-spacing -1.2px
- `.h2`: 28px, weight 800, line-height 1.1, letter-spacing -0.8px
- `.h3`: 22px, weight 700, line-height 1.15, letter-spacing -0.4px
- `.h4`: 18px, weight 700, letter-spacing -0.2px
- `.body`: 16px, line-height 1.45
- `.body-sm`: 14px, line-height 1.4, color var(--t2)
- `.caption`: 12px, weight 600, letter-spacing 0.3px
- `.eyebrow`: 11px, weight 800, letter-spacing 1.5px, uppercase

### 1.3 Spacing & Radii System

Establish consistent spacing and border radius:

**Border Radii:**

- `--r-xs: 8px` (small elements, inputs)
- `--r-sm: 12px` (medium elements)
- `--r-md: 16px` (buttons, cards)
- `--r-lg: 22px` (standard cards)
- `--r-xl: 32px` (large cards, hero sections)
- `--r-full: 9999px` (pills, FABs, full-radius buttons)

**Shadow System:**

- `--s-1`: `0 1px 2px rgba(15,26,17,0.04), 0 2px 6px rgba(15,26,17,0.04)` (subtle)
- `--s-2`: `0 2px 4px rgba(15,26,17,0.04), 0 8px 20px rgba(15,26,17,0.07)` (medium)
- `--s-3`: `0 8px 16px rgba(15,26,17,0.06), 0 20px 40px rgba(15,26,17,0.10)` (elevated)
- `--s-glow`: `0 8px 32px rgba(14,92,58,0.25)` (brand glow - for CTAs)
- `--s-coral`: `0 8px 24px rgba(255,107,71,0.30)` (coral glow - for danger)

### 1.4 Animation System

Define animation curves for consistency:

**Animation Easing:**

- `--spring`: `cubic-bezier(0.34,1.56,0.64,1)` (bouncy, playful)
- `--ease`: `cubic-bezier(0.16,1,0.3,1)` (smooth default)
- `--quick`: `cubic-bezier(0.4,0,0.2,1)` (snappy interactions)

**Common Animation Timings:**

- Screen transitions: 0.45s with `--ease`
- Button presses: 0.15s with `--quick`
- Hover states: 0.2s
- Shadows: 0.2s

---

## PHASE 2: Component Library (Week 1-2)

### 2.1 Button Components

Implement all button variants with proper shadows, scales, and animations:

**Button Types:**

- `.btn-primary`: Brand green background, white text, glow shadow. Active state: darker, scale 0.97
- `.btn-secondary`: White background, border, dark text. Active state: sunken background, scale 0.97
- `.btn-coral`: Coral background, white text, coral glow shadow (for destructive)
- `.btn-ghost`: Transparent, brand text. Active state: brand-soft background
- `.btn-icon`: 44×44px circular, white background, border. Active state: scale 0.9
- `.btn-icon.glass`: Frosted glass effect with backdrop blur
- `.btn-block`: Full width variants
- `.btn-lg`: 18px padding, 17px font size

**Required Features:**

- Scale animations on active (0.97 for large, 0.9 for icons)
- Proper shadow stacking
- Disabled state handling
- Loading state with spinner

### 2.2 Card Components

Create reusable card patterns from demo:

**Card Types:**

1. **Standard Card** (`.card`):
   - Background: var(--raised)
   - Padding: 18px
   - Border-radius: var(--r-lg)
   - Border: 1px solid var(--b1)
   - Shadow: var(--s-1)

2. **Item Card** (`.item-card`):
   - Flex layout with status stripe on left
   - Left stripe (4px): gradient based on status (fresh/soon/urgent/expired)
   - Contains: icon (52×52px), name, meta info, badge
   - Active state: scale 0.98, shadow upgrade to s-2

3. **Insight Card** (`.insight`):
   - Gradient background (brand to brand-light)
   - White text
   - Decorative gradient overlays (positioned pseudo-elements)
   - Eyebrow, title (using Fraunces serif), text, icon
   - Glow shadow

4. **Streak Card** (`.streak-card`):
   - Gradient background (coral to honey)
   - Large number display (Fraunces serif)
   - Decorative fire emoji in background
   - Glow shadow

5. **Stat Cards** (`.stat`):
   - 3-column grid layout
   - Large number (Fraunces serif), small label
   - Color variants: fresh/soon/urgent numbers

### 2.3 Navigation Components

**Top Bar** (`.topbar`):

- Sticky header with blur backdrop effect
- Left: title + subtitle
- Right: action buttons/icons
- Blur: 20px saturate(1.4)
- On scroll: adds bottom border, increases blur opacity

**Tab Bar** (`.tabbar`):

- Fixed bottom navigation
- 88px height total (includes safe area)
- Blur backdrop similar to topbar
- 5 main sections: Home, Items, Add, Recipes, Settings
- Icons + labels, with active indicator

**Status Bar**:

- iPhone-style at top
- Shows time, signal, battery (left/right)
- Notch element centered

### 2.4 Form Components

- Text inputs with proper focus states
- Select dropdowns matching design
- Checkboxes and radio buttons
- Toggle switches
- All with consistent padding and border radius

---

## PHASE 3: Screen Implementation (Week 2-4)

### 3.1 Authentication Screens

1. **Splash Screen** (`screen-splash`)
   - App logo/emoji (🍽️)
   - App name: "WhatsFresh — Track what's fresh. Reduce waste. Cook smart."
   - Gradient background: 135deg from #2A4A3A to #1A3A2A
   - Fade out animation to next screen

2. **Onboarding Screen** (`screen-onboarding`)
   - Three slides with benefits
   - Slide 1: "Track What's Fresh" + image
   - Slide 2: "Reduce Waste" + image
   - Slide 3: "Cook Smarter" + image
   - Dots indicator, next button

3. **Auth Screen** (`screen-auth`)
   - Email input field
   - "Continue with Email" button (brand green)
   - "Continue with Google" button (secondary)
   - Password input for existing users

4. **Magic Link Screen** (`screen-magic`)
   - Message: "Check your email for a magic link"
   - Email shown: user@example.com
   - "Didn't receive email?" + resend button
   - Spinner/loading state

### 3.2 Main App Screens

5. **Dashboard Screen** (`screen-dashboard`)
   - **Hero Stats Section**: 3-column grid
     - Fresh count (green number)
     - Soon expiring count (orange number)
     - Urgent/expired count (red number)
   - **Insight Card**: "You're doing great" or similar with icon
   - **Streak Card**: "7-day streak 🔥"
   - **Recent Items Section**: Last 5 items with cards
   - FAB button: Add item (+)

6. **Items Screen** (`screen-items`)
   - Search bar at top
   - Status filter tabs: All, Fresh, Soon, Urgent, Expired
   - Item cards in scrollable list
   - Each card shows:
     - Status stripe (left, 4px, gradient)
     - Icon (emoji or image in status-colored background)
     - Item name
     - Meta: Container, Added date
     - Status badge (FRESH, SOON, URGENT, EXPIRED)
   - Pull-to-refresh
   - Empty state message if no items

7. **Add Item Screen** (`screen-add`)
   - Form fields:
     - Item name (text input)
     - Food type (dropdown: produce, dairy, meat, frozen, pantry, other)
     - Container (dropdown or searchable)
     - Added date (date picker)
     - Expiry/Best by date (date picker)
     - Notes (textarea)
   - "Scan Barcode" link → goes to scan screen
   - "Add Item" button (brand green, full width)
   - "Cancel" button

8. **Scan Screen** (`screen-scan`)
   - QR/Barcode camera view
   - Scanning overlay
   - Instructions: "Point camera at barcode"
   - "Upload from Photos" fallback
   - "Cancel" button
   - After scan: show results with ability to save as item

9. **Item Detail Screen** (`screen-detail`)
   - Large item icon at top
   - Item name (h1)
   - Status badge
   - Details:
     - Container
     - Added date
     - Expiry/Best by date
     - Days remaining
     - Notes
   - Action buttons:
     - Edit
     - Delete (coral red)
     - Move to another container
   - Bottom sheet actions

10. **Recipes Screen** (`screen-recipes`)
    - Search bar
    - Recipe categories (tabs)
    - Recipe cards showing:
      - Image
      - Name
      - Ingredients you have
      - Prep time
      - Link to full recipe
    - Filter by ingredients available
    - Empty state if no matching recipes

11. **Recipe Detail Screen** (`screen-recipe-detail`)
    - Recipe image
    - Title (h1)
    - Info row: prep time, servings, difficulty
    - Ingredients list with checkboxes
    - Instructions (numbered steps)
    - "Save Recipe" button
    - Share button

12. **Analytics Screen** (`screen-analytics`)
    - Usage stats chart
    - Waste reduction metrics
    - Items by category pie chart
    - Most used containers
    - Seasonal trends
    - Export data button

13. **Achievements Screen** (`screen-achievements`)
    - Achievement badges in grid
    - Badge card shows:
      - Icon/emoji
      - Name
      - Description
      - Progress bar (if not unlocked)
      - Unlock date (if unlocked)
    - Streak info prominently
    - Share achievements button

14. **Containers Screen** (`screen-containers`)
    - List of household containers
    - Each container card:
      - Icon (fridge, freezer, pantry, etc.)
      - Name
      - Item count
      - Storage location
    - Add container button
    - Edit/delete options
    - Filter by type

15. **Shopping List Screen** (`screen-shopping`)
    - Toggle between "My List" and "Household List"
    - Add item input at top
    - Checkable items grouped by category
    - Each item shows:
      - Checkbox
      - Item name
      - Quantity
      - Category
      - Added by (if household)
    - Clear completed button
    - Share list button

16. **Notifications Screen** (`screen-notifications`)
    - Notification list (newest first)
    - Notification types:
      - Item expiring soon
      - Household member added item
      - Achievement unlocked
      - Reminder to use items
    - Swipe to dismiss
    - Mark all as read
    - Empty state

17. **Settings Screen** (`screen-settings`)
    - Profile section:
      - Avatar
      - Name
      - Email
      - Edit profile button
    - Preferences:
      - Expiry notifications (toggle + time)
      - Item suggestions (toggle)
      - Theme (light/dark/auto)
      - Language
    - Household:
      - Current household name
      - Members count
      - Invite member button
    - Legal:
      - Terms of Service
      - Privacy Policy
      - Data Export
    - Logout button (bottom, coral red)

18. **Household Screen** (`screen-household`)
    - Household name (editable)
    - Members section:
      - List of members with roles
      - Remove member option
    - Invitations pending
    - Add member button
    - Settings for sharing preferences

19. **Invite Screen** (`screen-invite`)
    - Share link display
    - QR code for scanning
    - Copy button
    - Email invite field + send button
    - "Invite history" showing pending/accepted invites

---

## PHASE 4: Interactive Features (Week 4-5)

### 4.1 Animations & Micro-Interactions

- **Screen transitions**: Slide left/right with fade (0.45s ease)
- **Modal animations**: Slide up from bottom (0.3s ease)
- **Button press feedback**: Scale + shadow on active
- **Item swipe**: Delete/archive actions with swipe gesture
- **Pull-to-refresh**: Spinner with smooth deceleration
- **Loading states**: Skeleton loaders for data-heavy screens
- **Toast notifications**: Slide in from bottom, auto-dismiss
- **Page scroll**: Topbar background/blur changes on scroll

### 4.2 Real Data Integration

- Connect all screens to GraphQL API
- Item CRUD operations
- User profile updates
- Household management
- Real-time notifications
- Achievement tracking

### 4.3 Advanced Interactions

- Swipe gestures for navigation (back/dismiss)
- Long-press for context menus
- Pull-to-refresh on main screens
- Search with debounce
- Infinite scroll on lists
- Filter/sort functionality
- Favorites/bookmarking
- Undo/redo actions

---

## PHASE 5: Polish & Optimization (Week 5-6)

### 5.1 Platform-Specific Polish

- iOS safe area handling
- Android back button handling
- Status bar styling per platform
- Platform-specific fonts and weights

### 5.2 Responsive Design

- Mobile-first (primary target)
- Tablet adaptations (wider cards, multi-column)
- Landscape orientation handling

### 5.3 Accessibility

- Proper color contrast ratios
- Touch target sizes (minimum 44×44px)
- Semantic HTML
- Screen reader labels
- Keyboard navigation

### 5.4 Performance

- Image optimization (lazy load, progressive)
- Code splitting by screen
- Memoization for expensive components
- Virtual scrolling for long lists
- Cache strategies for API data

### 5.5 Error Handling & Edge Cases

- Network error screens with retry
- Empty states with helpful messages
- Loading states for all data operations
- Validation feedback on forms
- Confirmation dialogs for destructive actions

---

## Implementation Priority Checklist

### Must Have (MVP)

- [ ] Theme/colors system applied globally
- [ ] Button components with all variants
- [ ] Card components (standard, item, insight, stat)
- [ ] Top bar and tab bar navigation
- [ ] Dashboard screen
- [ ] Items list screen
- [ ] Add item form
- [ ] Item detail view
- [ ] Settings screen
- [ ] Authentication flows
- [ ] Real API integration

### Should Have (v1.1)

- [ ] Recipes screen
- [ ] Analytics screen
- [ ] Containers management
- [ ] Notifications screen
- [ ] Achievements system
- [ ] Advanced animations
- [ ] Shopping list

### Nice to Have (v1.2)

- [ ] Household/sharing features
- [ ] Barcode scanning
- [ ] Social features
- [ ] Data export
- [ ] Dark mode

---

## Key Design Details to Preserve

1. **Warm, Premium Feel**: Cream/beige backgrounds, not pure white
2. **Layered Shadows**: Multiple shadow layers for depth, not flat
3. **Softer Radii**: 22px for standard cards, not sharp corners
4. **Status Stripes**: Left border gradients for item status
5. **Gradient Accents**: Brand-light combinations for CTAs and cards
6. **Backdrop Blur**: On top bar and tab bar (20px blur)
7. **Decorative Elements**: Gradient overlays, emoji accents
8. **Icon Integration**: Large emoji/SF symbols, not tiny icons
9. **Typography Hierarchy**: Big, bold headlines with Fraunces serif
10. **Micro-interactions**: Scale animations, shadow transitions, color shifts

---

## File Structure to Create/Update

```
apps/mobile/src/
├── styles/
│   ├── theme.ts (color palette, spacing, shadows)
│   ├── typography.ts (font families, sizes)
│   ├── animations.ts (easing curves, keyframes)
│   └── globals.css (base styles)
├── components/
│   ├── buttons/
│   │   ├── Button.tsx (primary variant)
│   │   ├── ButtonSecondary.tsx
│   │   ├── ButtonCoral.tsx
│   │   ├── ButtonGhost.tsx
│   │   ├── ButtonIcon.tsx
│   │   └── FAB.tsx
│   ├── cards/
│   │   ├── Card.tsx
│   │   ├── ItemCard.tsx
│   │   ├── InsightCard.tsx
│   │   ├── StreakCard.tsx
│   │   └── StatCard.tsx
│   ├── navigation/
│   │   ├── TopBar.tsx
│   │   └── TabBar.tsx
│   ├── forms/
│   │   ├── TextInput.tsx
│   │   ├── Select.tsx
│   │   ├── DatePicker.tsx
│   │   └── Toggle.tsx
│   └── layouts/
│       ├── ScreenLayout.tsx
│       └── ModalLayout.tsx
├── screens/
│   ├── auth/
│   │   ├── SplashScreen.tsx
│   │   ├── OnboardingScreen.tsx
│   │   ├── AuthScreen.tsx
│   │   └── MagicLinkScreen.tsx
│   ├── main/
│   │   ├── DashboardScreen.tsx
│   │   ├── ItemsScreen.tsx
│   │   ├── AddItemScreen.tsx
│   │   ├── ItemDetailScreen.tsx
│   │   ├── RecipesScreen.tsx
│   │   ├── AnalyticsScreen.tsx
│   │   ├── SettingsScreen.tsx
│   │   ├── HouseholdScreen.tsx
│   │   └── ...
│   └── modals/
│       ├── ScanModal.tsx
│       └── ConfirmDialog.tsx
└── hooks/
    ├── useTheme.ts
    ├── useAnimation.ts
    └── useScreenNavigation.ts
```

---

## Notes

- All measurements and colors extracted directly from app.html
- Animations use the three defined easing curves consistently
- Shadow system provides visual hierarchy
- Status colors (fresh/soon/urgent/expired) are consistent across all screens
- Component library is modular and reusable
- Design system can easily be updated by changing CSS variables
- All colors have soft variants for backgrounds (–soft colors)
