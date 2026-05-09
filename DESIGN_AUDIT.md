# Design Audit: HTML Demo vs React Implementation

**Generated**: 2026-05-09  
**Goal**: Match React app to HTML demo pixel-perfect visual design

---

## 🎨 Design Tokens Comparison

### Colors ✅ MATCH

| Token                   | HTML    | React   | Status |
| ----------------------- | ------- | ------- | ------ |
| Brand Primary           | #0E5C3A | #0E5C3A | ✅     |
| Brand Dark              | #08402A | #08402A | ✅     |
| Brand Light             | #1F8B5C | #1F8B5C | ✅     |
| Status Fresh            | #1F9956 | #1F9956 | ✅     |
| Status Soon             | #E08F1B | #E08F1B | ✅     |
| Status Urgent           | #E0392B | #E0392B | ✅     |
| Coral                   | #FF6B47 | #FF6B47 | ✅     |
| Honey                   | #F4B942 | #F4B942 | ✅     |
| All surface/text colors | MATCH   | MATCH   | ✅     |

### Typography ✅ MATCH

| Class    | HTML Size             | React Size | Weight | Line Height | Status |
| -------- | --------------------- | ---------- | ------ | ----------- | ------ |
| h1       | 34px                  | 34px       | 800    | 1.05        | ✅     |
| h2       | 28px                  | 28px       | 800    | 1.1         | ✅     |
| h3       | 22px                  | 22px       | 700    | 1.15        | ✅     |
| h4       | 18px                  | 18px       | 700    | 1.27        | ✅     |
| body     | 16px                  | 16px       | 400    | 1.45        | ✅     |
| caption  | 12px                  | 12px       | 600    | 1.33        | ✅     |
| eyebrow  | 11px                  | 11px       | 800    | 1.27        | ✅     |
| **Font** | Fraunces for headings | Fraunces   | Both   | -           | ✅     |

### Border Radius ✅ MATCH

| Token | HTML   | React | Status |
| ----- | ------ | ----- | ------ |
| xs    | 8px    | 8     | ✅     |
| sm    | 12px   | 12    | ✅     |
| md    | 16px   | 16    | ✅     |
| lg    | 22px   | 22    | ✅     |
| xl    | 32px   | 32    | ✅     |
| full  | 9999px | 9999  | ✅     |

### Shadows ⚠️ PARTIAL MATCH

| Token   | HTML                                                           | React         | Status |
| ------- | -------------------------------------------------------------- | ------------- | ------ |
| s-1     | `0 1px 2px rgba(15,26,17,0.04), 0 2px 6px rgba(15,26,17,0.04)` | Single shadow | ⚠️     |
| s-2     | Layered 2-part shadow                                          | Single shadow | ⚠️     |
| s-3     | Layered 2-part shadow                                          | Single shadow | ⚠️     |
| s-glow  | `0 8px 32px rgba(14,92,58,0.25)`                               | Matches       | ✅     |
| s-coral | `0 8px 24px rgba(255,107,71,0.30)`                             | Matches       | ✅     |

---

## 🧩 Components Audit

### Tab Bar 🔴 CRITICAL FIX NEEDED

**HTML Demo:**

```css
.tabbar {
  backdrop-filter: blur(24px) saturate(1.5);
  background: rgba(250, 246, 238, 0.85);
  border-top: 0.5px solid var(--b1);
}
.tab.active::before {
  width: 32px;
  height: 3px;
  background: var(--brand);
  position: absolute;
  top: 0;
}
```

**React Current:** Missing frosted glass blur, missing active indicator bar on top
**Status:** 🔧 FIXED (added BlurView component)
**Verification Needed:** Check if Expo web renders BlurView correctly

### Cards

**Item Card** - Should have:

