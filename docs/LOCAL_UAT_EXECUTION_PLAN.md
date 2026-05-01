# Local UAT Execution Plan

**Owner**: W10 (Testing Coordination)  
**Start**: May 1, 2026 (Day 30)  
**Target Completion**: May 4, 2026 (Day 33)  
**Status**: 🟢 READY TO START

---

## Pre-UAT Checklist (Day 30 — NOW)

### Build & Environment

- [ ] Clone latest from `feat/W7-phase-a-settings-nav`
- [ ] Run `pnpm install`
- [ ] Verify TypeScript check passes: `pnpm typecheck`
- [ ] Verify all tests pass: `pnpm test` (260+ tests expected)
- [ ] Clear app cache / build simulator fresh

### Device/Emulator Setup

- **iOS** (Recommended):
  - [ ] Xcode iOS Simulator (iPhone 14 Pro or iPhone SE for size coverage)
  - [ ] Settings → VoiceOver → ON (for Day 32 accessibility testing)
  - [ ] Settings → Display → Dark Mode ON (for Day 31 theme testing)
  - [ ] Settings → Accessibility → Motion → Reduce Motion ON (for animation testing)

- **Android** (Optional):
  - [ ] Android Emulator (Pixel 6 or similar)
  - [ ] Settings → TalkBack → ON
  - [ ] Settings → Dark Theme → ON
  - [ ] Settings → Remove Animations → ON

### Test Account Credentials

- **Primary Household Account**:
  - Email: `qa-household@whatsforlunch.local` (dev environment)
  - Password: `TempPassword123!` (expires after UAT)
  - Household: "QA Kitchen"
  - Members: Alice (owner), Bob (read-write)

- **Secondary Account** (for household invite testing):
  - Email: `qa-bob@whatsforlunch.local`
  - Password: `TempPassword123!`

### Test Data Setup

**6 Pre-populated Items** (for screenshot consistency):

1. **Greek Yogurt** (Fresh)
   - Location: Fridge
   - Expiry: +7 days from now
   - Status: Fresh
   - Quantity: 1 container

2. **Pasta** (Use Soon)
   - Location: Pantry
   - Expiry: +3 days from now
   - Status: Use Soon
   - Quantity: 500g

3. **Cooked Chicken** (Urgent)
   - Location: Fridge
   - Expiry: Tomorrow
   - Status: Eat Today
   - Quantity: 2 servings
   - Note: "Leftovers from Sunday dinner"

4. **Whole Wheat Bread** (Expired)
   - Location: Counter
   - Expiry: -2 days
   - Status: Expired
   - Quantity: 1 loaf

5. **Frozen Broccoli** (Frozen)
   - Location: Freezer
   - Expiry: +30 days
   - Status: Frozen (if implemented)
   - Quantity: 1 bag

6. **Orange Juice** (Use Soon)
   - Location: Fridge
   - Expiry: +5 days
   - Status: Use Soon
   - Quantity: 1L

---

## UAT Test Flows (5 flows × 2 sessions = 10 hours total)

### Day 30 — Smoke Test (1 hour)

**Goal**: Verify app launches, basic navigation works, no crashes

**Flow: Quick End-to-End**

1. [ ] Launch app
2. [ ] Sign in with qa-household@whatsforlunch.local
3. [ ] Dashboard loads, 6 items visible
4. [ ] Tap item → detail screen opens
5. [ ] Navigate: Dashboard → Scan → Settings → back to Dashboard
6. [ ] Sign out, sign back in
7. [ ] Check: No crashes, no 404 errors, no timeout errors

**Pass Criteria**: 0 crashes, all screens load < 2s

---

### Day 31 — Core Features (2 hours)

#### Flow 1: Dashboard & Item Management (30 min)

- [ ] Dashboard loads with 6 test items
- [ ] Filter by "Fridge" — shows 4 items (yogurt, pasta, chicken, juice)
- [ ] Filter by "Pantry" — shows pasta only
- [ ] Filter by "Freezer" — shows broccoli
- [ ] Filter by "Today" — shows urgently expiring items
- [ ] Item card displays: name, status (color+icon), days left
- [ ] Status colors correct (green, yellow, red, gray)
- [ ] Tap item → detail screen
- [ ] Detail screen: photo, name, expiry, storage location readable
- [ ] "Mark as Eaten" action: item moves to history
- [ ] Undo/history works
- [ ] Pull-to-refresh updates list
- [ ] Empty state: Delete all items → "Your kitchen is empty" message

