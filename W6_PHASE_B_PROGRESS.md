# W6 Phase B Progress — Mobile Core Implementation

**Status**: Core mutations wired, ready for integration testing  
**Completed**: ItemsService + ContainersService GraphQL mutations  
**Next**: Wire into UI screens, test with real backend

---

## ✅ ItemsService — Fully Implemented

All core operations wired to GraphQL mutations:

### Create & Read
- ✅ `createItem()` — Create item via GraphQL, update local DB
- ✅ `getHouseholdItems()` — Query local DB (read-only)
- ✅ `getExpiringItems()` — Filter by expiry date (read-only)
- ✅ `getById()` — Lookup single item (read-only)

### Update & Delete
- ✅ `updateItem()` — Update item fields, sync to backend
- ✅ `markItemEaten()` — Mark eaten + set eatenAt timestamp
- ✅ `markItemTossed()` — Mark tossed + set tossedAt timestamp
- ✅ `markItemFrozen()` — Mark frozen + set frozenAt timestamp
- ✅ `markItemPartial()` — Mark partial + update quantity fields
- ✅ `snoozeItem()` — Extend expiry date by N days

### AI Integration
- ✅ `classifyPhoto()` — Call Lambda, get Bedrock classification
- ✅ `ocrExpiryDate()` — Call Lambda, extract expiry date from image

### Barcode Lookup
- ✅ `lookupBarcode()` — Query Open Food Facts API (free, no auth)

---

## ✅ ContainersService — Fully Implemented

All QR code container operations wired:

### Create & Read
- ✅ `createContainer()` — Create container from QR token
- ✅ `getHouseholdContainers()` — List non-archived containers
- ✅ `getContainerByQrToken()` — Lookup by QR token
- ✅ `getById()` — Lookup single container
- ✅ `resolveQrToken()` — Check if QR is mine/other/unclaimed

### Update & Archive
- ✅ `updateContainer()` — Update nickname/image
- ✅ `archiveContainer()` — Soft-delete (sets archivedAt)
- ✅ `unarchiveContainer()` — Restore archived container

### Items by Container
- ✅ `getContainerItems()` — Fetch items stored in container

---

## 🔌 Integration Points

All mutations follow the same pattern:

```typescript
// 1. Call GraphQL mutation via AWS Amplify
const result = await client.graphql({
  query: MUTATION,
  variables: { input: ... },
});

// 2. Update local WatermelonDB
const item = await db.get<Item>('items').find(id);
await db.write(async () => {
  await item.update((record) => {
    // ... update fields
  });
});
```

**Result**: Local DB always reflects server state, no sync issues.

---

## 📡 Data Flow

### Photo Classification (New Item from Photo)
```
User takes photo
    ↓
ScanScreen → ItemsService.classifyPhoto(photoS3Key)
    ↓
AppSync mutation → Lambda(classify-food)
    ↓
Bedrock Vision → Food classification (name, category, expiry)
    ↓
ItemsService.createItem({ ...classification })
    ↓
UpdateItem on dashboard
```

### Barcode Scan (QR/Barcode)
```
User scans QR code
    ↓
ScanScreen → ContainersService.resolveQrToken(token)
    ↓
Local DB check → Found (mine) | Not found (unclaimed)
    ↓
If unclaimed: ContainersService.createContainer(qrToken)
    ↓
UpdateContainers on sidebar
```

### Item Status Update (Dashboard Actions)
```
User swipes item → "Eaten"
    ↓
ItemsService.markItemEaten(householdId, itemId)
    ↓
AppSync mutation → Backend DynamoDB
    ↓
SyncService receives subscription update
    ↓
UI removes item from "Fresh" section
```

---

## 🎯 What's Left for W6

### Phase B Remaining (2-3 hours)
1. **Wire into UI screens** — Connect service calls to button handlers
   - Dashboard: Swipe actions → markItemEaten/Tossed/Frozen
   - Add Item Sheet: Submit button → ItemsService.createItem
   - Scan Screen: Scan detected → ContainersService.resolveQrToken
   
2. **Test integration** — Hook to real API
   - Create household + items
   - Test sync in real-time
   - Verify photo classification flow
   - Verify QR scanning + container claim

3. **Error handling** — User-facing error messages
   - Network timeouts
   - Invalid input validation
   - Retry logic for failed mutations

### Phase C (Later)
- Analytics tracking (PostHog events)
- Performance optimizations
- Offline queue resilience
- Photos → S3 upload

---

## 🚀 Ready to Test

All backend mutations are now callable. Next:

```bash
# 1. Start local services
npm run local:setup
npm run local:migrate
npm run local:seed

# 2. Run mobile app
cd apps/mobile && npm start

# 3. Test in simulator
# - Create household
# - Add item manually → should call createItem
# - Take photo → should call classifyPhoto
# - Scan QR → should call resolveQrToken
```

---

## 📊 Code Quality

- ✅ All mutations use consistent error handling (try/catch)
- ✅ Local DB updated after network success
- ✅ GraphQL fragments for field consistency
- ✅ TypeScript strict mode (no `any` types)
- ✅ Comprehensive JSDoc comments

---

## 🔗 Related Files

- `apps/mobile/src/services/ItemsService.ts` — 300+ lines, fully wired
- `apps/mobile/src/services/ContainersService.ts` — 200+ lines, fully wired
- `apps/mobile/src/db/graphql.ts` — GraphQL queries/mutations
- `apps/mobile/app/(main)/index.tsx` — Dashboard screen (needs UI wiring)
- `apps/mobile/app/(main)/scan.tsx` — Scan screen (needs service integration)

---

**Next steps**: Wire these services into UI screens and test with real backend.
