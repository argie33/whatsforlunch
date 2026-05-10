# How to View HTML and React Versions Side-by-Side

## Quick Start

### Option 1: Split Screen (Recommended for Comparison)

1. **Open HTML Version**:
   - Open file: `app.html` in your browser
   - Use: `File → Open File` or drag the file into a browser
   - Full URL path: `file:///C:/Users/arger/code/whatsforlunch/app.html`
   - This shows the complete design mockup with all 62 screens accessible via UI

2. **Open React Version** (in second browser window/tab):
   - Navigate to local dev server (if running)
   - Command: `pnpm dev` in `apps/mobile` directory
   - Then open the dev server URL (typically `http://localhost:8081` for Expo)
   - Or access via web preview if using Expo web

3. **Arrange windows side-by-side**:
   - Position two browser windows next to each other
   - Use Windows Snap feature: Win+Left Arrow and Win+Right Arrow
   - Or manually drag windows to split your screen

### Option 2: Browser DevTools (For Detailed Inspection)

1. **Open HTML in browser**
2. **Open DevTools** (F12)
3. **Go to Elements/Inspector tab**
4. **Inspect specific components** to see exact CSS values:
   - Color variables and their computed values
   - Font sizes, weights, letter-spacing
   - Padding, margins, borders
   - Box shadows
   - Animation curves and timings

### Option 3: VS Code Split View

1. **In VS Code**:
   - Open the `app.html` file in one column
   - Open React component (e.g., `apps/mobile/app/(main)/index.tsx`) in another column
   - Use `Ctrl+\` to split editor
   - Compare code structure and styles

---

## Navigating the HTML Mockup

The HTML file (`app.html`) is an **interactive single-page app** with all 62 screens built in.

### Screen Navigation:

- **Bottom Tab Bar** (like the React version):
  - 📊 Dashboard
  - 🛒 Items
  - 👨‍🍳 Recipes
  - 📈 Analytics
  - ⚙️ Settings

- **Click elements** to navigate between screens
- **Notifications button** (🔔) and **Avatar** lead to other screens
- The app uses JavaScript show/hide functions to switch between screens

### Key Screens to Compare:

1. **Dashboard** - Primary screen users see
2. **Items List** - Shows item cards with colored stripes
3. **Settings** - Multiple sub-screens with consistent styling
4. **Shopping** - Different layout pattern
5. **Recipes** - Content-heavy screen

---

## What to Look For During Comparison

### Visual Elements (Use Browser DevTools Inspector):

- **Colors**: Hover over colored elements and check the color values
- **Typography**: Inspect font sizes, weights, letter-spacing
- **Spacing**: Check padding, margins, gaps
- **Shadows**: Inspect box-shadow values (should match CSS variables)
- **Border Radius**: Check border-radius values (mostly 22px or 32px)
- **Animations**: Click buttons and watch the scale effects

### Component Details:

- **Buttons**: Press different button types - notice the scale animations
- **Cards**: Look at the card styling - borders, shadows, padding
- **Item Cards**: Check the colored left stripe - it's a key visual element
- **Hero Stats**: 3-column grid with large serif numbers
- **Top Bar**: Notice the backdrop blur effect when you scroll
- **FAB Button**: Bottom-right floating action button with gradient

---

## File Locations

### HTML Mockup:

- Path: `C:\Users\arger\code\whatsforlunch\app.html`
- Size: ~301KB
- Contains: 62 screens, complete CSS styling, JavaScript interactions
- Style: Embedded CSS in `<style>` tag
- Font: Loaded from Google Fonts (Inter + Fraunces)

### React Source (Mobile):

- Main components:
  - `apps/mobile/src/components/ui/` - UI components (Button, Card, FAB, etc.)
  - `apps/mobile/src/theme/tokens.ts` - Color and design tokens
  - `apps/mobile/app/(main)/` - Main app screens
  - `apps/mobile/app/(auth)/` - Auth screens

### Audit Document:

- Path: `C:\Users\arger\code\whatsforlunch\VISUAL_ALIGNMENT_AUDIT.md`
- Contains: Complete breakdown of all differences and required fixes

---

## Key Differences to Note

### Missing from React (19 screens):

- Accessibility settings
- Barcode/OCR result screens
- Container claiming UI
- Gallery/Lightbox
- Smart home integration
- And 14 others (see VISUAL_ALIGNMENT_AUDIT.md)

### Styling Gaps (Use the Tasks list):

1. Color variables may not match exactly
2. Typography sizing/spacing inconsistent
3. Button press animations may differ
4. Card styling needs refinement
5. TopBar backdrop blur missing
6. FAB styling incomplete
7. Hero stats styling needs work
8. Item card left stripe incomplete
9. Settings screens need visual polish
10. Various spacing and padding issues

---

## Testing Workflow

1. **Open both versions side-by-side**
2. **Navigate to same screen** (e.g., Dashboard)
3. **Compare visually**:
   - Colors match?
   - Spacing looks right?
   - Font sizes correct?
   - Buttons animate smoothly?
4. **Use DevTools** to check specific values
5. **Note differences** or reference `VISUAL_ALIGNMENT_AUDIT.md`
6. **Check the Tasks** created in Claude Code for what needs fixing

---

## Running the React App Locally

```bash
# Navigate to mobile app directory
cd apps/mobile

# Install dependencies (if needed)
pnpm install

# Start development server
pnpm dev

# This will open Expo dev tools - scan QR code or choose simulator
```

Then connect to: `http://localhost:8081` (or whatever Expo shows)

---

## Notes for Switching Models

When ready to switch to a larger model (Sonnet, Opus) for implementation:

1. **Reference Files**:
   - HTML Mockup: `app.html` - Complete design truth
   - Audit Document: `VISUAL_ALIGNMENT_AUDIT.md` - Detailed requirements
   - Task List: In Claude Code task manager - 20 specific tasks

2. **Key Context**:
   - 62 screens in HTML, 43 in React
   - 40+ CSS color variables need exact matching
   - All 5 button variants need specific styling
   - Item cards need colored left stripe (key visual element)
   - TopBar needs backdrop blur effect
   - FAB needs spring animation

3. **Priority Order** (from VISUAL_ALIGNMENT_AUDIT.md):
   - CRITICAL: Colors, buttons, cards, typography
   - HIGH: TopBar, FAB, TabBar, Dashboard, Items, Settings
   - MEDIUM: Recipes, Shopping, Analytics
   - LOW: 19 missing screens

4. **Testing Approach**:
   - Compare visual output against HTML mockup
   - Use browser DevTools to verify exact CSS values
   - Test all press/hover animations
   - Verify responsive behavior

---

## Quick Reference: Most Important Visual Elements

1. **Color System** - All 40+ CSS variables must match
2. **Button Scaling** - Press animations: 0.97 (normal), 0.9 (icons), 0.98 (cards)
3. **Item Card Stripe** - 4px left border with status-specific gradient
4. **Hero Stats** - 32px bold serif numbers with status colors
5. **TopBar Blur** - backdrop-filter: blur(20px) saturate(1.4)
6. **FAB Gradient** - linear-gradient(135deg, brand 0%, brand-light 100%)
7. **Typography** - Exact font sizes, weights, letter-spacing
8. **Spacing** - 22px horizontal padding is the standard

---

This setup will let you visually compare both versions in real-time and understand exactly what needs to change to match the HTML perfectly.
