# 👀 View Both Versions Side-by-Side

Your north star design (HTML mockup) vs. Your React implementation

---

## Quick Start (2 minutes)

### Step 1: Open the HTML mockup (RIGHT NOW)

```
File → Open File → C:\Users\arger\code\whatsforlunch\app.html
```

Or double-click the file. Your browser will show a phone-frame simulation of the entire design system with all 57+ screens.

**Key features in this mockup:**

- Click screen title buttons to navigate between screens
- See ALL design patterns: colors, typography, spacing, animations
- Reference this constantly — it's your single source of truth

### Step 2: Run the React version

```bash
# Terminal 1: Web version (if you want to see React)
cd C:\Users\arger\code\whatsforlunch\apps\mobile
npm run web
# Opens http://localhost:8081

# OR Terminal 1: Native mobile preview
npm run expo
# Then use Expo Go on your phone

# OR Terminal 2: API + full stack
cd C:\Users\arger\code\whatsforlunch
npm run dev
```

### Step 3: Compare

Open side-by-side:

```
┌─────────────────────────────────┬─────────────────────────────────┐
│  app.html (HTML mockup)         │  React app (http://localhost:   │
│  - Perfect design               │  - Current implementation       │
│  - All colors, fonts, spacing   │  - Needs alignment              │
│  - All 57+ screens designed     │  - Some screens missing         │
│  - Interactive navigation       │  - Some styling off             │
└─────────────────────────────────┴─────────────────────────────────┘
```

---

## Detailed Comparison Workflow

### For Design System (Colors, Typography, Spacing)

1. **Open both in browser:**
   - Left side: `app.html` with all screens visible
   - Right side: VS Code with React component files

2. **Pick a screen from the HTML** (e.g., Dashboard, screen-dashboard)

3. **Check the design elements:**
   - Click the button/card to inspect in browser dev tools
   - Note the colors used (e.g., `var(--brand)` = `#0E5C3A`)
   - Check font sizes, weights, line-heights
   - Check padding, margins, gap spacing
   - Check border radius, shadows

4. **Find the React equivalent** (e.g., apps/mobile/app/(main)/index.tsx)

5. **Update to match:**
   - Add missing color values to theme
   - Update component styles
   - Adjust spacing
   - Test in React

---

## Navigation in app.html

The HTML mockup has **interactive navigation** for each screen. You can:

1. **Click on buttons** to navigate to different screens
2. **Back buttons** navigate backward
3. **Tab bar at bottom** switches between major sections
4. **FAB button** (+) always goes to "add new item"
5. **"See all →" links** navigate to full lists

### Key screens to reference first:

**Auth Flow:**

- Splash screen (animated green gradient)
- Onboarding (4 pages with carousel dots)
- Auth (email + social login)
- Magic link sent

**Main App:**

- Dashboard (hero stats, insights, quick actions)
- Items list (with chips filter, search)
- Add item (form with type selector)
- Item detail (hero emoji, info rows)
- Recipes (image grid with match % badge)
- Settings (icon + title + value rows)

---

## Key Design Elements to Match

### Colors (Most Important)

The HTML uses a specific, cohesive palette. Pick any card/button/text in the mockup and note its color. Map it to the CSS variable in the `<style>` section.

**Common examples:**

- Primary buttons → `--brand` (#0E5C3A)
- Fresh status → `--fresh` (#1F9956)
- Urgent status → `--urgent` (#E0392B)
- Card backgrounds → `--raised` (white)
- Page background → `--bg` (warm cream #FAF6EE)

### Typography (Second Priority)

The mockup uses:

- **Display text (titles):** Fraunces serif, 800 weight, negative letter-spacing
- **Body text:** Inter sans-serif, 400-700 weights
- **Captions:** Inter, 12px, 600 weight, gray color

### Spacing (Third Priority)

All padding/margins follow a consistent scale:

- Cards: 18px padding
- Sections: 22px horizontal padding
- Items: 14px gap
- Top/bottom: 54px status bar height, 88px tab bar height

---

## Browser DevTools Tips

When comparing in the browser:

1. **Inspect the HTML mockup** (Right-click → Inspect)
   - Look at the `<style>` section
   - Copy color hex values
   - Copy font families
   - Check computed styles on elements

2. **Inspect React version**
   - Compare your styles to the target
   - Check if classes are applied correctly
   - Use React DevTools to see component props

3. **Take screenshots**
   - HTML mockup (perfect reference)
   - Current React (what you need to match)
   - Use a diff tool to highlight differences

---

## What NOT to Do

❌ Don't eyeball colors — use the exact hex values from the CSS  
❌ Don't guess at spacing — measure in dev tools or use the CSS variables  
❌ Don't create new color names — map everything to the existing palette  
❌ Don't skip the design system setup — components depend on it

---

## Quick Reference: Key Files

**HTML Mockup:**

- Location: `C:\Users\arger\code\whatsforlunch\app.html`
- CSS Styles: Lines 15–1623 in the `<style>` tag
- Screens: Lines 1654+ (each screen has `id="screen-xxx"`)

**React Component Files to Update:**

- `apps/mobile/app/(main)/index.tsx` — Dashboard
- `apps/mobile/app/(main)/items/index.tsx` — Items list
- `apps/mobile/app/(main)/items/new.tsx` — Add item
- `apps/mobile/app/(main)/items/[id].tsx` — Item detail
- `apps/mobile/app/(main)/recipes.tsx` — Recipes list
- `apps/mobile/app/(main)/settings/` — Settings screens
- `apps/mobile/app/_layout.tsx` — Root layout (colors, fonts)
- `apps/mobile/app/(auth)/_layout.tsx` — Auth layout

---

## Success Criteria

You'll know you're matching when:

✅ Colors match exactly (use dev tools color picker)  
✅ Typography matches (same font, size, weight)  
✅ Spacing is consistent (padding/margin/gaps)  
✅ Shadows appear (using CSS `box-shadow` or `filter: drop-shadow`)  
✅ Animations work (button scales, transitions, etc.)  
✅ All interactive states work (hover, active, focus, disabled)  
✅ Screens navigate smoothly with the same transitions

---

## Getting Help

If you're unsure about a design detail:

1. **Find it in the HTML mockup** — Look for the screen ID
2. **Inspect it in dev tools** — Copy the styles
3. **Check this checklist** — See if it's listed
4. **Compare side-by-side** — Visual alignment check

This HTML mockup has EVERYTHING you need. Trust it completely.
