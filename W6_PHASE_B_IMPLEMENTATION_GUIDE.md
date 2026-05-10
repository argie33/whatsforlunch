# W6 Phase B — Dashboard Implementation Guide

**Quick Start**: Build dashboard using W5 component library + existing utilities

---

## Step 1: Dashboard Structure (index.tsx)

Your dashboard already has the shell. Add the following:

```typescript
// apps/mobile/app/(main)/index.tsx

import { useEffect, useMemo } from 'react';
import { FlashList } from '@shopify/flash-list';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { YStack, Text, XStack, Pressable, View } from 'tamagui';

import { useDatabase } from '@/db';
import { ItemRepository } from '@/db/repositories/ItemRepository';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ListRow } from '@/components/ui/ListRow';
import { Button } from '@/components/ui/Button';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { groupItemsIntoSections, getItemStatus, formatTimeLeft } from '@/lib/itemUtils';
import type { Item } from '@/db/models/Item';

const PLACEHOLDER_HOUSEHOLD = 'household_placeholder';

export default function DashboardScreen() {
  const { t } = useTranslation();
  const db = useDatabase();
  const insets = useSafeAreaInsets();

  const [allItems, setAllItems] = useState<Item[]>([]);
  const [storageFilter, setStorageFilter] = useState<string>('all');

  // Subscribe to item updates
  useEffect(() => {
    const repo = new ItemRepository(db);
    const subscription = repo
      .observeByStatus(PLACEHOLDER_HOUSEHOLD, 'active')
      .subscribe((items) => {
        // Filter by storage location if needed
        const filtered =
          storageFilter === 'all'
            ? items
            : items.filter((i) => i.storageLocation === storageFilter);
        setAllItems(filtered);
      });
    
    return () => subscription.unsubscribe();
  }, [db, storageFilter]);

  // Group items into sections
  const sections = useMemo(
    () => groupItemsIntoSections(allItems),
    [allItems]
  );

  // Flatten for list rendering
  const listData = useMemo(() => {
    const rows: Array<{ type: 'section'; key: string; labelKey: string; count: number } | { type: 'item'; item: Item }> = [];
    
    for (const section of sections) {
      rows.push({
        type: 'section',
        key: section.key,
        labelKey: section.labelKey,
        count: section.items.length,
      });
      
      for (const item of section.items) {
        rows.push({ type: 'item', item });
      }
    }
    
    return rows;
  }, [sections]);

  return (
    <View flex={1} backgroundColor="$surface/base">
      {/* Header */}
      <YStack
        paddingTop={insets.top + 8}
        paddingHorizontal="$5"
        paddingBottom="$3"
        backgroundColor="$surface/raised"
        borderBottomWidth={1}
        borderBottomColor="$border/subtle"
      >
        <Text fontSize={28} fontWeight="700" color="$text/primary">
          {t('dashboard.title')}
        </Text>
        <Text fontSize={14} color="$text/secondary" marginTop="$1">
          {t('dashboard.subtitle', { count: allItems.length })}
        </Text>

        {/* Storage filter */}
        <XStack gap="$2" marginTop="$3">
          <SegmentedControl
            segments={[
              { label: t('dashboard.filterAll'), value: 'all' },
              { label: t('dashboard.filterFridge'), value: 'fridge' },
              { label: t('dashboard.filterFreezer'), value: 'freezer' },
              { label: t('dashboard.filterPantry'), value: 'pantry' },
            ]}
            value={storageFilter}
            onValueChange={setStorageFilter}
          />
        </XStack>
      </YStack>

      {/* Item list */}
      {listData.length === 0 ? (
        <EmptyState
          title={t('empty.dashboard.title')}
          description={t('empty.dashboard.description')}
          primaryAction={{
            label: t('dashboard.fabManual'),
            onPress: () => {/* Open add item sheet */},
          }}
        />
      ) : (
        <FlashList
          data={listData}
          estimatedItemSize={68}
          renderItem={({ item: row }) => {
            if (row.type === 'section') {
              return (
                <XStack
                  paddingHorizontal="$5"
                  paddingTop="$4"
                  paddingBottom="$2"
                  alignItems="center"
                  gap="$2"
                >
                  <Text fontSize={12} fontWeight="700" color="$text/tertiary" textTransform="uppercase">
                    {t(row.labelKey)}
                  </Text>
                  <Text fontSize={12} color="$text/tertiary">
                    ({row.count})
                  </Text>
                </XStack>
              );
            }

            const item = row.item;
            const status = getItemStatus(item);

            return (
              <ListRow
                title={item.foodName}
                subtitle={`${item.storageLocation} ${item.quantityText ? '• ' + item.quantityText : ''}`}
                trailing={
                  <YStack alignItems="flex-end" gap="$1">
                    <StatusBadge status={status} size="sm" />
                    <Text fontSize={12} color="$text/tertiary">
                      {formatTimeLeft(item.expiryAt)}
                    </Text>
                  </YStack>
                }
                onPress={() => {/* Navigate to item detail */}}
                image={item.photoUrl}
              />
            );
          }}
          keyExtractor={(row) =>
            row.type === 'section' ? `section-${row.key}` : `item-${row.item.id}`
          }
          contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
        />
      )}

      {/* FAB */}
      <Pressable
        onPress={() => {/* Open add item sheet */}}
        style={{
          position: 'absolute',
          bottom: insets.bottom + 16,
          right: 20,
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: '#2F7D5B',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Plus size={24} color="white" strokeWidth={2.5} />
      </Pressable>
    </View>
  );
}
```

