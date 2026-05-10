import React, { useState } from 'react';
import { YStack, XStack, Text } from 'tamagui';
import { ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { TopBar, ItemCard, Input } from '@/components/ui';
import { lightTheme } from '@/theme/tokens';

const C = lightTheme;

// Mock data
const allItems = [
  {
    id: 1,
    emoji: '🥬',
    name: 'Lettuce',
    meta: 'Fridge • Today',
    status: 'fresh' as const,
    badge: 'FRESH',
  },
  {
    id: 2,
    emoji: '🥕',
    name: 'Carrots',
    meta: 'Fridge • 3 days',
    status: 'soon' as const,
    badge: 'SOON',
  },
  {
    id: 3,
    emoji: '🍅',
    name: 'Tomatoes',
    meta: 'Counter • Today',
    status: 'urgent' as const,
    badge: 'EAT TODAY',
  },
  {
    id: 4,
    emoji: '🧄',
    name: 'Garlic',
    meta: 'Pantry • 2 weeks',
    status: 'fresh' as const,
    badge: 'FRESH',
  },
  {
    id: 5,
    emoji: '🥛',
    name: 'Milk',
    meta: 'Fridge • Tomorrow',
    status: 'soon' as const,
    badge: 'SOON',
  },
];

export default function ItemsScreen() {
  const router = useRouter();
  const [searchText, setSearchText] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'fresh' | 'soon' | 'urgent' | 'expired'>(
    'all',
  );
  const [scrollY, setScrollY] = useState(0);

  const filteredItems = allItems.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchText.toLowerCase());
    const matchesFilter = filterStatus === 'all' || item.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const filterTabs = [
    { label: 'All', value: 'all' as const },
    { label: 'Fresh', value: 'fresh' as const },
    { label: 'Soon', value: 'soon' as const },
    { label: 'Urgent', value: 'urgent' as const },
  ];

  return (
    <YStack flex={1} backgroundColor={C['surface/base']}>
      <ScrollView
        scrollEventThrottle={16}
        onScroll={(e) => setScrollY(e.nativeEvent.contentOffset.y)}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* Top Bar */}
        <TopBar title="Your Items" subtitle={`${filteredItems.length} items`} scrollY={scrollY} />

        {/* Search */}
        <YStack paddingHorizontal={22} paddingTop={16} paddingBottom={12}>
          <Input
            placeholder="Search items..."
            value={searchText}
            onChangeText={setSearchText}
            placeholderTextColor={C['text/tertiary']}
          />
        </YStack>

        {/* Filter Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 22, gap: 8 }}
          scrollEventThrottle={16}
        >
          {filterTabs.map((tab) => (
            <XStack
              key={tab.value}
              paddingHorizontal={16}
              paddingVertical={8}
              borderRadius={20}
              backgroundColor={
                filterStatus === tab.value ? C['brand/primary'] : C['surface/raised']
              }
              borderWidth={filterStatus === tab.value ? 0 : 1}
              borderColor={C['border/subtle']}
              onPress={() => setFilterStatus(tab.value)}
            >
              <Text
                fontSize={14}
                fontWeight="600"
                color={filterStatus === tab.value ? C['text/inverse'] : C['text/primary']}
              >
                {tab.label}
              </Text>
            </XStack>
          ))}
        </ScrollView>

        {/* Items List */}
        <YStack paddingHorizontal={22} paddingTop={16} gap={0}>
          {filteredItems.length > 0 ? (
            filteredItems.map((item) => (
              <ItemCard
                key={item.id}
                status={item.status}
                icon={item.emoji}
                name={item.name}
                meta={item.meta}
                badge={item.badge}
                onPress={() => router.push(`/(main)/item/${item.id}`)}
              />
            ))
          ) : (
            <YStack alignItems="center" paddingVertical={40} gap={12}>
              <Text fontSize={48}>🔍</Text>
              <Text fontSize={16} fontWeight="600" color={C['text/primary']}>
                No items found
              </Text>
              <Text fontSize={14} color={C['text/secondary']}>
                Try adjusting your search
              </Text>
            </YStack>
          )}
        </YStack>
      </ScrollView>
    </YStack>
  );
}
