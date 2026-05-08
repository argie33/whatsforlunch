import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ScrollView, View, Pressable, FlatList, TextInput } from 'react-native';
import { Text, YStack, XStack } from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';

import { useAuthIds } from '@/features/auth';
import { useDatabase } from '@/db';
import type { Item } from '@/db/models/Item';
import { ItemRepository } from '@/db/repositories/ItemRepository';
import { lightTheme } from '@/theme/tokens';
import { R } from '@/theme/tokens';
import { SearchBar } from '@/components/ui/SearchBar';
import { FAB } from '@/components/ui/FAB';
import { Chip } from '@/components/ui/Chip';
import { ItemCard } from '@/components/ui/ItemCard';
import { getItemStatus } from '@/lib/itemUtils';

const C = lightTheme;

type FilterType = 'all' | 'urgent' | 'fridge' | 'freezer' | 'pantry' | 'counter';

const FILTERS: { key: FilterType; label: string; icon?: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'urgent', label: 'Urgent', icon: '🔥' },
  { key: 'fridge', label: 'Fridge', icon: '🧊' },
  { key: 'freezer', label: 'Freezer', icon: '❄️' },
  { key: 'pantry', label: 'Pantry', icon: '🥫' },
  { key: 'counter', label: 'Counter', icon: '🍞' },
];

const FOOD_EMOJI: Record<string, string> = {
  vegetable: '🥬',
  fruit: '🍎',
  dairy: '🥛',
  meat: '🥩',
  seafood: '🐟',
  bakery: '🍞',
  pantry: '🥫',
  beverage: '🥤',
  frozen: '❄️',
};

