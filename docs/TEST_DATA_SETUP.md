# Test Data Setup for UAT

**Purpose**: Create consistent test environment for UAT with QA Kitchen household and 6 pre-populated items.

**Time to Complete**: 10-15 minutes

---

## Manual Setup (No Script Required)

### Step 1: Create Primary Account

1. Launch app on simulator/device
2. Sign in screen → "Sign in with email"
3. Enter email: `qa-household@whatsfresh.local`
4. Tap "Send magic link"
5. Check inbox (or simulator logs) for magic link
6. Tap link → redirects to app
7. Set password: `TempPassword123!`
8. Onboarding slides:
   - Slide 1: "Know what's in your kitchen" → Continue
   - Slide 2: "Snap, scan, log" → Continue
   - Slide 3: "We remember so you don't" → Continue
   - Slide 4: "A few permissions" → Allow Camera, Allow Notifications
9. Dashboard loads (empty)

### Step 2: Create Household

1. Settings → Households
2. Tap "Create a household"
3. Household name: `QA Kitchen`
4. Create → household created
5. Invite Bob:
   - Tap "Invite member"
   - Email: `qa-bob@whatsfresh.local`
   - Send invite
   - (Bob would accept invite in their account)

### Step 3: Manually Add 6 Test Items

**Item 1: Greek Yogurt (Fresh)**

1. Dashboard → FAB → "Add manually"
2. Photo: (optional, skip for now)
3. Food name: "Greek yogurt"
4. Category: Dairy (if available)
5. Expiry: +7 days from today (e.g., May 8, 2026)
6. Storage: Fridge
7. Quantity: "1 container"
8. Save

**Item 2: Pasta (Use Soon)**

1. Dashboard → FAB → "Add manually"
2. Food name: "Pasta"
3. Category: Grains
4. Expiry: +3 days from today (e.g., May 4, 2026)
5. Storage: Pantry
6. Quantity: "500g"
7. Save

**Item 3: Cooked Chicken (Urgent)**

1. Dashboard → FAB → "Add manually"
2. Food name: "Cooked chicken"
3. Category: Meat
4. Expiry: Tomorrow (e.g., May 2, 2026)
5. Storage: Fridge
6. Quantity: "2 servings"
7. Notes: "Leftovers from Sunday dinner"
8. Save

**Item 4: Whole Wheat Bread (Expired)**

1. Dashboard → FAB → "Add manually"
2. Food name: "Whole wheat bread"
3. Category: Bread
4. Expiry: -2 days from today (e.g., Apr 29, 2026)
5. Storage: Counter
6. Quantity: "1 loaf"
7. Save

**Item 5: Frozen Broccoli (Frozen)**

1. Dashboard → FAB → "Add manually"
2. Food name: "Frozen broccoli"
3. Category: Vegetables
4. Expiry: +30 days from today (e.g., May 31, 2026)
5. Storage: Freezer
6. Quantity: "1 bag"
7. Save

**Item 6: Orange Juice (Use Soon)**

1. Dashboard → FAB → "Add manually"
2. Food name: "Orange juice"
3. Category: Beverages
4. Expiry: +5 days from today (e.g., May 6, 2026)
5. Storage: Fridge
6. Quantity: "1L"
7. Save

### Step 4: Verify Dashboard

Dashboard should now show:

- **Count**: "6 items"
- **Sections** (sorted by expiry):
  - EAT TODAY: Cooked chicken
  - USE SOON: Pasta, Orange juice
  - FRESH: Greek yogurt, Frozen broccoli
  - EXPIRED: Whole wheat bread

---

## Quick Checklist

- [ ] Primary account created (qa-household@whatsfresh.local)
- [ ] Password set (TempPassword123!)
- [ ] Onboarding completed
- [ ] Household created ("QA Kitchen")
- [ ] 6 items added to dashboard
- [ ] Expiry dates set correctly
- [ ] Filters work: "Fridge" shows 4 items, "Pantry" shows 1, etc.
- [ ] Dark mode toggle works
- [ ] Sign out/sign back in works

---

## Test Data Reset

If you need to reset the test data:

1. **App**: Clear all data
   - Settings → Delete Account → Delete all
   - Or: Reinstall app (clears local WatermelonDB)

2. **Backend** (if using test server):
   - Delete test accounts via admin panel
   - Or: Wait for nightly cleanup (if configured)

---

## Secondary Account (For Invite Testing)

Create a second account to test household invites:

1. Sign out
2. Sign in screen
3. Email: `qa-bob@whatsfresh.local`
4. Send magic link → verify link
5. Set password: `TempPassword123!`
6. Onboarding → skip or complete
7. Bob's account created (no households yet)
8. Primary account → Settings → Households → Invite Bob
9. Bob's account → check for invite → accept

---

## Expected Behavior After Setup

### Dashboard View

```
6 items
├─ EAT TODAY (1)
│  └─ Cooked chicken | expires tomorrow
├─ USE SOON (2)
│  ├─ Pasta | expires in 3 days
│  └─ Orange juice | expires in 5 days
├─ FRESH (2)
│  ├─ Greek yogurt | expires in 7 days
│  └─ Frozen broccoli | expires in 30 days
└─ EXPIRED (1)
   └─ Whole wheat bread | expired 2 days ago
```

### Filter Tests

- **All**: 6 items
- **Fridge**: 4 items (yogurt, chicken, juice, bread? — depends on counter classification)
- **Freezer**: 1 item (broccoli)
- **Pantry**: 1 item (pasta)
- **Today**: 2 items (chicken urgent, pasta + juice soon)

### Status Colors (if UI complete)

- 🟢 Fresh: Green
- 🟡 Use Soon: Yellow
- 🔴 Urgent: Red
- ⚫ Expired: Gray

---

## Notes for Testers

- **Magic Link**: In dev environment, check app console or simulator logs for magic link URL
- **Camera Permission**: Grant during onboarding Slide 4 for scan testing
- **Offline Mode**: All items persist locally until sync is triggered
- **Language Switch**: After setup, test French/Spanish/German in Settings → Preferences → Language

---

_Test data setup complete → Ready for UAT execution_
