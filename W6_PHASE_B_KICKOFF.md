# W6 Phase B — Mobile Core Dashboard & Scan Integration

**Status**: Kickoff  
**Blockers**: None — W5 Phase C complete ✅  
**Target**: Days 22-28  
**Owner**: W6 (Mobile Core)

---

## Phase B Scope

Build the core user-facing features using W5 component library:

### Dashboard Screen (`apps/mobile/app/(main)/index.tsx`)
- [x] Empty state (W5 delivered)
- [ ] Item list with status badges (fresh, soon, urgent, expired, frozen)
- [ ] Filter by storage location (fridge, freezer, pantry, counter)
- [ ] Swipe actions (mark eaten, mark tossed)
- [ ] Search/quick add via FAB (floating action button)
- [ ] Pull-to-refresh (sync trigger for W8)
- [ ] Item expiry countdown
- [ ] Household member indicators (who added this item)

### Scan Flow (`apps/mobile/app/(main)/scan.tsx`)
- [x] Camera permission handling (W5 delivered)
- [x] 4 scan modes: QR, barcode, photo, date (W5 delivered)
- [ ] QR code → container lookup (ContainersService.getContainerByQrToken)
- [ ] Barcode → item lookup (ItemsService.lookupBarcode)
- [ ] Photo → AI classification (call W4 Lambda: classify-food)
- [ ] Date scan → OCR expiry (call W4 Lambda: ocr-expiry-date)
- [ ] Haptic feedback on scan success (W5 delivered)
- [ ] Result preview before save
- [ ] Manual entry fallback

### Item Creation/Edit (`apps/mobile/features/items/AddItemSheet.tsx`)
- [x] Partial implementation exists (W5 created AddItemSheet component)
- [ ] Food name input (autocomplete from food-rules)
- [ ] Category selector
- [ ] Storage location picker
- [ ] Expiry date selector (with smart defaults from food-rules)
- [ ] Quantity input
- [ ] Optional notes
- [ ] Photo attachment
- [ ] Save to WatermelonDB (ItemsService.createItem)

### Item Detail Screen (`apps/mobile/app/(main)/items/[id].tsx`)
- [ ] Food photo + metadata
- [ ] Status badge with countdown
- [ ] Storage location + quantity
- [ ] Expiry date (with days remaining)
- [ ] Quick actions:
  - [ ] Mark eaten (ItemsService.markItemEaten)
  - [ ] Mark tossed (ItemsService.markItemTossed)
  - [ ] Move to freezer (ItemsService.markItemFrozen)
  - [ ] Snooze (ItemsService.snoozeItem)
- [ ] Item history/events
- [ ] Edit button
- [ ] Delete confirmation

---

## W5 Component Library Ready

All 13 components are accessible and performant. Import from `@wfl/mobile`:

```typescript
import {
  Button,
  Card,
  Input,
  ListRow,
  StatusBadge,
  Avatar,
  Icon,
  Sheet,
  Toast,
  Tag,
  IconButton,
  EmptyState,
  SegmentedControl,
} from '@/components/ui';
```

### Key Integration Points

**StatusBadge** for item status:
```typescript
<StatusBadge 
  status={getItemStatus(item)} 
  size="sm" 
/>
```

**ListRow** for item rows:
```typescript
<ListRow
  title={item.foodName}
  subtitle={`${item.storageLocation} • ${item.quantityText}`}
  trailing={<StatusBadge status={status} size="sm" />}
  onPress={() => navigate(`/items/${item.id}`)}
  image={item.photoUrl}
/>
```

**Card** for container cards:
```typescript
<Card 
  variant="interactive"
  status={getContainerStatus(container)}
  onPress={() => navigate(`/containers/${container.id}`)}
>
  {/* Content */}
</Card>
```

**EmptyState** for no items:
```typescript
<EmptyState
  title={t('empty.dashboard.title')}
  description={t('empty.dashboard.description')}
  primaryAction={{
    label: t('dashboard.fabManual'),
    onPress: handleAddItem,
  }}
/>
```

