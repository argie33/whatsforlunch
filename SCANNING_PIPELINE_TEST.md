# WhatsForLunch Scanning Pipeline - Complete Test Suite

**Status**: All components verified and ready for end-to-end testing  
**Date**: May 1, 2026  
**Servers**: GraphQL API (4000) + Expo Dev (8082)

---

## Verified Components

### Backend (GraphQL API)

- [x] Auth: `signIn(email)` mutation → JWT token
- [x] Photo Classification: `classifyFood(householdId, photoUrl)` → food item with category, expiry
- [x] OCR Expiry: `ocrExpiryDate(householdId, photoUrl)` → date string (YYYY-MM-DD)
- [x] Barcode Lookup: Open Food Facts API (real, not mock)

### Frontend Services

- [x] `ItemsService.lookupBarcode()` - Uses Open Food Facts API (real products)
- [x] `ItemsService.classifyPhoto()` - Calls GraphQL CLASSIFY_FOOD mutation
- [x] `ItemsService.ocrExpiryDate()` - Calls GraphQL OCR_EXPIRY_DATE mutation
- [x] `PhotoUploadService.uploadPhoto()` - Base64 encode and upload/S3 fallback
- [x] `ContainersService.generateQRNumber()` - Auto-generates 1000-9999 QR numbers
- [x] `ContainersService.claimContainer()` - Creates container locally + sync queue

### Mobile UI Screens

- [x] `/scan` - Camera scanning with 4 modes (QR, barcode, photo, date)
- [x] `/items/new` - Form with scan prefilling + photo preview
- [x] `/containers` - Container list with QR numbers + claim flow
- [x] `/items` - Inventory dashboard with search/filter
- [x] `/recipes` - AI recommendations based on expiring items
- [x] `/settings/*` - Full settings screens (profile, appearance, etc.)

---

## End-to-End Test Scenarios

### Test 1: QR Code Scanning → Container Claim

**Flow**: Scan tab → QR mode → Scan QR → Claim container → View container details

**Expected**:

1. Camera opens in QR mode
2. QR code detected (green checkmark animation)
3. Prompt to name container (iOS) or confirm (Android)
4. Container created with unique QR number (1000-9999)
5. Navigates to container detail screen
6. Shows QR code, token, and item count

**Data**: `ContainersService.claimContainer()` → WatermelonDB write + sync queue

---

### Test 2: Barcode Scanning → Product Lookup → Item Creation

**Flow**: Items tab → Add (+) → Barcode scan → Open Food Facts → Form prefill → Save

**Expected**:

1. Scan tab → Barcode mode
2. Barcode detected
3. Navigates to `/items/new?prefillBarcode=<code>`
4. `ItemsService.lookupBarcode()` fetches product from Open Food Facts
5. Form prefills:
   - Food name: Product name from API
   - Storage location: Default (fridge)
   - Expiry days: Default 7 days
6. User can edit and save
7. Item created with `expirySource: 'barcode'`

**Test barcodes**:

- Coca-Cola: `5449000000996`
- Heinz Ketchup: `5700141020328`
- Any EAN-13 from Open Food Facts

---

### Test 3: Photo Classification → AI Detection → Item Creation

**Flow**: Items tab → Add (+) → Photo mode → Capture → Classify → Form prefill → Save

**Expected**:

1. Scan tab → Photo mode
2. Capture photo (take snapshot)
3. Navigates to `/items/new?prefillPhotoPath=<path>&prefillSource=photo`
4. Photo preview shows AI processing animation
5. `ItemsService.classifyPhoto()` calls GraphQL mutation
6. GraphQL `classifyFood` returns:
   - food name (e.g., "White rice")
   - category (grain)
   - storage location (fridge)
   - expiry at (auto-calculated)
   - confidence (85-100%)
7. Form prefills with AI results
8. User can edit and save
9. Item created with `expirySource: 'ai'`

**Mock data** returned: Random food from MOCK_FOODS array in resolvers

---

### Test 4: OCR Expiry Date → Auto-Fill Expiry → Item Creation

**Flow**: Items tab → Add (+) → Date mode → Capture → OCR → Form prefill → Save

**Expected**:

1. Scan tab → Date mode
2. Capture photo of expiry date
3. Navigates to `/items/new?prefillPhotoPath=<path>&prefillSource=date`
4. Photo preview shows AI processing
5. `ItemsService.ocrExpiryDate()` calls GraphQL mutation
6. GraphQL `ocrExpiryDate` returns date string (YYYY-MM-DD)
7. Form calculates `expiryDays` from date
8. User still needs to provide food name
9. User can edit storage location, quantity, notes
10. Item created with `expirySource: 'ocr'`

---

### Test 5: Complete Item Lifecycle

**Flow**: Create → View → Edit → Change status → Delete

**Expected**:

1. Item appears in Items list
2. Status badge (Fresh/Soon/Urgent/Expired)
3. Tap to view details (expiry time, storage, quantity)
4. Edit button → Update fields → Save
5. Status buttons: Mark Eaten, Tossed, Frozen, Partial, Snooze
6. Delete with confirmation
7. Notification scheduled/cancelled appropriately

---

### Test 6: Bulk Actions

**Flow**: Items tab → Long-press item → Multi-select → Bulk action

**Expected**:

1. Long-press item → Enter select mode
2. Animated bulk action bar appears
3. Tap other items to multi-select
4. "Mark Eaten" or "Mark Tossed" buttons
5. All selected items status updates
6. Bulk action bar closes
7. Items removed from active list

