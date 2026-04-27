import React, { useEffect, useState, useCallback, useRef } from 'react';
import { ScrollView, Pressable, Alert } from 'react-native';
import { YStack, XStack, Text, View } from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useLocalSearchParams, router } from 'expo-router';
import { haptics } from '@/lib/haptics';
import { ChevronLeft, Archive, QrCode, Printer } from 'lucide-react-native';
import BottomSheet from '@gorhom/bottom-sheet';

import { useDatabase } from '@/db';
import { ContainerRepository } from '@/db/repositories/ContainerRepository';
import { ItemRepository } from '@/db/repositories/ItemRepository';
import type { Container } from '@/db/models/Container';
import type { Item } from '@/db/models/Item';
import { containersService } from '@/services/ContainersService';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { AddItemSheet } from '@/features/items/AddItemSheet';
import { getItemStatus, formatTimeLeftI18n } from '@/lib/itemUtils';

const PLACEHOLDER_USER = 'user_placeholder';

export default function ContainerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const db = useDatabase();
  const insets = useSafeAreaInsets();
  const addSheetRef = useRef<BottomSheet>(null);

  const [container, setContainer] = useState<Container | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const containerRepo = new ContainerRepository(db);
    const itemRepo = new ItemRepository(db);

    let containerSub: { unsubscribe: () => void } | null = null;
    let itemSub: { unsubscribe: () => void } | null = null;

    containerRepo.findById(id).then((found) => {
      if (!found) { router.back(); return; }
      setContainer(found);
      setLoading(false);
      containerSub = found.observe().subscribe((updated: Container) => setContainer(updated));
    });

    itemSub = itemRepo.observeByContainer(id).subscribe((containerItems) => {
      setItems(containerItems.filter((i) => !i.deletedAt));
    });

    return () => {
      containerSub?.unsubscribe();
      itemSub?.unsubscribe();
    };
  }, [id, db]);

  const handleArchive = useCallback(() => {
    if (!container) return;
    const name = container.nickname || `Container ${container.qrToken.slice(-4)}`;
    Alert.alert(
      t('containers.archiveContainer'),
      t('containers.archiveConfirm', { name }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('containers.archiveContainer'),
          style: 'destructive',
          onPress: async () => {
            await haptics.warning();
            try {
              await containersService.archiveContainer(db, container.id);
              router.back();
            } catch (err) {
              console.error('[container] archive failed:', err);
            }
          },
        },
      ],
    );
  }, [container, db, t]);

  const activeItems = items.filter((i) => i.status === 'active');
  const historyItems = items.filter((i) => i.status !== 'active').slice(0, 50);

  if (loading || !container) {
    return (
      <YStack flex={1} backgroundColor="$surface/base" justifyContent="center" alignItems="center">
        <Text color="$text/tertiary">{t('common.loading')}</Text>
      </YStack>
    );
  }

  const displayName = container.nickname || `Container ${container.qrToken.slice(-4)}`;

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
        <XStack alignItems="center" gap="$3">
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <ChevronLeft size={24} color="#2F7D5B" />
          </Pressable>
          <YStack flex={1}>
            <Text fontSize={20} fontWeight="700" color="$text/primary" numberOfLines={1}>
              {displayName}
            </Text>
            <Text fontSize={13} color="$text/tertiary" fontFamily="monospace">
              {container.qrToken}
            </Text>
          </YStack>
          <Pressable onPress={() => router.push('/stickers')} hitSlop={12}>
            <Printer size={20} color="#5C615E" />
          </Pressable>
          <Pressable onPress={handleArchive} hitSlop={12}>
            <Archive size={20} color="#5C615E" />
          </Pressable>
        </XStack>
      </YStack>

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}>
        {/* Current item(s) */}
        <YStack padding="$5" gap="$3">
          <XStack justifyContent="space-between" alignItems="center">
            <Text fontSize={13} fontWeight="700" color="$text/tertiary" textTransform="uppercase" letterSpacing={0.8}>
              {t('containers.subtitle', { count: activeItems.length })}
            </Text>
            <Pressable
              onPress={async () => {
                await haptics.tap();
                addSheetRef.current?.expand();
              }}
            >
              <XStack
                paddingHorizontal="$3"
                paddingVertical="$1"
                borderRadius="$full"
                backgroundColor="$brand/primaryMuted"
                alignItems="center"
                gap="$1"
              >
                <Text fontSize={13} fontWeight="600" color="$brand/primary">+ {t('common.add')}</Text>
              </XStack>
            </Pressable>
          </XStack>

          {activeItems.length === 0 ? (
            <EmptyState
              title={t('containers.containerEmptyTitle')}
              description={t('containers.containerEmptyDescription')}
              primaryAction={{
                label: t('items.addItem'),
                onPress: () => addSheetRef.current?.expand(),
              }}
            />
          ) : (
            <YStack
              backgroundColor="$surface/raised"
              borderRadius="$lg"
              borderWidth={1}
              borderColor="$border/subtle"
              overflow="hidden"
            >
              {activeItems.map((item, idx) => (
                <ContainerItemRow
                  key={item.id}
                  item={item}
                  isLast={idx === activeItems.length - 1}
                  onPress={() => router.push(`/items/${item.id}`)}
                />
              ))}
            </YStack>
          )}

          {/* History */}
          {historyItems.length > 0 && (
            <YStack gap="$3" marginTop="$2">
              <Text fontSize={13} fontWeight="700" color="$text/tertiary" textTransform="uppercase" letterSpacing={0.8}>
                {t('items.history')} ({historyItems.length})
              </Text>
              <YStack
                backgroundColor="$surface/raised"
                borderRadius="$lg"
                borderWidth={1}
                borderColor="$border/subtle"
                overflow="hidden"
              >
                {historyItems.map((item, idx) => (
                  <ContainerItemRow
                    key={item.id}
                    item={item}
                    isLast={idx === historyItems.length - 1}
                    onPress={() => router.push(`/items/${item.id}`)}
                    dimmed
                  />
                ))}
              </YStack>
            </YStack>
          )}
        </YStack>
      </ScrollView>

      <AddItemSheet
        bottomSheetRef={addSheetRef}
        householdId={container.householdId}
        userId={PLACEHOLDER_USER}
        containerId={container.id}
        onAdded={() => {/* reactive */}}
      />
    </View>
  );
}

