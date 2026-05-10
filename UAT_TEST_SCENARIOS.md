# UAT Test Scenarios — User Acceptance Testing

**Scope**: All core user journeys  
**Environment**: Local (http://localhost:8082)  
**Testers**: All teams + QA  
**Duration**: Days 29-31

---

## Scenario 1: Sign-In & Onboarding

**Goal**: Verify authentication and initial setup

### Steps
1. Open http://localhost:8082
2. Click "Dev" button (dev@local.test bypass)
3. Accept onboarding
4. Land on Dashboard

**Expected Results**
- ✅ Sign-in screen visible
- ✅ Dev button works
- ✅ No auth errors
- ✅ Dashboard loads
- ✅ Session persists on page reload

**Test Data**: dev@local.test (hardcoded dev account)

**Pass/Fail**: _____ Time: _____ Tester: _____

---

## Scenario 2: Dashboard — View & Filter Items

**Goal**: Verify item list, filtering, and search

### Steps
1. On Dashboard tab
2. Verify item list visible (or empty state)
3. Click filter buttons (All → Fridge → Freezer → Pantry)
4. Use search bar to filter items
5. Verify counts match filter

**Expected Results**
- ✅ Items display correctly
- ✅ Filters work
- ✅ Search filters items
- ✅ Empty state shows when no items
- ✅ No loading errors

**Test Data**: Add sample items first (Scenario 3)

**Pass/Fail**: _____ Time: _____ Tester: _____

---

## Scenario 3: Dashboard — Add Item

**Goal**: Verify item creation workflow

### Steps
1. On Dashboard, tap + (FAB) button
2. Fill in form:
   - Food name: "Milk"
   - Storage location: "Fridge"
   - Expiry: Tomorrow
3. Tap "Add Item"
4. Verify item appears in list

**Expected Results**
- ✅ Form opens
- ✅ All fields accessible
- ✅ Item created successfully
- ✅ Item visible in list immediately
- ✅ Sync status shows "syncing"

**Test Data**: Create 5 sample items:
- Milk (fridge, 1 day)
- Bread (pantry, 3 days)
- Chicken (freezer, 30 days)
- Lettuce (fridge, 1 day)
- Cereal (pantry, 90 days)

**Pass/Fail**: _____ Time: _____ Tester: _____

---

## Scenario 4: Dashboard — Swipe Actions

**Goal**: Verify swipe actions (Mark Eaten, Mark Tossed)

### Steps
1. On Dashboard with items visible
2. Swipe item RIGHT → "Mark Eaten" appears
3. Tap "Mark Eaten"
4. Item removed from list
5. Swipe different item LEFT → "Mark Tossed"
6. Tap "Mark Tossed"
7. Item removed from list

**Expected Results**
- ✅ Swipe gestures work
- ✅ Actions appear correctly
- ✅ Items removed after action
- ✅ Sync status updates
- ✅ No errors

**Test Data**: Use items from Scenario 3

**Pass/Fail**: _____ Time: _____ Tester: _____

---

## Scenario 5: Scan Screen — QR Code Mode

**Goal**: Verify QR scanner integration

### Steps
1. Navigate to Scan tab
2. Select "QR Code" mode
3. Point camera at QR code (or skip for now)
4. Verify camera access request
5. Test fallback if camera unavailable

**Expected Results**
- ✅ Scan tab accessible
- ✅ QR mode selectable
- ✅ Camera permission requested
- ✅ Camera preview shows (if allowed)
- ✅ No crashes

**Test Data**: N/A (camera test)

**Pass/Fail**: _____ Time: _____ Tester: _____

---

## Scenario 6: Scan Screen — Photo Mode

**Goal**: Verify photo upload for AI classification

### Steps
1. On Scan tab, select "Photo" mode
2. Tap upload/camera button
3. Select or take a photo
4. Verify mock food response
5. Verify form pre-fills with data

**Expected Results**
- ✅ Photo mode works
- ✅ Mock response returns (foodType, confidence)
- ✅ Form pre-fills
- ✅ User can adjust data
- ✅ Can save as item

**Test Data**: Any food photo

**Pass/Fail**: _____ Time: _____ Tester: _____

---

## Scenario 7: Scan Screen — Date Mode

**Goal**: Verify date extraction from photo

### Steps
1. On Scan tab, select "Date" mode
2. Upload/take photo of expiry date
3. Verify mock OCR response
4. Verify date field pre-fills
5. User can adjust

**Expected Results**
- ✅ Date mode works
- ✅ Mock date returned
- ✅ Form pre-filled
- ✅ User can edit
- ✅ Can save

**Test Data**: Photo with visible date

**Pass/Fail**: _____ Time: _____ Tester: _____

---

## Scenario 8: Item Detail — View & Quick Actions

**Goal**: Verify item detail screen

### Steps
1. On Dashboard, tap an item
2. Verify detail screen shows all info
3. Tap quick actions:
   - Mark Eaten
   - Mark Tossed
   - Snooze
4. Verify actions work

**Expected Results**
- ✅ Detail screen readable
- ✅ All fields visible
- ✅ Quick actions work
- ✅ Returns to list after action
- ✅ Updates reflected

**Test Data**: Use Scenario 3 items

**Pass/Fail**: _____ Time: _____ Tester: _____

---

## Scenario 9: Settings — Profile

**Goal**: Verify profile settings

### Steps
1. Navigate to Settings tab
2. Tap Profile section
3. Verify fields visible:
   - Name
   - Email
   - Photo
   - Timezone
4. Try editing a field
5. Verify save/cancel works

**Expected Results**
- ✅ All fields visible
- ✅ Can tap to edit
- ✅ Save works (mock)
- ✅ Cancel discards changes
- ✅ No crashes

**Test Data**: Try editing name to "Test User"

**Pass/Fail**: _____ Time: _____ Tester: _____

---

## Scenario 10: Settings — Theme Toggle

**Goal**: Verify dark mode

### Steps
1. In Settings → Preferences
2. Find Theme toggle
3. Tap: Light → Dark
4. Verify UI changes to dark mode
5. Navigate around app
6. Toggle back to Light
7. Verify persists on reload

**Expected Results**
- ✅ Theme toggle visible
- ✅ Dark mode applies immediately
- ✅ All text readable in dark
- ✅ Colors correct
- ✅ Persists after reload

**Pass/Fail**: _____ Time: _____ Tester: _____

---

## Scenario 11: Settings — Language Change

**Goal**: Verify i18n (English/Spanish/French)

### Steps
1. In Settings → Preferences
2. Find Language picker
3. Change to: Español
4. Verify all UI text changes to Spanish
5. Navigate around app
6. Change to: Français
7. Verify all text changes to French
8. Change back to English

**Expected Results**
- ✅ Language picker works
- ✅ Text changes immediately
- ✅ All UI translated
- ✅ Numbers/dates localized
- ✅ Persists after reload

**Pass/Fail**: _____ Time: _____ Tester: _____

---

## Scenario 12: Settings — Notifications

**Goal**: Verify notification preferences

### Steps
1. In Settings → Notifications
2. Verify toggles for:
   - Expiry reminders
   - Daily digest
   - Shopping suggestions
3. Toggle each on/off
4. Verify state persists
5. Tap notification schedule time

**Expected Results**
- ✅ All toggles visible
- ✅ Toggles respond
- ✅ State persists
- ✅ Time picker works
- ✅ No errors

**Pass/Fail**: _____ Time: _____ Tester: _____

---

## Scenario 13: Settings — Account (Sign Out)

**Goal**: Verify sign out clears session

### Steps
1. In Settings → Account
2. Tap "Sign Out"
3. Verify confirmation dialog
4. Tap "Confirm"
5. Verify redirected to sign-in
6. Verify session cleared

**Expected Results**
- ✅ Sign out prompt shown
- ✅ Confirmation required
- ✅ Redirect to sign-in
- ✅ Session cleared
- ✅ Cannot go back without re-auth

**Pass/Fail**: _____ Time: _____ Tester: _____

---

## Scenario 14: Offline — Add Item Without Network

**Goal**: Verify offline queue

### Steps
1. Enable Airplane Mode
2. On Dashboard, add new item
3. Verify item appears locally
4. Check sync status shows "Offline"
5. Disable Airplane Mode
6. Verify auto-sync begins
7. Verify sync status → "Synced"

**Expected Results**
- ✅ Item created offline
- ✅ Sync status shows offline
- ✅ Auto-syncs on reconnect
- ✅ No data loss
- ✅ Status updates correctly

**Test Data**: Create item while offline

**Pass/Fail**: _____ Time: _____ Tester: _____

---

## Scenario 15: Accessibility — VoiceOver (iOS)

**Goal**: Verify screen reader compatibility

### Steps
1. Enable VoiceOver (iOS settings)
2. Navigate Dashboard with gestures
3. Verify labels are read aloud
4. Test swipe actions with VoiceOver
5. Navigate all tabs
6. Disable VoiceOver

**Expected Results**
- ✅ All buttons labeled
- ✅ Screen reader announces items
- ✅ Navigation works with gestures
- ✅ Form labels announced
- ✅ No confusion or crashes

**Test Data**: Use Scenario 3 data

**Pass/Fail**: _____ Time: _____ Tester: _____

---

## Summary

| # | Scenario | Pass | Fail | Notes |
|----|----------|------|------|-------|
| 1 | Sign-In | __ | __ | |
| 2 | Dashboard View | __ | __ | |
| 3 | Add Item | __ | __ | |
| 4 | Swipe Actions | __ | __ | |
| 5 | Scan QR | __ | __ | |
| 6 | Scan Photo | __ | __ | |
| 7 | Scan Date | __ | __ | |
| 8 | Item Detail | __ | __ | |
| 9 | Settings Profile | __ | __ | |
| 10 | Dark Mode | __ | __ | |
| 11 | Language | __ | __ | |
| 12 | Notifications | __ | __ | |
| 13 | Sign Out | __ | __ | |
| 14 | Offline | __ | __ | |
| 15 | Accessibility | __ | __ | |

**Total Passed**: ___/15  
**Total Failed**: ___/15  
**Pass Rate**: ___%

---

## UAT Sign-Off

**Tester(s)**: _____________________  
**Date**: _____________________  
**Time Spent**: _____ hours  
**Ready for Deployment**: YES / NO / PARTIAL

**Comments**:
[Space for notes]

---

**Next**: Report results to Phase D team lead for escalation if needed.
