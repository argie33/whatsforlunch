import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ScrollView, View, Pressable, FlatList, TextInput } from 'react-native';
import { Text, YStack, XStack } from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  FadeInUp,
  FadeOutDown,
  type SharedValue,
} from 'react-native-reanimated';
import { haptics } from '@/lib/haptics';

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

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Wrapper component: ItemCard + bulk select checkbox
function ItemCardWithCheckbox({
  item,
  isSelected,
  showCheckbox,
  onPress,
}: {
  item: Item;
  isSelected: boolean;
  showCheckbox: boolean;
  onPress: () => void;
}) {
  const itemStatus = getItemStatus(item);
  // Convert to ItemCard's ItemStatus type (frozen → fresh)
  const status = (itemStatus === 'frozen' ? 'fresh' : itemStatus) as
    | 'fresh'
    | 'soon'
    | 'urgent'
    | 'expired';
  const daysLeft = item.expiryAt
    ? Math.floor((item.expiryAt - Date.now()) / (1000 * 60 * 60 * 24))
    : undefined;
  const emoji = FOOD_EMOJI[item.category as keyof typeof FOOD_EMOJI] || '🍴';

  return (
    <XStack
      alignItems="center"
      gap={showCheckbox ? 10 : 0}
      marginBottom={10}
      paddingHorizontal={showCheckbox ? 12 : 0}
    >
      {showCheckbox && (
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
      <View style={{ flex: 1 }}>
        <ItemCard
          emoji={emoji}
          name={item.foodName}
          status={status}
          days={daysLeft}
          container={item.storageLocation}
          onPress={onPress}
          accessibilityLabel={item.foodName}
        />
      </View>
    </XStack>
  );
}

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

  // Animation values for header buttons
  const sortScale = useSharedValue(1);
  const searchScale = useSharedValue(1);

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

  const createButtonAnimationHandlers = (scale: SharedValue<number>) => ({
    onPressIn: () => {
      scale.value = withTiming(0.92, { duration: 100 });
    },
    onPressOut: () => {
      scale.value = withTiming(1, { duration: 100 });
    },
  });

  const sortAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: sortScale.value }],
  }));

  const searchAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: searchScale.value }],
  }));

  return (
    <Animated.View
      style={{ flex: 1, backgroundColor: C['surface/base'] }}
      entering={FadeInUp.duration(300)}
      exiting={FadeOutDown.duration(200)}
    >
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
              <AnimatedPressable
                {...createButtonAnimationHandlers(sortScale)}
                style={[
                  {
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: C['surface/raised'],
                    borderWidth: 1,
                    borderColor: C['border/subtle'],
                    justifyContent: 'center',
                    alignItems: 'center',
                  },
                  sortAnimatedStyle,
                ]}
                accessible
                accessibilityRole="button"
                accessibilityLabel="Sort items"
                accessibilityHint="Change the order of items by expiry date or name"
              >
                <Text fontSize={18}>⇅</Text>
              </AnimatedPressable>
              <AnimatedPressable
                onPress={() => router.push('/search' as any)}
                {...createButtonAnimationHandlers(searchScale)}
                style={[
                  {
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: C['surface/raised'],
                    borderWidth: 1,
                    borderColor: C['border/subtle'],
                    justifyContent: 'center',
                    alignItems: 'center',
                  },
                  searchAnimatedStyle,
                ]}
                accessible
                accessibilityRole="button"
                accessibilityLabel="Advanced search"
                accessibilityHint="Open search with more filtering options"
              >
                <Text fontSize={18}>🔍</Text>
              </AnimatedPressable>
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
              onPress={() => {
                haptics.selection();
                setBulkMode(true);
              }}
              onPressIn={() => {
                haptics.selection();
              }}
              style={({ pressed }) => ({
                paddingHorizontal: 10,
                paddingVertical: 6,
                opacity: pressed ? 0.6 : 1,
              })}
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
              const isSelected = selectedItems.has(item.id);
              return (
                <ItemCardWithCheckbox
                  key={item.id}
                  item={item}
                  isSelected={isSelected}
                  showCheckbox={bulkMode}
                  onPress={() => {
                    haptics.selection();
                    if (bulkMode) {
                      toggleItemSelect(item.id);
                    } else {
                      router.push(`/items/${item.id}` as any);
                    }
                  }}
                />
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
    </Animated.View>
  );
}