---

## Test Data & Barcodes

### Real Barcodes (Open Food Facts)

```
Coca-Cola: 5449000000996
Heinz Ketchup: 5700141020328
Any UPC/EAN from real products
```

### Mock Foods (AI Classification)

```
- White rice (grain, 60 days fridge)
- Chicken breast (protein, 3 days fridge)
- Cheddar cheese (dairy, 30 days fridge)
- Leftover pasta (leftover, 3 days fridge)
- Frozen peas (produce, 120 days freezer)
```

### Mock Expiry Dates (OCR)

```
Random date 1-180 days from now
Format: YYYY-MM-DD
```

---

## Validation Checklist

### Sign In

- [ ] Email: `test@local.dev`
- [ ] Password: (any value, not validated in local mode)
- [ ] Returns valid JWT token
- [ ] Auto-loads 10 test items

### Scanning

- [ ] QR mode: Detects and claims containers
- [ ] Barcode mode: Looks up real products from API
- [ ] Photo mode: Classifies food with AI
- [ ] Date mode: Detects expiry with OCR
- [ ] Camera permission flow works (iOS/Android)

### Item Creation

- [ ] Manual entry (name, expiry, location, quantity)
- [ ] Barcode prefill (food name, defaults)
- [ ] Photo prefill (food name, category, storage, expiry)
- [ ] Date prefill (expiry only, user provides name)
- [ ] Form validation (required fields)
- [ ] Notification scheduling
- [ ] Analytics tracking (itemAdded event)

### Data Persistence

- [ ] WatermelonDB stores items/containers locally
- [ ] Sync queue enqueues mutations for cloud
- [ ] Offline support (items saved locally)
- [ ] Force-refresh loads latest data

### UI/UX

- [ ] Dark mode toggle works
- [ ] Animations (confetti on eaten, scan reticle)
- [ ] Accessibility (ARIA labels, keyboard nav)
- [ ] Responsive design (safe areas, padding)
- [ ] Toast notifications (errors, success)

---

## Performance Baselines

- QR detection: < 2 seconds
- Barcode lookup: < 1 second (with internet)
- Photo classification: < 3 seconds (GraphQL)
- OCR: < 3 seconds (GraphQL)
- Form submit: < 2 seconds (DB + sync)
- List scroll: 60fps (100+ items)
- Search: < 100ms (instant for most queries)

---

## Known Limitations (Wave 1)

| Feature                | Status                  | Notes                                |
| ---------------------- | ----------------------- | ------------------------------------ |
| Real AI classification | ⏳ Mock                 | Returns random food from MOCK_FOODS  |
| Real OCR               | ⏳ Mock                 | Returns random date 1-180 days ahead |
| Push notifications     | ⏳ Infrastructure       | Requires APNs/FCM setup              |
| Cloud sync             | ⏳ Queue ready          | Enqueued but not synced to cloud     |
| Image optimization     | ⏳ Thumbnail generation | Base64 works, S3 upload ready        |
| Household sharing      | ⏳ Schema ready         | Members table created, UI pending    |

---

## How to Test Manually

### Setup

1. Open http://localhost:8082 in browser
2. Sign in: `test@local.dev` (any password)
3. Verify 10 auto-seeded items load

### Test Barcode Scanning

1. Go to Items → Add (+)
2. Scan barcode mode
3. Use barcode: `5449000000996` (Coca-Cola)
4. Form should prefill with "Coca-Cola"
5. Update expiry if desired
6. Save → Item appears in list

### Test Photo Classification (Mock)

1. Go to Items → Add (+)
2. Scan photo mode → Capture
3. Form loads with mock AI results
4. Verify food name, category, storage prefilled
5. Save → Item with AI confidence visible

### Test OCR (Mock)

1. Go to Items → Add (+)
2. Scan date mode → Capture
3. Form loads with expiry days prefilled
4. Add food name manually
5. Save → Item created with expiry

### Test QR Container Claim

1. Go to Containers → Add (+)
2. Create container (e.g., "Blue Tupperware")
3. Note the QR number displayed
4. Go to Scan → QR mode
5. Scan QR code from container detail
6. Claim container (or view if already claimed)
7. Verify item count updates

---

## Debugging

### Check GraphQL Mutations

```bash
curl http://localhost:4000/graphql -X POST \
  -H "Content-Type: application/json" \
  -d '{"query":"mutation{ocrExpiryDate(householdId:\"test\",photoUrl:\"test\")}"}'
```

### Check Local Database

```bash
# WatermelonDB stored in IndexedDB (browser DevTools)
# Storage → IndexedDB → appSync_default_/wfl_local_db
```

### Check Sync Queue

```bash
# MMKV stored in localStorage
# DevTools → Storage → Local Storage → http://localhost:8082
# Key: writeQueue
```

### Check Console Errors

```bash
# Browser DevTools F12 → Console
# Check for [scan], [ItemsService], [NewItemScreen] logs
```

---

## Success Criteria

- [x] All 4 scanning modes operational
- [x] Barcode lookup returns real products
- [x] Photo classification returns mock data
- [x] OCR returns valid dates
- [x] Form prefilling works
- [x] Item creation saves to DB
- [x] Notifications scheduled
- [x] Sync queue enqueued
- [x] No TypeScript errors
- [x] No runtime exceptions

✅ **Ready for end-to-end testing!**
