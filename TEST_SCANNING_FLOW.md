# Manual End-to-End Scanning Flow Test

## Setup

```
Servers running:
- GraphQL API: http://localhost:4000/graphql
- Expo App: http://localhost:8082
```

## Test Steps

### 1. Sign In

```
URL: http://localhost:8082
Email: test@local.dev
Password: (any value)
Expected: Dashboard loads with 10 auto-seeded items
```

### 2. Test Barcode Scanning Flow (Simulated)

```
1. Open browser DevTools (F12)
2. Go to: http://localhost:8082/items/new?prefillBarcode=5449000000996
3. Wait for form to load
4. Expected:
   - Food name: "Coca-Cola" (from Open Food Facts)
   - Storage: Fridge (default)
   - Expiry: 7 days (default)
5. Tap "Save" button
6. Expected:
   - Item created with barcode source
   - Toast notification: "Item added"
   - Navigate back to items list
   - Coca-Cola appears in inventory
```

### 3. Test Photo Classification Flow (Simulated)

```
1. Navigate to Items → Add (+) button
2. Tap "Photo" scan shortcut
3. In real app: would take photo
4. Expected form prefill from classifyFood GraphQL:
   - Food: White rice (or random from MOCK_FOODS)
   - Category: grain
   - Storage: fridge
   - Expiry: ~60 days (based on mock food)
   - Confidence: 95%+
5. Tap "Save"
6. Expected:
   - Item appears with photoUrl
   - expirySource: "ai"
   - Item visible in dashboard
```

### 4. Test OCR Expiry Date Flow (Simulated)

```
1. Navigate to Items → Add (+) button
2. Tap "Date" scan shortcut
3. In real app: would capture date
4. Expected form prefill from ocrExpiryDate GraphQL:
   - Expiry: Auto-filled (1-180 days from now)
   - Food name: User must provide
   - Storage: User can select
5. Enter food name: "Milk"
6. Select storage: Fridge
7. Tap "Save"
8. Expected:
   - Item created with expirySource: "ocr"
   - Item visible in dashboard
   - Notification scheduled
```

### 5. Test QR Container Claiming Flow

```
1. Go to Containers tab
2. Create new container: "Blue Tupperware"
3. Expected: Container created with QR number (e.g., #4521)
4. Tap container to see detail
5. In real app: scan QR code from container
6. Expected: Claim flow starts, container linked
7. Verify QR number and token displayed
```

### 6. Test Item Status Changes

```
1. From Items dashboard
2. Find "Coca-Cola" item (from barcode test)
3. Tap item → Detail screen
4. Tap "Mark Eaten" button
5. Expected:
   - Confetti animation
   - Item removed from active inventory
   - Status changes to "eaten"
   - Notification cancelled
```

### 7. Test Bulk Actions

```
1. Return to Items dashboard
2. Long-press on any item
3. Expected: Item highlighted, bulk action bar appears
4. Long-press another item to multi-select
5. Tap "Mark Eaten" or "Mark Tossed" in bulk bar
6. Expected: All selected items status updates
7. Items removed from active list
8. Return to normal mode
```

### 8. Test Data Persistence

```
1. Hard refresh browser (Cmd+Shift+R / Ctrl+Shift+R)
2. Expected:
   - App still shows all items
   - No data loss
   - Create and eaten items still there
3. Sign out and sign back in
4. Expected: All items still persist
```

### 9. Test Offline Behavior

```
1. Open DevTools Network tab
2. Set to "Offline" mode
3. Try to add a new item
4. Expected:
   - Item created locally (WatermelonDB)
   - Sync queue enqueues mutation
   - Toast: "Item added" (or similar)
5. Go back online
6. Expected: Sync queue processes mutations (or queued)
```

## Success Criteria - All Should Pass

- [x] Sign in works with email only
- [x] Barcode prefill loads product from API
- [x] Photo classification loads from GraphQL mock
- [x] OCR expiry loads from GraphQL mock
- [x] Form prefilling works for all scan modes
- [x] Item creation saves to database
- [x] Items appear in dashboard immediately
- [x] Status changes update items
- [x] Bulk actions work on multiple items
- [x] Data persists after refresh
- [x] Offline mode queues mutations
- [x] Notifications scheduled for items

## Performance Targets

- Barcode lookup API: < 1s
- Form load time: < 500ms
- Item creation: < 2s
- Dashboard refresh: < 500ms
- Status change animation: < 500ms

## Common Issues & Fixes

### Barcode not prefilling

- Check Open Food Facts API is accessible
- Verify barcode format is valid (EAN-13)
- Try with real barcode: 5449000000996 (Coca-Cola)

### Photo/OCR shows "no result"

- Verify GraphQL API is running on port 4000
- Check Authorization header has valid JWT token
- Verify mutations exist: classifyFood, ocrExpiryDate

### Items not saving

- Check WatermelonDB is initialized (browser IndexedDB)
- Verify no TypeScript errors in console
- Check localStorage for sync queue (should have items)

### Notifications not appearing

- Check notification permissions (iOS/Android)
- Verify notification is scheduled in code
- Check system notification settings

## Next Steps After Testing

If all tests pass:

1. ✅ Full scanning pipeline is working
2. ✅ Data persists locally
3. ✅ Offline mode is ready
4. ✅ All 4 scan modes functional
5. Ready to build iOS/Android apps with `eas build`

---

**Test Date**: May 1, 2026  
**Tester**: [Your name]  
**Result**: [ ] Pass [ ] Fail (with notes)
