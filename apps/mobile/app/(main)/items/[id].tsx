import React, { useEffect, useState, useCallback } from 'react';
import { ScrollView, Pressable, Alert } from 'react-native';
import { YStack, XStack, Text, View, Image } from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useLocalSearchParams, router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { ChevronLeft, Edit2, Trash2, UtensilsCrossed, Snowflake } from 'lucide-react-native';

import { useDatabase } from '@/db';
import { ItemRepository } from '@/db/repositories/ItemRepository';
import type { Item } from '@/db/models/Item';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/Button';
import { IllustrationPlaceholder } from '@/components/ui/IllustrationPlaceholder';
import { getItemStatus, formatTimeLeft } from '@/lib/itemUtils';

const STORAGE_ICONS: Record<string, string> = {
  fridge: '🧊',
  freezer: '❄️',
  pantry: '🍞',
  counter: '🪴',
  lunchbox: '🥡',
};

export default function ItemDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const db = useDatabase();
  const insets = useSafeAreaInsets();

  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  useEffect(() => {
    if (!id) return;
    const repo = new ItemRepository(db);
    let sub: { unsubscribe: () => void } | null = null;
    repo.findById(id).then((found) => {
      if (!found) { router.back(); return; }
      setItem(found);
      setLoading(false);
      // Stay reactive to any local writes
      sub = found.observe().subscribe((updated: Item) => setItem(updated));
    });
    return () => sub?.unsubscribe();
  }, [id, db]);

  const withAction = useCallback(async (action: () => Promise<void>) => {
    if (acting || !item) return;
    setActing(true);
    try {
      await action();
    } finally {
      setActing(false);
    }
  }, [acting, item]);

  const handleMarkEaten = useCallback(() => withAction(async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const repo = new ItemRepository(db);
    await repo.update(item!, { status: 'eaten', eatenAt: Date.now() });
    router.back();
  }), [withAction, db, item]);

  const handleMarkTossed = useCallback(() => withAction(async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    const repo = new ItemRepository(db);
    await repo.update(item!, { status: 'tossed', tossedAt: Date.now() });
    router.back();
  }), [withAction, db, item]);

  const handleMarkFrozen = useCallback(() => withAction(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const repo = new ItemRepository(db);
    await repo.update(item!, { status: 'frozen', frozenAt: Date.now(), storageLocation: 'freezer' });
  }), [withAction, db, item]);

  const handleDelete = useCallback(() => {
    Alert.alert(
      t('items.deleteItem'),
      t('items.deleteConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => withAction(async () => {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            const repo = new ItemRepository(db);
            await repo.softDelete(item!);
            router.back();
          }),
        },
      ],
    );
  }, [t, withAction, db, item]);

  if (loading || !item) {
    return (
      <YStack flex={1} backgroundColor="$surface/base" justifyContent="center" alignItems="center">
        <Text color="$text/tertiary">Loading…</Text>
      </YStack>
    );
  }

  const status = getItemStatus(item);
  const expiryDate = new Date(item.expiryAt).toLocaleDateString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric',
  });

  return (
    <View flex={1} backgroundColor="$surface/base">
      {/* Hero image */}
      <View height={280} backgroundColor="$surface/sunken">
        {item.photoUrl ? (
          <Image
            source={{ uri: item.photoUrl }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />
        ) : (
          <YStack flex={1} justifyContent="center" alignItems="center">
            <Text fontSize={72}>{STORAGE_ICONS[item.storageLocation] ?? '🍽️'}</Text>
          </YStack>
        )}

        {/* Nav overlay */}
        <XStack
          position="absolute"
          top={insets.top + 8}
          left={0}
          right={0}
          paddingHorizontal="$4"
          justifyContent="space-between"
          alignItems="center"
        >
          <Pressable
            onPress={() => router.back()}
            style={{
              width: 36, height: 36, borderRadius: 18,
              backgroundColor: 'rgba(0,0,0,0.35)',
              alignItems: 'center', justifyContent: 'center',
            }}
            hitSlop={12}
          >
            <ChevronLeft size={20} color="white" />
          </Pressable>
          <Pressable
            onPress={() => router.push(`/items/${id}/edit`)}
            style={{
              width: 36, height: 36, borderRadius: 18,
              backgroundColor: 'rgba(0,0,0,0.35)',
              alignItems: 'center', justifyContent: 'center',
            }}
            hitSlop={12}
          >
            <Edit2 size={18} color="white" />
          </Pressable>
        </XStack>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
        <YStack padding="$5" gap="$4">
          {/* Title + status */}
          <XStack justifyContent="space-between" alignItems="flex-start">
            <YStack flex={1} gap="$1" marginRight="$3">
              <Text fontSize={26} fontWeight="700" color="$text/primary" lineHeight={32}>
                {item.foodName}
              </Text>
              <Text fontSize={14} color="$text/secondary">
                {item.storageLocation.charAt(0).toUpperCase() + item.storageLocation.slice(1)}
                {item.quantityText ? ` · ${item.quantityText}` : ''}
              </Text>
            </YStack>
            <StatusBadge status={status} />
          </XStack>

          {/* Expiry card */}
          <YStack
            backgroundColor={
              status === 'expired' ? '$status/expiredBg' :
              status === 'urgent' ? '$status/urgentBg' :
              status === 'soon' ? '$status/soonBg' :
              '$status/freshBg'
            }
            borderRadius="$md"
            padding="$4"
            gap="$1"
          >
            <Text fontSize={13} fontWeight="600" color="$text/secondary" textTransform="uppercase" letterSpacing={0.4}>
              {t('items.expiryDate')}
            </Text>
            <Text fontSize={22} fontWeight="700" color="$text/primary">{expiryDate}</Text>
            <Text fontSize={14} color="$text/secondary">{formatTimeLeft(item.expiryAt)}</Text>
          </YStack>

          {/* Details grid */}
          <YStack gap="$2">
            <DetailRow label={t('items.category')} value={item.category} />
            <DetailRow label={t('items.storageLocation')} value={item.storageLocation} />
            {item.notes && <DetailRow label={t('items.notes')} value={item.notes} />}
            {item.barcode && <DetailRow label="Barcode" value={item.barcode} />}
          </YStack>

          {/* Action buttons */}
          {item.status === 'active' && (
            <YStack gap="$3" marginTop="$2">
              <Button variant="filled" size="lg" onPress={handleMarkEaten} loading={acting}>
                {t('items.markEaten')}
              </Button>
              <XStack gap="$3">
                <View flex={1}>
                  <Button variant="tinted" size="md" onPress={handleMarkFrozen} loading={acting}>
                    {t('items.markFrozen')}
                  </Button>
                </View>
                <View flex={1}>
                  <Button variant="destructive" size="md" onPress={handleMarkTossed} loading={acting}>
                    {t('items.markTossed')}
                  </Button>
                </View>
              </XStack>
            </YStack>
          )}

          {item.status !== 'active' && (
            <YStack
              backgroundColor="$surface/sunken"
              borderRadius="$md"
              padding="$4"
              alignItems="center"
            >
              <Text fontSize={14} color="$text/secondary">
                {item.status === 'eaten' && '✓ Marked as eaten'}
                {item.status === 'tossed' && '🗑 Tossed'}
                {item.status === 'frozen' && '❄️ Frozen'}
              </Text>
            </YStack>
          )}

          {/* Delete */}
          <Pressable onPress={handleDelete}>
            <XStack justifyContent="center" alignItems="center" gap="$2" paddingVertical="$3">
              <Trash2 size={16} color="#C24A3E" />
              <Text fontSize={15} color="$status/urgent" fontWeight="500">
                {t('items.deleteItem')}
              </Text>
            </XStack>
          </Pressable>
        </YStack>
      </ScrollView>
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <XStack
      backgroundColor="$surface/raised"
      paddingHorizontal="$4"
      paddingVertical="$3"
      borderRadius="$md"
      justifyContent="space-between"
      alignItems="center"
    >
      <Text fontSize={15} color="$text/secondary">{label}</Text>
      <Text fontSize={15} color="$text/primary" fontWeight="500">{value}</Text>
    </XStack>
  );
}