export default function ItemsListScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const db = useDatabase();
  const { householdId } = useAuthIds();
  const [items, setItems] = useState<Item[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');
  const [search, setSearch] = useState('');
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!householdId) return;
    const repo = new ItemRepository(db);
    const sub = repo.observeByHousehold(householdId).subscribe({
      next: (fetchedItems) => {
        setItems(fetchedItems.filter((item) => item.status === 'active'));
      },
    });
    return () => sub.unsubscribe();
  }, [db, householdId]);

  // Memoized emoji map
  const emojiMap = useMemo(
    () => ({
      vegetable: '🥬',
      fruit: '🍎',
      dairy: '🥛',
      meat: '🥩',
      seafood: '🐟',
      bakery: '🍞',
      pantry: '🥫',
      beverage: '🥤',
      frozen: '❄️',
    }),
    [],
  );

  const getEmoji = useCallback(
    (category?: string) => emojiMap[category as keyof typeof emojiMap] || '🍴',
    [emojiMap],
  );

  const getDaysLeft = useCallback((expiryAt?: number) => {
    if (!expiryAt) return null;
    return Math.floor((expiryAt - Date.now()) / (1000 * 60 * 60 * 24));
  }, []);

  // Memoized filtered and sorted items
  const sortedItems = useMemo(() => {
    const filtered = items.filter((item) => {
      if (search && !item.foodName.toLowerCase().includes(search.toLowerCase())) return false;
      if (filter === 'all') return true;
      if (filter === 'urgent') return getItemStatus(item) === 'urgent';
      return item.storageLocation === filter;
    });

    return [...filtered].sort((a, b) => {
      if (!a.expiryAt) return 1;
      if (!b.expiryAt) return -1;
      return a.expiryAt - b.expiryAt;
    });
  }, [items, search, filter]);

  const toggleItemSelect = (itemId: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  const handleBulkAction = (action: 'eaten' | 'tossed') => {
    // TODO: Implement bulk action (update items in DB)
    setSelectedItems(new Set());
    setBulkMode(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: C['surface/base'] }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 8,
          paddingBottom: insets.bottom + 100,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* === Header === */}
        <View style={{ paddingHorizontal: 22, paddingVertical: 14 }}>
          <XStack justifyContent="space-between" alignItems="flex-start">
            <YStack flex={1}>
              <Text fontSize={12} fontWeight="600" color={C['text/secondary']} letterSpacing={0.3}>
                {items.length} items
              </Text>
              <Text
                fontSize={28}
                fontWeight="800"
                color={C['text/primary']}
                letterSpacing={-0.8}
                marginTop={2}
                fontFamily="Fraunces"
              >
                Inventory
              </Text>
            </YStack>
            <XStack gap={8}>
              <Pressable
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: C['surface/raised'],
                  borderWidth: 1,
                  borderColor: C['border/subtle'],
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
                accessible
                accessibilityRole="button"
                accessibilityLabel="Sort items"
                accessibilityHint="Change the order of items by expiry date or name"
              >
                <Text fontSize={18}>⇅</Text>
              </Pressable>
              <Pressable
                onPress={() => router.push('/search' as any)}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: C['surface/raised'],
                  borderWidth: 1,
                  borderColor: C['border/subtle'],
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
                accessible
                accessibilityRole="button"
                accessibilityLabel="Advanced search"
                accessibilityHint="Open search with more filtering options"
              >
                <Text fontSize={18}>🔍</Text>
              </Pressable>
            </XStack>
          </XStack>
        </View>

        {/* === Search Bar === */}
        <SearchBar
          placeholder="Search 'milk', 'leftover'..."
          value={search}
          onChangeText={setSearch}
          onClear={() => setSearch('')}
        />

        {/* === Bulk Select Button === */}
        {!bulkMode && (
          <View
            style={{
              paddingHorizontal: 22,
              marginBottom: 12,
              flexDirection: 'row',
              justifyContent: 'flex-end',
            }}
          >
            <Pressable
              onPress={() => setBulkMode(true)}
              style={{
                paddingHorizontal: 10,
                paddingVertical: 6,
              }}
              accessible
              accessibilityRole="button"
              accessibilityLabel="Bulk select items"
              accessibilityHint="Activate selection mode to perform actions on multiple items"
            >
              <Text fontSize={13} fontWeight="700" color={C['brand/primary']}>
                ⋮ Select
              </Text>
            </Pressable>
          </View>
        )}

        {/* === Filter Chips === */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 22, gap: 8 }}
          style={{ marginBottom: 16 }}
          accessible
          accessibilityRole="radiogroup"
          accessibilityLabel="Filter items by status or location"
        >
          {FILTERS.map((f) => (
            <Chip
              key={f.key}
              label={f.label}
              icon={f.icon}
              active={filter === f.key}
              onPress={() => setFilter(f.key)}
            />
          ))}
        </ScrollView>

        {/* === Items List === */}
        <View style={{ paddingHorizontal: 22 }}>
          {sortedItems.length === 0 ? (
            <View
              style={{
                backgroundColor: C['surface/raised'],
                borderRadius: 20,
                padding: 32,
                borderWidth: 1,
                borderColor: C['border/subtle'],
                alignItems: 'center',
              }}
            >
              <Text fontSize={48} marginBottom={12}>
                📦
              </Text>
              <Text fontSize={16} fontWeight="700" color={C['text/primary']} marginBottom={4}>
                No items yet
              </Text>
              <Text fontSize={13} color={C['text/secondary']} textAlign="center">
                Tap + to add your first item
              </Text>
            </View>
          ) : (
            sortedItems.map((item) => {
              const status = getItemStatus(item);
              const daysLeft = item.expiryAt
                ? Math.floor((item.expiryAt - Date.now()) / (1000 * 60 * 60 * 24))
                : null;
              const emoji = getEmoji(item.category);

              const isSelected = selectedItems.has(item.id);
              const stripeColor =
                status === 'fresh'
                  ? C['status/fresh']
                  : status === 'soon'
                    ? C['status/soon']
                    : status === 'urgent'
                      ? C['status/urgent']
                      : C['status/expired'];

              return (
                <Pressable
                  key={item.id}
                  onPress={() => {
                    if (bulkMode) {
                      toggleItemSelect(item.id);
                    } else {
                      router.push(`/items/${item.id}` as any);
                    }
                  }}
                  style={{
                    backgroundColor: isSelected ? C['brand/soft'] : C['surface/raised'],
                    borderRadius: 20,
                    overflow: 'hidden',
                    borderWidth: 1,
                    borderColor: isSelected ? C['brand/primary'] : C['border/subtle'],
                    marginBottom: 10,
                    flexDirection: 'row',
                    alignItems: 'center',
                    shadowColor: C['text/primary'],
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.04,
                    shadowRadius: 4,
                    elevation: 1,
                  }}
                >
                  {/* Colored stripe with gradient */}
                  <View
                    style={{
                      width: 4,
                      height: '100%',
                      backgroundColor: stripeColor,
                      flexShrink: 0,
                    }}
                  />
                  <View
                    style={{
                      flex: 1,
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingHorizontal: 16,
                      paddingVertical: 14,
                      gap: 14,
                    }}
                  >
                    {bulkMode && (
                      <View
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: 4,
                          borderWidth: 2,
                          borderColor: isSelected ? C['brand/primary'] : C['border/subtle'],
                          backgroundColor: isSelected ? C['brand/primary'] : 'transparent',
                          justifyContent: 'center',
                          alignItems: 'center',
                          flexShrink: 0,
                        }}
                      >
                        {isSelected && (
                          <Text color="white" fontSize={12}>
                            ✓
                          </Text>
                        )}
                      </View>
                    )}
                    <View
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: 12,
                        backgroundColor: C['surface/sunken'],
                        justifyContent: 'center',
                        alignItems: 'center',
                        flexShrink: 0,
                        shadowColor: 'rgba(0,0,0,0.04)',
                        shadowOffset: { width: 0, height: 0 },
                        shadowOpacity: 1,
                        shadowRadius: 1,
                        elevation: 0.5,
                      }}
                    >
                      <Text fontSize={28}>{emoji}</Text>
                    </View>
                    <YStack flex={1} minWidth={0}>
                      <Text
                        fontSize={17}
                        fontWeight="700"
                        color={C['text/primary']}
                        letterSpacing={-0.2}
                      >
                        {item.foodName}
                      </Text>
                      <XStack gap={6} alignItems="center" marginTop={3}>
                        <Text fontSize={13} color={C['text/secondary']}>
                          {item.storageLocation}
                        </Text>
                        <Text fontSize={13} color={C['text/tertiary']}>
                          ·
                        </Text>
                        <Text fontSize={13} color={C['text/secondary']}>
                          Added today
                        </Text>
                      </XStack>
                    </YStack>
                    <Text fontSize={16} color={C['text/tertiary']}>
                      ›
                    </Text>
                  </View>
                </Pressable>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* === Bulk Action Bar === */}
      {bulkMode && selectedItems.size > 0 && (
        <View
          style={{
            position: 'absolute',
            bottom: insets.bottom + 90,
            left: 16,
            right: 16,
            backgroundColor: C['text/primary'],
            borderRadius: 20,
            padding: 14,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            shadowColor: C['text/primary'],
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.2,
            shadowRadius: 16,
            elevation: 8,
          }}
        >
          <Text fontSize={14} fontWeight="700" color="white">
            {selectedItems.size} selected
          </Text>
          <View style={{ flex: 1 }} />
          <Pressable
            onPress={() => handleBulkAction('eaten')}
            style={{
              backgroundColor: C['status/fresh'],
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: R.xs,
            }}
          >
            <Text fontSize={12} fontWeight="600" color="white">
              ✓ Eaten
            </Text>
          </Pressable>
          <Pressable
            onPress={() => handleBulkAction('tossed')}
            style={{
              backgroundColor: C['status/urgent'],
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: R.xs,
            }}
          >
            <Text fontSize={12} fontWeight="600" color="white">
              🗑 Toss
            </Text>
          </Pressable>
          <Pressable
            onPress={() => {
              setBulkMode(false);
              setSelectedItems(new Set());
            }}
            style={{
              backgroundColor: 'rgba(255,255,255,0.15)',
              width: 32,
              height: 32,
              borderRadius: R.xs,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Text fontSize={14} color="white">
              ✕
            </Text>
          </Pressable>
        </View>
      )}

      {/* === FAB === */}
      {!bulkMode && (
        <FAB
          icon="+"
          position="bottom-right"
          size="md"
          onPress={() => router.push('/items/new' as any)}
        />
      )}
    </View>
  );
}
