import React, { useEffect, useState, useCallback } from 'react';
import { ScrollView, Pressable, Alert, View } from 'react-native';
import { Text, YStack, XStack } from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';

import { useDatabase } from '@/db';
import { ItemRepository } from '@/db/repositories/ItemRepository';
import type { Item } from '@/db/models/Item';
import { itemsService } from '@/services/ItemsService';
import { lightTheme } from '@/theme/tokens';

const C = lightTheme;

const FOOD_EMOJI: Record<string, string> = {
  vegetable: '🥬',
  fruit: '🍎',
  produce: '🥦',
  dairy: '🥛',
  meat: '🥩',
  protein: '🥩',
  seafood: '🐟',
  bakery: '🍞',
  grain: '🌾',
  pantry: '🥫',
  beverage: '🥤',
  frozen: '❄️',
  leftover: '🍱',
  sauce: '🍅',
};

export default function ItemDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const db = useDatabase();
  const [item, setItem] = useState<Item | null>(null);

  const loadItem = useCallback(async () => {
    if (!id) return;
    const repo = new ItemRepository(db);
    const found = await repo.findById(id);
    setItem(found || null);
  }, [id, db]);

  useEffect(() => {
    loadItem();
  }, [loadItem]);

  if (!item) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: C['surface/base'],
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Text>Loading...</Text>
      </View>
    );
  }

  const daysLeft = item.expiryAt
    ? Math.floor((new Date(item.expiryAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  const status = !daysLeft
    ? 'fresh'
    : daysLeft <= 0
      ? 'expired'
      : daysLeft <= 2
        ? 'urgent'
        : daysLeft <= 7
          ? 'soon'
          : 'fresh';
  const statusColors = {
    fresh: { color: C['status/fresh'], bg: C['status/freshBg'], label: 'FRESH' },
    soon: { color: C['status/soon'], bg: C['status/soonBg'], label: 'USE SOON' },
    urgent: { color: C['status/urgent'], bg: C['status/urgentBg'], label: 'URGENT' },
    expired: { color: C['status/expired'], bg: C['status/expiredBg'], label: 'EXPIRED' },
  }[status];

  const emoji = FOOD_EMOJI[item.category] || '🍴';

  const handleAction = async (action: 'eaten' | 'frozen' | 'tossed' | 'snooze') => {
    try {
      if (action === 'eaten') await itemsService.markItemEaten(db, item.id);
      else if (action === 'frozen') await itemsService.markItemFrozen(db, item.id);
      else if (action === 'tossed') await itemsService.markItemTossed(db, item.id);
      else if (action === 'snooze') await itemsService.snoozeItem(db, item.id, 3);
      router.back();
    } catch (e) {
      Alert.alert('Error', String(e));
    }
  };

  const handleDelete = () => {
    Alert.alert('Delete item', 'This action cannot be undone', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await itemsService.deleteItem(db, item.id);
            router.back();
          } catch (e) {
            Alert.alert('Error', String(e));
          }
        },
      },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: C['surface/base'] }}>
      <ScrollView
        contentContainerStyle={{
          paddingBottom: insets.bottom + 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* === Hero === */}
        <View
          style={{
            height: 280,
            backgroundColor: statusColors.bg,
            justifyContent: 'center',
            alignItems: 'center',
            position: 'relative',
          }}
        >
          {/* Back button */}
          <Pressable
            onPress={() => router.back()}
            style={{
              position: 'absolute',
              top: insets.top + 8,
              left: 16,
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: 'rgba(255,255,255,0.85)',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 10,
            }}
          >
            <Text fontSize={20}>←</Text>
          </Pressable>
          {/* Edit button */}
          <Pressable
            onPress={() => router.push(`/items/edit/${item.id}` as any)}
            style={{
              position: 'absolute',
              top: insets.top + 8,
              right: 16,
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: 'rgba(255,255,255,0.85)',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 10,
            }}
          >
            <Text fontSize={18}>✏️</Text>
          </Pressable>
          <Text fontSize={120}>{emoji}</Text>
        </View>

        {/* === Body === */}
        <View style={{ padding: 22 }}>
          {/* Status Badge */}
          <View
            style={{
              alignSelf: 'flex-start',
              backgroundColor: statusColors.bg,
              paddingHorizontal: 12,
              paddingVertical: 4,
              borderRadius: 9999,
              marginBottom: 12,
            }}
          >
            <Text fontSize={11} fontWeight="800" color={statusColors.color} letterSpacing={1}>
              {statusColors.label}
            </Text>
          </View>

          {/* Title */}
          <Text fontSize={28} fontWeight="800" color={C['text/primary']} letterSpacing={-0.8}>
            {item.foodName}
          </Text>
          <Text fontSize={13} color={C['text/secondary']} marginTop={6}>
            In the {item.storageLocation} · Added{' '}
            {item.storedAt ? new Date(item.storedAt).toLocaleDateString() : 'today'}
          </Text>

          {/* Info Card */}
          <View
            style={{
              backgroundColor: C['surface/raised'],
              borderRadius: 22,
              borderWidth: 1,
              borderColor: C['border/subtle'],
              marginTop: 20,
              overflow: 'hidden',
            }}
          >
            {[
              {
                label: 'Expires',
                value:
                  daysLeft != null
                    ? daysLeft <= 0
                      ? 'Expired'
                      : daysLeft === 1
                        ? 'Tomorrow'
                        : `In ${daysLeft} days`
                    : 'No date',
              },
              { label: 'Quantity', value: item.quantityText || '—' },
              { label: 'Category', value: item.category },
              { label: 'Storage', value: item.storageLocation },
            ].map((row, idx, arr) => (
              <View
                key={row.label}
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: 16,
                  borderBottomWidth: idx < arr.length - 1 ? 1 : 0,
                  borderBottomColor: C['border/subtle'],
                }}
              >
                <Text fontSize={14} color={C['text/secondary']} fontWeight="500">
                  {row.label}
                </Text>
                <Text fontSize={14} color={C['text/primary']} fontWeight="700">
                  {row.value}
                </Text>
              </View>
            ))}
          </View>

          {/* Action Buttons */}
          <YStack gap={10} marginTop={20}>
            <XStack gap={10}>
              <Pressable
                onPress={() => handleAction('eaten')}
                style={{
                  flex: 1,
                  backgroundColor: C['brand/primary'],
                  borderRadius: 16,
                  padding: 16,
                  alignItems: 'center',
                  flexDirection: 'row',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                <Text fontSize={16}>✓</Text>
                <Text fontSize={15} fontWeight="700" color="white">
                  Ate it
                </Text>
              </Pressable>
              <Pressable
                onPress={() => handleAction('frozen')}
                style={{
                  flex: 1,
                  backgroundColor: C['surface/raised'],
                  borderRadius: 16,
                  padding: 16,
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: C['border/subtle'],
                  flexDirection: 'row',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                <Text fontSize={16}>❄️</Text>
                <Text fontSize={15} fontWeight="700" color={C['text/primary']}>
                  Freeze
                </Text>
              </Pressable>
            </XStack>
            <XStack gap={10}>
              <Pressable
                onPress={() => handleAction('snooze')}
                style={{
                  flex: 1,
                  backgroundColor: C['surface/raised'],
                  borderRadius: 16,
                  padding: 16,
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: C['border/subtle'],
                  flexDirection: 'row',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                <Text fontSize={16}>⏰</Text>
                <Text fontSize={15} fontWeight="700" color={C['text/primary']}>
                  Snooze
                </Text>
              </Pressable>
              <Pressable
                onPress={() => handleAction('tossed')}
                style={{
                  flex: 1,
                  backgroundColor: C['surface/raised'],
                  borderRadius: 16,
                  padding: 16,
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: C['border/subtle'],
                  flexDirection: 'row',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                <Text fontSize={16}>🗑</Text>
                <Text fontSize={15} fontWeight="700" color={C['status/urgent']}>
                  Toss
                </Text>
              </Pressable>
            </XStack>
          </YStack>

          {/* Delete Button */}
          <Pressable
            onPress={handleDelete}
            style={{ marginTop: 20, padding: 16, alignItems: 'center' }}
          >
            <Text fontSize={14} color={C['status/urgent']} fontWeight="600">
              Delete item
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
