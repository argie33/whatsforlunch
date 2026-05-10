# View HTML & React Side-by-Side Locally

## Quick Start (5 minutes)

### **Terminal 1: Start React App**

```bash
cd C:\Users\arger\code\whatsforlunch\apps\mobile
pnpm dev
```

Wait for: `Android app Expo client is available. Open it from your computer.`

Then open browser to: **http://localhost:8082**

### **Terminal 2 (Optional): Start Backend**

```bash
cd C:\Users\arger\code\whatsforlunch
pnpm local:api
```

### **Browser Windows**

- **Left window**: `file:///C:/Users/arger/code/whatsforlunch/app.html`
- **Right window**: `http://localhost:8082`

**Login to React app:**

- Email: `test@local.dev`
- Password: `any`

---

## Key Screens to Compare

1. **Splash** (auto-shows) vs app.html#screen-splash
2. **Onboarding** vs app.html#screen-onboarding
3. **Dashboard** vs app.html#screen-dashboard
4. **Items List** vs app.html#screen-items
5. **Item Detail** vs app.html#screen-detail
6. **Add Item Modal** vs app.html#screen-add
7. **Settings** vs app.html#screen-settings

---

## What to Look For

**Styling Matches:**

- [ ] Colors match exactly (brand green, status colors, text colors)
- [ ] Spacing/padding is identical to HTML
- [ ] Typography (font sizes, weights, spacing) exact match
- [ ] Border radius values precise
- [ ] Shadows exactly replicate HTML
- [ ] Animations smooth and match HTML behavior

**UI/Layout Matches:**

- [ ] Component positioning
- [ ] Hero images and image sizing
- [ ] Status badges and icons
- [ ] Empty states
- [ ] Error states
- [ ] Loading states

---

## File Locations

**HTML North Star:**

- `C:\Users\arger\code\whatsforlunch\app.html` (main)
- `C:\Users\arger\code\whatsforlunch\web-app.html` (web variant)

**React Implementation:**

- `apps/mobile/app/(main)/` - main screens
- `apps/mobile/app/(auth)/` - auth screens
- `apps/mobile/src/components/` - UI components
- `apps/mobile/src/theme/tokens.ts` - design tokens
