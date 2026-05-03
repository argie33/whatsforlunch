import React, { useState, useEffect } from 'react';
import { ScrollView, View, Pressable, FlatList } from 'react-native';
import { Text, YStack, XStack, Input } from 'tamagui';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Search, Settings } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { useAuthIds } from '@/features/auth';
import { useDatabase } from '@/db';
import type { Item } from '@/db/models/Item';
import { ItemRepository } from '@/db/repositories/ItemRepository';

type FilterType = 'all' | 'urgent' | 'fridge' | 'freezer' | 'pantry' | 'counter';

const STORAGE_ICONS: Record<string, string> = {
  fridge: '🧊',
  freezer: '❄️',
  pantry: '🥫',
  counter: '🍞',
};

export default function ItemsListScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const db = useDatabase();
  const { householdId } = useAuthIds();
  const [items, setItems] = useState<Item[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    if (!householdId) return;
    const repo = new ItemRepository(db);
    const sub = repo.observeByHousehold(householdId).subscribe({
      next: (fetchedItems) => {
        setItems(fetchedItems.filter(item => item.status === 'active'));
      },
    });
    return () => sub.unsubscribe();
  }, [db, householdId]);

  const getItemStatus = (item: Item) => {
    if (!item.expiryAt) return 'fresh';
    const now = Date.now();
    const expiry = new Date(item.expiryAt).getTime();
    const daysLeft = (expiry - now) / (1000 * 60 * 60 * 24);
    if (daysLeft <= 0) return 'expired';
    if (daysLeft <= 1) return 'urgent';
    if (daysLeft <= 3) return 'soon';
    return 'fresh';
  };

  const filteredItems = items.filter(item => {
    if (searchText && !item.foodName.toLowerCase().includes(searchText.toLowerCase())) {
      return false;
    }
    if (filter === 'all') return true;
    if (filter === 'urgent') return getItemStatus(item) === 'urgent';
    return item.storageLocation === filter;
  });

  const filterChips: Array<{ label: string; value: FilterType; icon?: string }> = [
    { label: 'All', value: 'all' },
    { label: '🔥 Urgent', value: 'urgent' },
    { label: '🧊 Fridge', value: 'fridge' },
    { label: '❄️ Freezer', value: 'freezer' },
    { label: '🥫 Pantry', value: 'pantry' },
    { label: '🍞 Counter', value: 'counter' },
  ];

  const getStatusColor = (item: Item) => {
    const status = getItemStatus(item);
    const colors: Record<string, string> = {
      fresh: '#3A8C5F',
      soon: '#C98A2B',
      urgent: '#C24A3E',
      expired: '#6B6B6B',
    };
    return colors[status] || '#3A8C5F';
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#FBFAF7' }}>
      {/* Header */}
      <YStack
        paddingTop={insets.top + 8}
        paddingHorizontal={16}
        paddingBottom={12}
        backgroundColor="#FFFFFF"
      >
        <XStack justifyContent="space-between" alignItems="center" marginBottom={12}>
          <Pressable onPress={() => router.back()}>
            <ChevronLeft size={24} color="#0F1411" />
          </Pressable>
          <YStack flex={1} marginLeft={12}>
            <Text fontSize={12} color="#5C615E" fontWeight="600">
              {filteredItems.length} items
            </Text>
            <Text fontSize={28} fontWeight="800" color="#0F1411" marginTop={2}>
              Inventory
            </Text>
          </YStack>
          <Pressable>
            <Text fontSize={20}>⇅</Text>
          </Pressable>
        </XStack>

        {/* Search Bar */}
        <XStack
          backgroundColor="#F2F0EB"
          borderRadius={12}
          paddingHorizontal={12}
          paddingVertical={10}
          alignItems="center"
          gap={10}
          marginBottom={12}
        >
          <Search size={18} color="#5C615E" />
          <Input
            flex={1}
            placeholder="Search items..."
            value={searchText}
            onChangeText={setSearchText}
            borderWidth={0}
            backgroundColor="transparent"
            padding={0}
            fontSize={14}
            color="#0F1411"
            placeholderTextColor="#8B908D"
          />
        </XStack>
      </YStack>

      {/* Filter Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12, gap: 8 }}
      >
        {filterChips.map((chip) => (
          <Pressable
            key={chip.value}
            onPress={() => setFilter(chip.value)}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 999,
              backgroundColor: filter === chip.value ? '#2F7D5B' : '#FFFFFF',
              borderWidth: 1,
              borderColor: filter === chip.value ? '#2F7D5B' : '#E8E5DE',
            }}
          >
            <Text
              fontSize={13}
              fontWeight="600"
              color={filter === chip.value ? 'white' : '#0F1411'}
            >
              {chip.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Items List */}
      <FlatList
        data={filteredItems}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingVertical: 12,
          paddingBottom: insets.bottom + 100,
        }}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/items/${item.id}`)}
            style={{
              marginBottom: 10,
              paddingHorizontal: 14,
              paddingVertical: 12,
              backgroundColor: '#FFFFFF',
              borderRadius: 12,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <YStack flex={1}>
              <XStack alignItems="center" gap={8}>
                <Text
                  fontSize={16}
                  fontWeight="700"
                  color="#0F1411"
                  flex={1}
                  numberOfLines={1}
                >
                  {item.foodName}
                </Text>
              </XStack>
              <Text fontSize={12} color="#5C615E" marginTop={4}>
                {STORAGE_ICONS[item.storageLocation] || '📦'} {item.storageLocation?.toUpperCase()}
                {item.expiryAt && (
                  <Text fontSize={12} color={getStatusColor(item)}>
                    {' '}• {new Date(item.expiryAt).toLocaleDateString()}
                  </Text>
                )}
              </Text>
            </YStack>
            <View
              style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: getStatusColor(item),
                opacity: 0.2,
              }}
            />
          </Pressable>
        )}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <YStack justifyContent="center" alignItems="center" marginTop={60}>
            <Text fontSize={16} color="#5C615E" fontWeight="600" marginBottom={8}>
              No items found
            </Text>
            <Text fontSize={13} color="#8B908D">
              {searchText ? 'Try a different search' : 'Add your first item'}
            </Text>
          </YStack>
        }
      />

      {/* FAB */}
      <Pressable
        onPress={() => router.push('/items/new')}
        style={{
          position: 'absolute',
          bottom: insets.bottom + 20,
          right: 20,
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: '#2F7D5B',
          justifyContent: 'center',
          alignItems: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.2,
          shadowRadius: 8,
          elevation: 4,
        }}
      >
        <Text fontSize={28} color="white" fontWeight="700">
          +
        </Text>
      </Pressable>
    </View>
  );
}