---

## Step 2: Item Detail Screen

Create `apps/mobile/app/(main)/items/[id].tsx`:

```typescript
import { useLocalSearchParams } from 'expo-router';
import { useDatabase } from '@/db';
import { ItemRepository } from '@/db/repositories/ItemRepository';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/Button';
import { getItemStatus, formatTimeLeft } from '@/lib/itemUtils';

export default function ItemDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useDatabase();
  const [item, setItem] = useState<Item | null>(null);

  useEffect(() => {
    if (!id) return;
    const repo = new ItemRepository(db);
    const sub = repo.observeById(id).subscribe(setItem);
    return () => sub.unsubscribe();
  }, [db, id]);

  if (!item) return <Text>Loading...</Text>;

  const status = getItemStatus(item);

  return (
    <YStack flex={1} padding="$5" gap="$4">
      {/* Photo */}
      {item.photoUrl && (
        <Image
          source={{ uri: item.photoUrl }}
          width="100%"
          height={300}
          borderRadius="$lg"
        />
      )}

      {/* Food name + status */}
      <YStack gap="$2">
        <Text fontSize={24} fontWeight="700">
          {item.foodName}
        </Text>
        <XStack alignItems="center" gap="$2">
          <StatusBadge status={status} />
          <Text fontSize={14} color="$text/secondary">
            {formatTimeLeft(item.expiryAt)}
          </Text>
        </XStack>
      </YStack>

      {/* Metadata */}
      <YStack gap="$2" borderTopWidth={1} borderTopColor="$border/subtle" paddingTop="$3">
        <ListRow title="Storage" subtitle={item.storageLocation} trailing={null} />
        <ListRow title="Quantity" subtitle={item.quantityText || 'Unknown'} trailing={null} />
        <ListRow title="Expires" subtitle={new Date(item.expiryAt).toLocaleDateString()} trailing={null} />
      </YStack>

      {/* Actions */}
      <XStack gap="$3" marginTop="$4">
        <Button
          flex={1}
          variant="filled"
          onPress={() => {
            repo.update(item, { status: 'eaten', eatenAt: Date.now() });
          }}
        >
          Eaten
        </Button>
        <Button
          flex={1}
          variant="tinted"
          onPress={() => {
            repo.update(item, { status: 'tossed', tossedAt: Date.now() });
          }}
        >
          Tossed
        </Button>
      </XStack>
    </YStack>
  );
}
```

---

## Step 3: Add Item Sheet

Enhance existing `AddItemSheet.tsx`:

```typescript
import { useCallback } from 'react';
import { ItemsService } from '@/services/ItemsService';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { SegmentedControl } from '@/components/ui/SegmentedControl';

export function AddItemSheet({ onAdded }: { onAdded?: () => void }) {
  const [foodName, setFoodName] = useState('');
  const [storageLocation, setStorageLocation] = useState('fridge');
  const [quantity, setQuantity] = useState('');
  const [expiryDays, setExpiryDays] = useState('3');

  const handleAdd = useCallback(async () => {
    const service = new ItemsService();
    
    await service.createItem({
      householdId: PLACEHOLDER_HOUSEHOLD,
      foodName,
      storageLocation: storageLocation as any,
      quantityText: quantity,
      expiryAt: Date.now() + parseInt(expiryDays) * 24 * 60 * 60 * 1000,
      addedByUserId: PLACEHOLDER_USER,
    });

    onAdded?.();
  }, [foodName, storageLocation, quantity, expiryDays, onAdded]);

  return (
    <YStack gap="$4" padding="$5">
      <Input
        label="Food name"
        placeholder="e.g., Cooked chicken"
        value={foodName}
        onChangeText={setFoodName}
      />

      <YStack gap="$2">
        <Text fontWeight="600">Storage</Text>
        <SegmentedControl
          segments={[
            { label: 'Fridge', value: 'fridge' },
            { label: 'Freezer', value: 'freezer' },
            { label: 'Pantry', value: 'pantry' },
          ]}
          value={storageLocation}
          onValueChange={setStorageLocation}
        />
      </YStack>

      <Input
        label="Quantity (optional)"
        placeholder="e.g., 2 servings"
        value={quantity}
        onChangeText={setQuantity}
      />

      <YStack gap="$2">
        <Text fontWeight="600">Expires in (days)</Text>
        <SegmentedControl
          segments={[
            { label: '1d', value: '1' },
            { label: '3d', value: '3' },
            { label: '7d', value: '7' },
            { label: '14d', value: '14' },
          ]}
          value={expiryDays}
          onValueChange={setExpiryDays}
        />
      </YStack>

      <Button variant="filled" onPress={handleAdd}>
        Add item
      </Button>
    </YStack>
  );
}
```

---

## Step 4: ItemRepository Query Methods

Add to `apps/mobile/src/db/repositories/ItemRepository.ts`:

```typescript
// Query all active items in household
observeByStatus(householdId: string, status: 'active' | 'all'): Observable<Item[]> {
  return this.db.get<Item>('items')
    .query(
      Q.where('household_id', Q.eq(householdId)),
      status === 'active' ? Q.where('status', Q.eq('active')) : undefined
    )
    .observeWithColumns(['expiry_at', 'status']);
}

// Get single item by ID
observeById(id: string): Observable<Item> {
  return this.db.get<Item>('items').findAndObserve(id);
}

// Query by container
observeByContainer(containerId: string): Observable<Item[]> {
  return this.db.get<Item>('items')
    .query(Q.where('container_id', Q.eq(containerId)))
    .observeWithColumns(['status']);
}
```

---

## Step 5: Wiring It All Together

1. **Import ItemRepository in dashboard**:
   ```typescript
   import { ItemRepository } from '@/db/repositories/ItemRepository';
   ```

2. **Use the utilities**:
   ```typescript
   import { groupItemsIntoSections, getItemStatus, formatTimeLeft } from '@/lib/itemUtils';
   ```

3. **Component props from W5**:
   - `StatusBadge` for status display
   - `ListRow` for item rows
   - `Button` for actions
   - `SegmentedControl` for filters
   - `EmptyState` for no items

---

## Testing Checklist

- [ ] Dashboard loads without errors
- [ ] Item list renders ≥10 items
- [ ] Filter buttons work (all/fridge/freezer/pantry)
- [ ] Items grouped by status (expired/urgent/soon/fresh/frozen)
- [ ] StatusBadge shows correct color for each status
- [ ] Time left formatted correctly (2d left, 3h left, etc.)
- [ ] Click item → detail screen
- [ ] Mark eaten/tossed updates item
- [ ] Empty state shows when no items
- [ ] FAB opens add item sheet
- [ ] Add item creates in WatermelonDB
- [ ] List auto-updates when item added
- [ ] Scroll smooth at ≥60fps (FlashList)
- [ ] VoiceOver announces items correctly

---

**Status**: Ready to implement  
**Time**: 2-3 days for Phase B dashboard  
**Next**: Scan integration + item detail screens
