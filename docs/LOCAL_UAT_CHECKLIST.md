# Local UAT Checklist

Pre-UAT setup and validation checklist for WhatsFresh mobile app. All items must pass before staging deployment.

## ✅ Pre-UAT Environment Setup

### 1. Start Local Services

```bash
# Terminal 1: Start DynamoDB Local + mock API
pnpm local:setup

# Terminal 2: Seed test data
pnpm local:seed

# Terminal 3: Start mobile dev server
pnpm local:dev
```

### 2. Configure Mobile App

- Verify `.env.local` has:
  ```
  EXPO_PUBLIC_AUTH_MODE=local
  EXPO_PUBLIC_APPSYNC_URL=http://localhost:4000/graphql
  ```
- Build development client: `eas build --profile development --platform ios` (or android)
- Install on simulator or physical device

### 3. Start App

- Press `i` for iOS Simulator or scan QR code for physical device
- App should load to onboarding screen

## 🧪 Authentication Tests

- [ ] **Sign In - Email**: Enter `test@wfl.local` → should create local user
- [ ] **Sign In - Verification**: Verify token is stored in MMKV
- [ ] **Sign In - Household**: First login creates default household "Kitchen"
- [ ] **Sign In - Persistence**: Close app, reopen → logged in state persists
- [ ] **Sign Out**: Settings → Delete Account → confirms deletion → returns to sign-in
- [ ] **Multiple Users**: Sign in as different emails → separate households

## 📦 Item Management Tests

### Add Items

- [ ] **Manual Entry**: Add Item → fill name/location/quantity/expiry → saves locally
- [ ] **Camera/Photo**: Add Item → Photo → saves with image reference
- [ ] **Barcode Scan**: Add Item → Scan → looks up product (stub data)
- [ ] **Validation**: Can't add without name → error message shows
- [ ] **Expiry Calculation**: Auto-calculates days remaining based on rule

### List Items

- [ ] **Dashboard**: Shows all items grouped by expiry (fresh/expiring soon)
- [ ] **Status Colors**: Active=green, partial=yellow, expired=red
- [ ] **Search/Filter**: Filter by name, location, category works
- [ ] **Sort**: Sort by expiry date works
- [ ] **Offline**: Network off → items still visible

### Item Details

- [ ] **View Details**: Tap item → shows full info (notes, quantity, storage)
- [ ] **Edit Item**: Edit → change fields → saves
- [ ] **Mark Eaten/Tossed**: Change status → updates immediately
- [ ] **Linked Container**: Shows which container item is in

### Bulk Actions (Long-Press)

- [ ] **Select Multiple**: Long-press item → select checkboxes appear
- [ ] **Select All**: "Select All" button selects all items on screen
- [ ] **Batch Mark Eaten**: Select 3 items → Mark Eaten → all update together
- [ ] **Batch Move**: Select 2 items → Move to Container → all move
- [ ] **Deselect**: Tap selected item again → deselected

## 🏠 Containers Tests

- [ ] **List**: Containers tab shows fridge, freezer, pantry, counter, lunchbox
- [ ] **Create**: Add Container → custom name → saves
- [ ] **Edit**: Edit container name → updates
- [ ] **View Items**: Tap container → shows items in it
- [ ] **Move Item**: Dashboard → item → move to different container
- [ ] **Empty State**: Empty container shows illustration + count

## 🍽️ Recipes Tests

- [ ] **View Screen**: Recipes tab loads
- [ ] **Select Items**: Expiring items pre-selected
- [ ] **Generate**: Button generates recipe suggestions (uses stub data)
- [ ] **View Recipe**: Shows difficulty, servings, linked items
- [ ] **Cook This**: Marks linked items as eaten

## ⚙️ Settings Tests

### Profile

- [ ] **View Profile**: Settings → Profile shows user email/name
- [ ] **Edit Name**: Change display name → saves
- [ ] **Edit Preferences**: Change dietary prefs, units, locale → saves

### Notifications

- [ ] **Toggle On**: Enable notifications
- [ ] **Set Time**: Configure notification time (e.g., 9am daily)
- [ ] **Dismiss**: Settings shows enabled status

### Households

- [ ] **View**: Settings → Households shows default household
- [ ] **Create**: Create new household → name it → saves
- [ ] **Switch**: Switch between households → dashboard updates
- [ ] **Invite**: (Stub) Invite link generation works

### Subscription

- [ ] **Free Tier**: Shows Free plan card
- [ ] **Purchase Button**: (Stub) Shows in-app purchase flow
- [ ] **Restore**: Restore Purchases button present

### Dark Mode

- [ ] **Toggle**: Settings → Dark mode toggle works
- [ ] **Persistence**: Close app → reopens in dark mode
- [ ] **All Screens**: Dark mode applies to all screens

