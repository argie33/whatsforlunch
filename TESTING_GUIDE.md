# 🧪 WhatsFresh Testing Guide

**Last Updated**: May 1, 2026  
**Status**: ✅ Ready for End-to-End Testing

---

## 🚀 Quick Start

### 1. Access the App
```
Open: http://localhost:8082
```

### 2. Sign In
```
Email:    test@local.dev
Password: (any password — not validated in local mode)
Tap:      Sign In
```

### 3. Navigate Screens
- **Items Tab** (📦): View food inventory
- **Scan Tab** (📱): Scan QR codes, claim containers
- **Containers Tab** (📋): Manage containers with QR numbers
- **Recipes Tab** (🍳): AI-powered recipe recommendations
- **Settings Tab** (⚙️): Profile, appearance, preferences

---

## ✅ Test Scenarios

### Scenario 1: View Auto-Seeded Items
**Expected**: App should populate with test data on first login

1. Sign in with `test@local.dev`
2. Navigate to **Items** tab
3. **✓ Should see**:
   - 10 test items (pasta, chicken, yogurt, etc.)
   - Items grouped by status (Fresh, Soon, Urgent, Expired)
   - Color-coded status badges
   - Storage icons (🧊 fridge, ❄️ freezer, 🍞 pantry)

**Test Data Included**:
- Leftover pasta (expires in 18h)
- Chicken breast (expires in 1d)
- Frozen peas (freezer, expires in 120d)
- Spinach (fridge, expires in 2d)
- And 6 more items...

---

### Scenario 2: Mark Item as Eaten
**Expected**: Item moves to inactive, confetti animation plays

1. From **Items** tab, tap any "Fresh" or "Soon" item
2. Scroll down to **Mark Eaten** button
3. Tap it
4. **✓ Should see**:
   - Confetti animation
   - Item removed from inventory
   - Expiry notification cancelled
   - Automatic return to items list

---

### Scenario 3: Change Item Status
**Expected**: Update item status and behavior changes

1. From **Items** tab, tap any item
2. Try each status action:
   - **Mark Frozen**: Item status changes to frozen
   - **Mark Tossed**: Item marked as discarded
   - **Mark Partial**: Reduce quantity (e.g., "1/2 remaining")
   - **Snooze**: Extend expiry by 1-3 days

**✓ Should see**:
- Item immediately updates in list
- Status color changes
- Notifications rescheduled

---

### Scenario 4: Add New Item
**Expected**: Create item with details, see on dashboard

1. From **Items** tab, tap the **+** button (bottom right)
2. Fill in:
   - Food name: (e.g., "Leftover pizza")
   - Storage location: Fridge / Freezer / Pantry
   - Quantity: (optional)
   - Expiry date: (pick a future date)
3. Tap **Save**
4. **✓ Should see**:
   - Item appears on items list
   - Correct storage location icon
   - Status badge based on expiry
   - Notification scheduled

---

### Scenario 5: Container Management with QR Numbers
**Expected**: Create containers with auto-generated QR numbers

1. Navigate to **Containers** tab
2. Tap **+** button to create container
3. Enter name: (e.g., "Blue Tupperware")
4. Tap **Save**
5. **✓ Should see**:
   - Container appears with:
     - Container name
     - **QR number** (e.g., `# 5431`)
     - Item count (0 initially)
6. Tap container to view detail screen
7. **✓ Should see**:
   - QR number displayed
   - QR token (technical code)
   - Print stickers option
   - Archive button

---

### Scenario 6: Print QR Stickers
**Expected**: Generate printable sticker sheet

1. Navigate to **Containers** tab
2. Tap **Printer icon** (bottom right)
3. Select page size: Letter or A4
4. **✓ Should see**:
   - Preview of sticker sheet
   - 24 QR codes in 4×6 grid
   - Each sticker shows:
     - QR code graphic
     - Token text below
5. Tap **Print** or **Share**
6. **✓ Should see**:
   - Native print dialog or sharing options

---

### Scenario 7: View Recipe Recommendations
**Expected**: AI-powered recipes based on expiring items

1. Navigate to **Recipes** tab
2. **✓ Should see**:
   - List of expiring items (top 10)
   - Generate button
3. Tap **Generate Recipes**
4. **✓ Should see**:
   - Loading state briefly
   - Recipe cards showing:
     - Recipe title
     - Time required
     - Difficulty (Easy/Medium/Hard)
     - Servings
     - Checkmark: uses expiring items
5. Tap recipe card to see details

---

### Scenario 8: Edit Item Details
**Expected**: Update existing item information

1. From **Items** tab, tap any item
2. Tap **Edit** (pencil icon in top right)
3. Update fields:
   - Food name
   - Expiry date
   - Quantity
   - Storage location
4. Tap **Save**
5. **✓ Should see**:
   - Changes reflected immediately
   - Status badge updated if expiry changed
   - Notifications rescheduled

---

### Scenario 9: Delete Item
**Expected**: Remove item from inventory with confirmation