**Sheet** for bottom sheets:
```typescript
<Sheet 
  isOpen={sheetOpen}
  onClose={() => setSheetOpen(false)}
  title="Add Item"
>
  <AddItemSheet />
</Sheet>
```

**SegmentedControl** for filters:
```typescript
<SegmentedControl
  segments={[
    { label: 'All', value: 'all' },
    { label: 'Fridge', value: 'fridge' },
    { label: 'Freezer', value: 'freezer' },
    { label: 'Pantry', value: 'pantry' },
  ]}
  value={storageFilter}
  onValueChange={setStorageFilter}
/>
```

---

## W5 Services Available

### ItemsService (`src/services/ItemsService.ts`)

```typescript
// Queries
getHouseholdItems(householdId: string): Observable<Item[]>
getExpiringItems(householdId: string, daysAhead: number): Observable<Item[]>
getById(id: string): Observable<Item>

// Mutations (Phase B)
createItem(input: ItemCreateInput): Promise<Item>
updateItem(id: string, input: ItemUpdateInput): Promise<Item>
markItemEaten(id: string, eatenAt: number): Promise<void>
markItemTossed(id: string, tossedAt: number): Promise<void>
markItemFrozen(id: string): Promise<void>
markItemPartial(id: string, input: MarkPartialInput): Promise<void>
snoozeItem(id: string, until: number): Promise<void>

// AI Integration (calls W4 Lambda)
classifyPhoto(photoUri: string): Promise<ClassificationResult>
ocrExpiryDate(photoUri: string): Promise<DateExtractionResult>
lookupBarcode(barcode: string): Promise<BarcodeResult>
```

### ContainersService (`src/services/ContainersService.ts`)

```typescript
// Queries
getHouseholdContainers(householdId: string): Observable<Container[]>
getContainerByQrToken(qrToken: string): Observable<Container>
getById(id: string): Observable<Container>
getContainerItems(id: string, limit: number): Observable<Item[]>

// Mutations (Phase B)
createContainer(input: CreateContainerInput): Promise<Container>
updateContainer(id: string, input: UpdateContainerInput): Promise<Container>
archiveContainer(id: string): Promise<void>
unarchiveContainer(id: string): Promise<void>

// QR Resolution
resolveQrToken(qrToken: string): Promise<QrTokenResolution>
```

### HouseholdService (`src/services/HouseholdService.ts`)

```typescript
// Queries
getCurrentHousehold(): Observable<Household>
getHouseholdMembers(householdId: string): Observable<HouseholdMember[]>

// Mutations (Phase B)
inviteMember(email: string): Promise<void>
removeMember(memberId: string): Promise<void>
updateHouseholdName(name: string): Promise<void>
```

---

## Data Flow Example: Dashboard

```
┌─────────────────────────────────────┐
│  DashboardScreen opens              │
├─────────────────────────────────────┤
│ 1. useEffect: ItemsService          │
│    .getHouseholdItems(householdId)  │
│    → subscribe to Observable        │
│                                     │
│ 2. Component renders:               │
│    - Header (item count)            │
│    - SegmentedControl (storage)     │
│    - FlashList (items)              │
│                                     │
│ 3. Item rows use:                   │
│    - ListRow component              │
│    - StatusBadge component          │
│    - Swipe actions (mark eaten)     │
│                                     │
│ 4. SwipeAction handler:             │
│    ItemsService.markItemEaten()     │
│    → updates WatermelonDB           │
│    → triggers component re-render   │
│    → Haptics feedback               │
│                                     │
│ 5. Pull-to-refresh:                 │
│    SyncService.pull() (Phase B)     │
│    → fetches from W2 AppSync        │
└─────────────────────────────────────┘
```

---

## Key Decisions for Phase B

### 1. Item Status Logic

Define `getItemStatus(item)` → `'fresh' | 'soon' | 'urgent' | 'expired' | 'frozen'`