### Other

- [ ] **About**: Shows version number + links
- [ ] **Privacy**: Opens privacy policy
- [ ] **Support**: Shows support options
- [ ] **Delete Account**: Shows confirmation, deletes local data

## 🔄 Sync & Offline Tests

- [ ] **Offline Mode**: Turn off network → app still works
- [ ] **Create While Offline**: Add items offline → syncs when online
- [ ] **Edit While Offline**: Edit item offline → syncs
- [ ] **Conflict Resolution**: Edit same item on 2 devices → newer wins
- [ ] **Status Indicator**: Offline badge shows in header
- [ ] **Queue**: Items queued for sync show "pending" badge

## 🌍 Localization Tests

- [ ] **English**: Default language English
- [ ] **Spanish**: Change locale to es → text updates
- [ ] **French**: Change locale to fr → text updates
- [ ] **German**: Change locale to de → text updates
- [ ] **Missing Strings**: No [i18n:key] placeholders on screen

## ♿ Accessibility Tests

- [ ] **VoiceOver/TalkBack**: Enable screen reader → can navigate all screens
- [ ] **Labels**: All interactive elements have `accessibilityLabel`
- [ ] **Button Roles**: Interactive elements announced as buttons
- [ ] **Text Contrast**: All text passes WCAG AA (4.5:1 for normal, 3:1 for large)
- [ ] **Touch Targets**: All buttons >= 44pt minimum touch area

## 🎨 UI/UX Tests

- [ ] **Layout**: No layout breaks on iPhone 12, 14, 15 Pro sizes
- [ ] **Safe Area**: Content respects notch + bottom home indicator
- [ ] **Animations**: Transitions are smooth, no jank
- [ ] **Empty States**: All empty states show helpful illustrations + CTAs
- [ ] **Loading**: Loading spinners show during API calls
- [ ] **Error Handling**: Error messages are helpful and actionable

## 📊 Performance Tests

- [ ] **Cold Start**: App starts in < 3 seconds
- [ ] **Scroll**: Dashboard scrolls smoothly with 50+ items
- [ ] **Search**: Filter with 500 items completes in < 500ms
- [ ] **Navigation**: Tab switching is instant
- [ ] **Memory**: No memory leaks after 5min of interaction

## 🧠 Data Integrity Tests

- [ ] **Conflict**: Two edits to same item → last-write-wins
- [ ] **Partial Sync**: Partial network → retries on reconnect
- [ ] **Stale Data**: Offline for 30min → syncs latest on reconnect
- [ ] **Version Tracking**: Items have version numbers (1, 2, 3...)
- [ ] **Timestamps**: Modification times are accurate to item edits

## 🐛 Bug Hunt Checklist

As you test, note any issues:

| Issue                           | Severity | Steps to Reproduce      | Status   |
| ------------------------------- | -------- | ----------------------- | -------- |
| Example: Button doesn't respond | High     | Tap add item 2x quickly | Fixed ✅ |
|                                 |          |                         |          |
|                                 |          |                         |          |

## ✅ Sign-Off

**Tester Name**: ****\_\_\_\_****  
**Date**: ****\_\_\_\_****  
**All Checklist Items Pass**: [ ] Yes [ ] No  
**Critical Bugs Found**: \_\_\_\_  
**Ready for Staging Deployment**: [ ] Yes [ ] No

### Notes

```
[Add notes here about any findings, workarounds, or observations]
```

---

## Quick Commands Reference

```bash
# Start local environment (all services + mobile)
pnpm local:dev

# Just start services (no mobile)
pnpm local:setup

# Reset everything to clean state
pnpm local:reset

# View API logs
pnpm local:api-logs

# Seed fresh test data
pnpm local:seed

# Run local API integration tests
pnpm local:test

# Validate dev environment setup
pnpm validate:setup
```

## Troubleshooting

**App won't connect to local API**

- Check `.env.local` has `EXPO_PUBLIC_APPSYNC_URL=http://localhost:4000/graphql`
- Verify local API is running: `pnpm local:setup`
- Check simulator networking: iOS Simulator → Settings → WiFi should show your network

**Items not syncing**

- Check device is online: Network should be reachable
- Verify app has "network" permission
- Clear app cache: Offboarding → Delete Account → sign in fresh

**Notifications not working**

- Local UAT doesn't send real notifications (stub only)
- Verify toggle saves setting to MMKV
- Check EXPO_PUBLIC_ENV=local (disables real notifications)

**Dark mode not applying**

- Force quit app + reopen
- Check device system dark mode setting matches pref
- See `useAppTheme` hook in settings/useAppTheme.ts