const HISTORY_STATUS_KEYS: Record<string, string> = {
  eaten: 'items.statusEaten',
  tossed: 'items.statusTossed',
  frozen: 'items.statusFrozen',
};

function ContainerItemRow({
  item,
  isLast,
  onPress,
  dimmed = false,
}: {
  item: Item;
  isLast: boolean;
  onPress: () => void;
  dimmed?: boolean;
}) {
  const { t } = useTranslation();
  const status = getItemStatus(item);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={item.foodName}
    >
      <XStack
        paddingHorizontal="$4"
        paddingVertical="$3"
        alignItems="center"
        gap="$3"
        borderBottomWidth={isLast ? 0 : 1}
        borderBottomColor="$border/subtle"
        opacity={dimmed ? 0.55 : 1}
        pressStyle={{ opacity: 0.7 }}
      >
        <YStack flex={1}>
          <Text fontSize={15} fontWeight="600" color="$text/primary" numberOfLines={1}>
            {item.foodName}
          </Text>
          {item.quantityText && (
            <Text fontSize={13} color="$text/secondary">{item.quantityText}</Text>
          )}
        </YStack>
        {!dimmed ? (
          <YStack alignItems="flex-end" gap="$1">
            <StatusBadge status={status} size="sm" />
            <Text fontSize={11} color="$text/tertiary">{formatTimeLeftI18n(item.expiryAt, t)}</Text>
          </YStack>
        ) : (
          <Text fontSize={13} color="$text/tertiary">
            {t(HISTORY_STATUS_KEYS[item.status] ?? 'items.statusEaten')}
          </Text>
        )}
      </XStack>
    </Pressable>
  );
}