- ✅ Border radius 22px (r-lg)
- ✅ Background: white (#FFFFFF)
- ✅ Border: 1px solid #E8E0CC
- ✅ Shadow: s-1
- ✅ **LEFT STRIPE** (4px wide, gradient)
  - Fresh: Green gradient
  - Soon: Yellow/Honey gradient
  - Urgent: Red/Coral gradient
  - Expired: Gray
- ✅ Content padding: 14px 16px
- ✅ Icon bg: Status-specific bg color

**Status:** Need to verify ItemCard component has stripe

### Insight Card (Dashboard hero stat box)

**Should have:**

- ✅ Gradient background: brand → brand-light (135deg)
- ✅ Border radius: xl (32px)
- ✅ Padding: 22px
- ✅ Color: white text
- ✅ Shadow: s-glow
- ✅ Decorative elements: 2 radial gradient blobs (pseudo-elements ::before & ::after)

**Status:** Need to verify in Dashboard component

### Streak Card (Fire/7 day streak)

**Should have:**

- ✅ Gradient background: coral → honey (135deg)
- ✅ Color: white text
- ✅ Border radius: xl (32px)
- ✅ Padding: 18px
- ✅ Shadow: s-coral
- ✅ Icon text: 🔥 at 100px, opacity 0.15

**Status:** Need to verify in Dashboard component

### Stat Cards (Fresh/Soon/Urgent counters - 3 grid)

**Should have:**

- ✅ Border radius: lg (22px)
- ✅ Padding: 16px 14px
- ✅ Border: 1px solid #E8E0CC
- ✅ Background: white
- ✅ Status-specific number color
- ✅ Hover effect: gradient overlay appears (opacity 0-0.5)

**Status:** Need to verify in Dashboard stats section

### Buttons

**Primary Button:**

- ✅ Background: brand (#0E5C3A)
- ✅ Color: white
- ✅ Border radius: md (16px)
- ✅ Padding: 16px 24px
- ✅ Shadow: s-glow
- ✅ Active: scale(0.97) + darker bg
- ✅ Font weight: 700

**Secondary Button:**

- ✅ Background: white
- ✅ Border: 1.5px solid #E8E0CC
- ✅ Color: text/primary
- ✅ Active: bg changes to sunken

**Ghost Button:**

- ✅ Background: transparent
- ✅ Color: brand
- ✅ Active: bg brand-soft

**Icon Button:**

- ✅ Width/Height: 44px
- ✅ Border radius: full (9999px)
- ✅ Border: 1px solid #E8E0CC
- ✅ Active: scale(0.9)

**Status:** Need to verify Button component implementation

### Inputs

**Text Input:**

- ✅ Background: white
- ✅ Border: 1.5px solid #E8E0CC
- ✅ Border radius: md (16px)
- ✅ Padding: 16px 18px
- ✅ Font size: 17px
- ✅ Focus: border brand color + shadow

**Status:** Need to verify in forms

### Status Bar

**Should have:**

- ✅ Height: 54px
- ✅ Position: absolute, top: 0
- ✅ Dark mode: white text
- ✅ Light mode: dark text
- ✅ Notch: 110px × 30px, black, border-radius 18px

**Status:** React Native handles native status bar

### Top Bar / Header

**Should have:**

- ✅ Background: rgba(250,246,238,0.85)
- ✅ Backdrop filter: blur(20px) saturate(1.4)
- ✅ Position: sticky
- ✅ Border bottom: 0.5px transparent (becomes visible on scroll)
- ✅ Padding: 12px 22px 18px

**Status:** Need to verify in Dashboard header

---

## 🎬 Animations

| Animation         | HTML Easing                      | React Implementation      | Status                |
| ----------------- | -------------------------------- | ------------------------- | --------------------- |
| Spring            | `cubic-bezier(0.34,1.56,0.64,1)` | withSpring (damping: 0.8) | ✅                    |
| Ease              | `cubic-bezier(0.16,1,0.3,1)`     | Reanimated ease           | ✅                    |
| Quick             | `cubic-bezier(0.4,0,0.2,1)`      | Reanimated quick          | ✅                    |
| Screen transition | 0.45s ease                       | FadeInUp (300ms)          | ⚠️ Slightly different |
| Button active     | transform scale(0.97)            | withSpring                | ✅                    |
| Tab icon active   | scale(1.1)                       | Handled in tab bar        | ✅                    |

---

## 🔍 Known Issues to Fix

### High Priority (Visual Blocking)

1. **Tab Bar Active Indicator** - Need to verify BlurView renders correctly on web
2. **Item Card Stripe** - Verify gradient stripe is rendering on left side
3. **Insight Card Decorative Blobs** - Check if pseudo-elements work in React Native

### Medium Priority (Polish)

4. **Dual-part shadows** - HTML has 2-part layered shadows, React has single layer
5. **Top bar sticky** - Verify sticky positioning works on mobile scroll
6. **Search bar styling** - Verify borders and focus states

### Low Priority (Nice-to-Have)

7. **Hover states** - HTML has gradient overlay on stat cards on hover
8. **Notch styling** - Native status bar vs custom notch
9. **Modal transitions** - Verify modal fade (translateY) matches

---

## 📋 Verification Checklist

- [ ] Tab bar renders with BlurView frosted glass on web
- [ ] Tab bar shows active indicator bar on top
- [ ] Item cards show left gradient stripe
- [ ] Insight card has decorative background blobs
- [ ] Stat cards show gradient overlay on hover
- [ ] All colors match exactly
- [ ] Typography matches (font sizes, weights, spacing)
- [ ] Border radius consistent
- [ ] Shadows have correct depth
- [ ] Buttons respond to touch with spring animation
- [ ] Inputs focus state shows brand border + shadow
- [ ] Status bar appears (native)
- [ ] Animations feel smooth and match easing

---

## 🎯 Next Steps

1. **Render the React app** in browser at http://localhost:8081/web
2. **Compare side-by-side** with HTML demo
3. **Screenshot differences** and identify gaps
4. **Update components** to match
5. **Test on mobile** (iOS/Android) to verify

---

**Last Updated**: 2026-05-09