**Pass Criteria**: All filters work, status colors correct, item actions responsive

#### Flow 2: Scan Screen (30 min)

- [ ] Scan FAB visible and tappable
- [ ] Camera opens
- [ ] Mode tabs visible: QR, Barcode, Photo, Date
- [ ] Tap each mode → prompt changes
- [ ] Tap QR mode → "Point at a WhatsForLunch QR sticker"
- [ ] Camera permission handled gracefully
- [ ] Tap "Close" → returns to dashboard
- [ ] (Optional) Test with test QR code if available

**Pass Criteria**: Camera opens, modes switch, close button responsive, no crashes

#### Flow 3: Item Add/Edit (30 min)

- [ ] "Add Item" FAB from dashboard
- [ ] Add form loads: Food name, Category, Expiry, Storage, Quantity
- [ ] Fill in: "Milk", Dairy (if category), tomorrow, Fridge, "1 liter"
- [ ] Save → item appears in dashboard
- [ ] Tap item → edit
- [ ] Change expiry to 2 days from now
- [ ] Save → dashboard updates
- [ ] Delete item → confirm dialog → remove

**Pass Criteria**: Form fields populated, save/edit/delete all work, validation errors clear

#### Flow 4: Settings Navigation (30 min)

- [ ] Settings screen accessible
- [ ] Preferences section: Theme (Auto/Light/Dark), Language, Units
- [ ] Theme: Switch Dark → light mode toggle OFF, dark mode ON
- [ ] Language: Switch to French (if completed) → UI text changes
- [ ] Units: Switch Metric ↔ Imperial
- [ ] Notifications: toggle On/Off
- [ ] Household: invite bob, see Alice + Bob listed
- [ ] Profile: name, email, photo visible
- [ ] Privacy: "Delete Account" visible (don't click yet)

**Pass Criteria**: All settings panels load, toggles responsive, theme switch immediate

---

### Day 32 — Accessibility (2 hours)

#### Flow 1: VoiceOver (iPhone) Testing (1 hour)

**Precondition**: VoiceOver ON (Settings → Accessibility → VoiceOver)

- [ ] **Auth Screen**:
  - Swipe right → email field announced ("Email, Text Input, required")
  - Swipe right → sign-in button announced ("Sign In, button")
  - Tap email field → keyboard opens
  - Type email → confirmation sound/announcement

- [ ] **Dashboard**:
  - Screen announced with "Dashboard" (header role)
  - Swipe right → first item announced ("Greek yogurt, Fresh, 7 days left")
  - Status conveyed by text+icon, NOT color alone
  - Swipe right → next item announced with correct status
  - Tap item → detail screen opened, header announced

- [ ] **Scan Screen**:
  - Mode tabs announced as radio buttons
  - Current mode marked "selected"
  - Camera view NOT announced (accessible={false})
  - Close button clearly labeled ("Close camera")

- [ ] **Settings**:
  - Theme radio group announced (Auto, Light, Dark)
  - Current theme marked "selected"
  - Toggle switches announce on/off state
  - Delete Account warning clear and complete

**Pass Criteria**: All interactive elements announced, status conveyed via text+icon, no invisible elements announced

#### Flow 2: Dark Mode (30 min)

- [ ] Light mode baseline: dashboard readable, all colors distinguishable
- [ ] Switch to Dark mode
- [ ] All text readable (not dark-on-dark, not light-on-light)
- [ ] Status colors adjusted (bright yellow for "Use Soon", lighter green)
- [ ] Buttons visible and tappable
- [ ] Navigation works identically to light mode
- [ ] No jarring contrast switches
- [ ] Toggle back to Light → works

**Pass Criteria**: Text readable in both modes, colors distinguishable, no visual regressions

#### Flow 3: Reduce Motion (30 min)

- [ ] Enable Reduce Motion (Settings → Accessibility → Motion)
- [ ] Relaunch app
- [ ] Pull-to-refresh: spinner visible but no spring animation (instant)
- [ ] Item card tap: instant (no fade animation)
- [ ] Modal/sheet open: instant (no slide-in)
- [ ] Haptic feedback still fires (separate from motion setting)
- [ ] Disable Reduce Motion → animations smooth and fast (200-300ms)

**Pass Criteria**: Animations disabled when Reduce Motion ON, smooth when OFF, haptics always responsive

---

### Day 33 — Copy & Metadata (1 hour)

#### Flow 1: App Store Copy Verification (30 min)

- [ ] App name: "WhatsForLunch — Food Tracker"
- [ ] Subtitle: "Stop wasting food."
- [ ] Description mentions: Scan, AI, Notifications, Sharing
- [ ] Privacy policy URL resolves
- [ ] Support email: support@whatsforlunch.app (visible somewhere)
- [ ] Age rating: 4+
- [ ] Keywords include: food, fridge, tracker, QR, waste, recipes

**Pass Criteria**: All copy present, no placeholders, links valid

#### Flow 2: Marketing Website (30 min)

- [ ] apps/web home page loads (if running locally)
- [ ] "How It Works" section visible
- [ ] Privacy Policy link works
- [ ] Terms of Service link works
- [ ] No 404 errors
- [ ] Mobile responsive (test on simulator)

**Pass Criteria**: All pages load, no broken links, copy complete

---

## UAT Session Schedule

| Day            | Time    | Lead               | Focus                     | Checklist                                     |
| -------------- | ------- | ------------------ | ------------------------- | --------------------------------------------- |
| May 1 (Day 30) | 1 hour  | QA Lead            | Smoke Test                | Basic launch, navigation, no crashes          |
| May 2 (Day 31) | 2 hours | QA Lead            | Core Features             | Dashboard, Scan, Settings, Add/Edit           |
| May 2 (Day 31) | 2 hours | Accessibility Lead | Dark Mode + Reduce Motion | Theme switching, animations, contrast         |
| May 3 (Day 32) | 2 hours | Accessibility Lead | VoiceOver/TalkBack        | Screen reader navigation, status announcement |
| May 3 (Day 32) | 1 hour  | Product Lead       | Copy & Metadata           | Store copy, legal links, keywords             |
| May 4 (Day 33) | 1 hour  | QA Lead            | Regression Testing        | Re-test any failed items                      |
| May 5 (Day 34) | 1 hour  | QA Lead            | Sign-Off                  | Final verification before launch              |

---

## Known Limitations (For UAT Only)

🚫 **Not Testing**:

- Household sync (requires 2 real devices or network simulation)
- Real camera scanning (can use test QR code if available)
- Push notifications (requires APNs certificate)
- RevenueCat subscription (staging environment setup required)
- Recipe generation (AI service requires API keys)

✅ **Testing in Offline Mode**:

- All item CRUD operations persist locally
- Navigation works (local-first WatermelonDB)
- Sync badge shows "Offline" — OK for UAT

---

## Issue Reporting Template

**Title**: `[UAT] [Screen] — [Issue]`  
Example: `[UAT] Dashboard — Status colors not showing`

**Template**:

```
## Environment
- Device: iPhone 14 Pro Simulator / Android Pixel 6
- App Version: [branch/commit]
- OS: iOS 17 / Android 14
- Language: English / French / Spanish / German

## Issue
[Describe what's broken]

## Expected
[What should happen]

## Actual
[What's happening instead]

## Steps to Reproduce
1. ...
2. ...
3. ...

## Severity
- [ ] Blocker (cannot proceed with UAT)
- [ ] High (feature broken, workaround exists)
- [ ] Medium (UI issue, functionality works)
- [ ] Low (cosmetic/typo)

## Attachments
[Screenshot, video, or log if relevant]
```

---

## Go/No-Go Criteria (Day 34)

### PASS (Go to Launch)

- ✅ 0 blocker issues
- ✅ All core flows (Auth, Dashboard, Scan, Settings) tested and working
- ✅ Accessibility: VoiceOver/TalkBack testing PASS
- ✅ Dark mode functional
- ✅ Reduce Motion respected
- ✅ Copy/metadata complete

### FAIL (No-Go, Continue Testing)

- ❌ Blocker issue unresolved
- ❌ Crash on main flow
- ❌ Screen reader navigation broken
- ❌ Dark mode text unreadable
- ❌ Missing app store copy

---

## Next Steps After UAT

1. **If PASS**: Proceed to app store submission (W9)
2. **If FAIL**: Triage issues, fix, re-test before Day 35

**Contact**: W10 Testing Lead (Slack: #whatsforlunch-w10-testing)

---

_Last Updated: May 1, 2026_  
_Status: 🟢 READY FOR EXECUTION_