```typescript
function getItemStatus(item: Item): ItemStatus {
  if (item.status === 'frozen') return 'frozen';
  if (item.status !== 'active') return 'expired';
  
  const msUntilExpiry = item.expiryAt - Date.now();
  const daysUntilExpiry = msUntilExpiry / (24 * 60 * 60 * 1000);
  
  if (daysUntilExpiry < 0) return 'expired';
  if (daysUntilExpiry <= 0) return 'urgent';
  if (daysUntilExpiry <= 3) return 'soon';
  return 'fresh';
}
```

### 2. Item Grouping

Group dashboard items by status (expired, urgent, soon, fresh, frozen) with section headers.

### 3. Haptic Feedback

All item interactions trigger haptics:
- Mark eaten: `Haptics.notificationAsync(Success)`
- Mark tossed: `Haptics.notificationAsync(Warning)`
- Add item: `Haptics.impactAsync(Light)`

### 4. Empty State UX

When household has 0 items:
- Show EmptyState component
- Primary CTA: "Add manually"
- Secondary CTA: "Print QR stickers"

When household has items but storage filter returns 0:
- Show "No items in Fridge" message (not full empty state)

### 5. Performance Optimization

Use FlashList with estimated item size ~68pt:

```typescript
<FlashList
  data={listData}
  estimatedItemSize={68}
  renderItem={renderItem}
  keyExtractor={(item) => item.id}
/>
```

---

## Testing Checklist for Phase B

- [ ] Dashboard loads without crashing
- [ ] Item list renders with 10+ items
- [ ] Filter buttons update list correctly
- [ ] Swipe actions (mark eaten/tossed) work
- [ ] FAB opens add item sheet
- [ ] Scan screen captures QR/barcode
- [ ] Item detail shows all metadata
- [ ] Empty state shows when no items
- [ ] Pull-to-refresh triggers sync (W8 placeholder)
- [ ] Haptic feedback on all interactions
- [ ] Navigation between screens works
- [ ] Photos display correctly
- [ ] Status badges show correct colors/icons

---

## Accessibility Testing (Phase B + C)

All W5 components include a11y props. W6 must verify:
- [ ] VoiceOver announces item titles + status badges
- [ ] ListRow announces "swipe right to eat, swipe left to toss"
- [ ] Button labels are action-focused ("Mark eaten" not "Action button")
- [ ] Touch targets are ≥44pt (iOS) / 48dp (Android)
- [ ] All interactive elements have labels
- [ ] Color + icon (never color alone) for status

---

## Integration with W2, W3, W4, W8

### W2 (Backend)
- DynamoDB tables already mirrored in WatermelonDB
- AppSync queries/mutations ready
- Phase B: Implement sync via W8

### W3 (Auth)
- Cognito integration in root layout
- householdId from authenticated user
- Phase B: Wire up after W3 finishes magic link

### W4 (AI/ML)
- Lambda endpoints for classify-food, ocr-expiry-date
- ItemsService stubs ready to call
- Phase B: Integrate photo classification in AddItemSheet

### W8 (Sync)
- WatermelonDB schema ready
- ItemsService saves to local DB
- Phase B: Wire up SyncService pull() on pull-to-refresh

---

## Success Criteria

✅ Phase B complete when:
1. Dashboard renders 50+ items smoothly (≥60fps scroll)
2. All CRUD operations work (create, read, update, mark eaten/tossed)
3. Filter/search narrows items correctly
4. Empty state shows when household has 0 items
5. Scan flow captures QR codes and barcodes
6. Item detail shows all metadata + quick actions
7. Haptic feedback on all interactions
8. VoiceOver/TalkBack navigation works
9. Cold start <3s (measured via Sentry)
10. Screen transitions <300ms

---

## Next Steps

1. **Today**: Review W5 component library + services
2. **Tomorrow**: Start dashboard implementation
3. **Day 24**: Scan flow integration
4. **Day 25**: Item creation/edit
5. **Day 26**: Item detail screen
6. **Day 27**: Accessibility testing
7. **Day 28**: Performance validation + Phase B sign-off

W5 Phase C is complete. W6 Phase B is unblocked. 🚀