1. From **Items** tab, tap any item
2. Scroll to bottom
3. Tap **Delete** button
4. **✓ Should see**:
   - Confirmation dialog
5. Confirm deletion
6. **✓ Should see**:
   - Item removed from list
   - Notification cancelled

---

### Scenario 10: Dark Mode Toggle
**Expected**: Switch between light and dark themes

1. Navigate to **Settings** tab
2. Tap **Appearance** section
3. Toggle **Dark Mode**
4. **✓ Should see**:
   - All colors invert
   - Text contrast appropriate
   - Readability maintained

---

## 🔍 Data Validation Tests

### Test: Storage Location Filtering
1. Items tab → Tap **All** filter
2. **✓ Should see**: All items
3. Tap **Fridge** filter
4. **✓ Should see**: Only fridge items
5. Try other locations: Freezer, Pantry

### Test: Search Items
1. Items tab → Type in search box
2. Search for: "pasta"
3. **✓ Should see**: Only items matching "pasta"
4. Clear search
5. **✓ Should see**: All items return

### Test: Expired Items Section
1. Items tab → Look for **Expired** section
2. **✓ Should see**: Strawberries (in test data, already expired)
3. Red status badge
4. Time left: "-X hours ago"

---

## 🚨 Error Handling Tests

### Test: Network Error Simulation
1. Stop the local-mock server: Kill Node processes
2. Try to perform action (e.g., add item)
3. **✓ Should see**:
   - Graceful error message
   - App still functional
   - Data saved locally (queued for sync)

### Test: Invalid Input
1. Try to add item with empty name
2. **✓ Should see**: Validation error or empty name blocked
3. Try invalid date
4. **✓ Should see**: Date picker prevents invalid dates

---

## 📊 Performance Tests

### Test: Large Dataset
1. Create 50+ items through the UI
2. Navigate between tabs
3. **✓ Should see**:
   - Smooth scrolling
   - No lag in interactions
   - Fast search (< 100ms)

### Test: Notifications
1. Add item expiring in 1 minute
2. Wait for notification
3. **✓ Should see**:
   - Notification appears (if enabled)
   - Clicking navigates to item
   - Can snooze or mark eaten

---

## 🔒 Data Persistence Tests

### Test: Local Storage
1. Add/modify items
2. Force-close app (hard refresh)
3. Reopen app
4. **✓ Should see**:
   - All items still present
   - No data loss
   - Changes persisted

### Test: Sign Out & Sign In
1. Settings tab → **Sign Out**
2. Confirm sign out
3. Sign in again with `test@local.dev`
4. **✓ Should see**:
   - All previous data intact
   - No loss of items/containers

---

## 🎯 Feature Completeness Checklist

- [x] User authentication (local mock)
- [x] Item creation with expiry dates
- [x] Item status tracking (eaten/tossed/frozen/partial)
- [x] Container management
- [x] QR number generation (1000-9999 range)
- [x] QR sticker printing
- [x] Recipe recommendations (Phase C.3)
- [x] Search & filtering
- [x] Status badges with colors
- [x] Notifications (local expiry alerts)
- [x] Dark mode support
- [x] Responsive design
- [x] Accessibility features
- [x] Data persistence (WatermelonDB)
- [x] Offline support (local-first)

---

## 📞 Known Limitations

| Feature | Status | Notes |
|---------|--------|-------|
| Camera scanning | ⏳ Placeholders only | Requires physical device or emulator |
| Push notifications | ⏳ Infrastructure ready | Requires APNs/FCM setup |
| AI photo classification | ✅ Mock ready | Returns 70-100% confidence mock data |
| Cloud sync | ✅ Queue infrastructure ready | Queued for backend integration |
| User attribution | ✅ Working | Mock user ID: 54bd7fff-111c-413a-850c-f6d0bef56303 |

---

## 💡 Tips for Testing

1. **Test Data Auto-Loads**: Sign in and you'll see 10 pre-populated items
2. **Timestamps**: Test data includes items at various expiry states
3. **QR Numbers**: Each container gets a unique number 1000-9999
4. **Notifications**: Check device notification settings (may need to enable)
5. **Dark Mode**: Settings → Appearance → toggle Dark Mode
6. **Multiple Devices**: Can sign in on multiple browsers/devices (same mock user)

---

## 🐛 Reporting Issues

If you encounter issues:

1. **Check Servers**:
   ```bash
   curl http://localhost:4000/health
   curl http://localhost:8082/
   ```

2. **Check Logs**:
   - Mobile: Browser console (F12)
   - API: Terminal where local-mock is running

3. **Reset Data**:
   - Clear browser storage: DevTools → Storage → Clear all
   - Will re-seed on next login

---

## ✨ What's Next

After testing:
- [ ] Verify all scenarios pass
- [ ] Check for UI/UX improvements
- [ ] Test on physical devices (iOS/Android)
- [ ] Collect user feedback
- [ ] Iterate on features

**Ready to test!** 🚀
