import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { Pressable, RefreshControl } from 'react-native';
import { YStack, XStack, Text, View } from 'tamagui';
import { FlashList } from '@shopify/flash-list';
import { Swipeable } from 'react-native-gesture-handler';
import BottomSheet from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Plus } from 'lucide-react-native';

import { useDatabase } from '@/db';
import { ItemRepository } from '@/db/repositories/ItemRepository';
import type { Item } from '@/db/models/Item';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { IllustrationPlaceholder } from '@/components/ui/IllustrationPlaceholder';
import { AddItemSheet } from '@/features/items/AddItemSheet';
import { groupItemsIntoSections, getItemStatus, formatTimeLeft, type ItemSection } from '@/lib/itemUtils';

// Stub until auth integration lands in Phase C
const PLACEHOLDER_HOUSEHOLD = 'household_placeholder';
const PLACEHOLDER_USER = 'user_placeholder';

const SECTION_LABEL_KEYS: Record<string, string> = {
  expired: 'dashboard.sectionExpired',
  urgent: 'dashboard.sectionUrgent',
  soon: 'dashboard.sectionSoon',
  fresh: 'dashboard.sectionFresh',
  frozen: 'dashboard.sectionFrozen',
};

const STORAGE_FILTERS = [
  { key: 'all', labelKey: 'dashboard.filterAll' },
  { key: 'fridge', labelKey: 'dashboard.filterFridge' },
  { key: 'freezer', labelKey: 'dashboard.filterFreezer' },
  { key: 'pantry', labelKey: 'dashboard.filterPantry' },
] as const;
type StorageFilter = typeof STORAGE_FILTERS[number]['key'];

type ListItem =
  | { type: 'section'; key: string; labelKey: string; count: number }
  | { type: 'item'; item: Item };

export default function DashboardScreen() {
  const { t } = useTranslation();
  const db = useDatabase();
  const insets = useSafeAreaInsets();
  const addSheetRef = useRef<BottomSheet>(null);

  const [allItems, setAllItems] = useState<Item[]>([]);
  const [storageFilter, setStorageFilter] = useState<StorageFilter>('all');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const repo = new ItemRepository(db);
    const sub = repo.observeByStatus(PLACEHOLDER_HOUSEHOLD, 'active').subscribe(setAllItems);
    return () => sub.unsubscribe();
  }, [db]);

  const filteredItems = useMemo(() => {
    if (storageFilter === 'all') return allItems;
    return allItems.filter((i) => i.storageLocation === storageFilter);
  }, [allItems, storageFilter]);

  const sections = useMemo(() => groupItemsIntoSections(filteredItems), [filteredItems]);

  const listData = useMemo<ListItem[]>(() => {
    const rows: ListItem[] = [];
    for (const section of sections) {
      rows.push({ type: 'section', key: section.key, labelKey: section.labelKey, count: section.items.length });
      for (const item of section.items) {
        rows.push({ type: 'item', item });
      }
    }
    return rows;
  }, [sections]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    // Phase C: trigger SyncService.pull()
    await new Promise((r) => setTimeout(r, 600));
    setRefreshing(false);
  }, []);

  const handleMarkEaten = useCallback(async (item: Item) => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const repo = new ItemRepository(db);
    await repo.update(item, { status: 'eaten', eatenAt: Date.now() });
  }, [db]);

  const handleMarkTossed = useCallback(async (item: Item) => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    const repo = new ItemRepository(db);
    await repo.update(item, { status: 'tossed', tossedAt: Date.now() });
  }, [db]);

  const urgentCount = useMemo(() =>
    allItems.filter((i) => {
      const ms = i.expiryAt - Date.now();
      return ms >= 0 && ms <= 3 * 24 * 60 * 60 * 1000;
    }).length,
  [allItems]);

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
        <XStack justifyContent="space-between" alignItems="flex-end">
          <YStack>
            <Text fontSize={28} fontWeight="700" color="$text/primary" lineHeight={34}>
              {t('dashboard.title')}
            </Text>
            <XStack alignItems="center" gap="$2" marginTop="$1">
              <Text fontSize={14} color="$text/secondary">
                {t('dashboard.subtitle', { count: allItems.length })}
              </Text>
              {urgentCount > 0 && (
                <XStack
                  backgroundColor="$status/urgentBg"
                  paddingHorizontal="$2"
                  paddingVertical={2}
                  borderRadius="$full"
                >
                  <Text fontSize={12} fontWeight="600" color="$status/urgent">
                    {t('dashboard.expiringSoonBadge', { count: urgentCount })}
                  </Text>
                </XStack>
              )}
            </XStack>
          </YStack>
        </XStack>

        {/* Storage filter */}
        <XStack gap="$2" marginTop="$3">
          {STORAGE_FILTERS.map(({ key, labelKey }) => {
            const active = storageFilter === key;
            return (
              <Pressable
                key={key}
                onPress={async () => {
                  await Haptics.selectionAsync();
                  setStorageFilter(key);
                }}
              >
                <XStack
                  paddingHorizontal="$3"
                  paddingVertical="$1"
                  borderRadius="$full"
                  backgroundColor={active ? '$brand/primary' : '$surface/sunken'}
                  borderWidth={active ? 0 : 1}
                  borderColor="$border/subtle"
                >
                  <Text
                    fontSize={13}
                    fontWeight={active ? '600' : '400'}
                    color={active ? 'white' : '$text/secondary'}
                  >
                    {t(labelKey)}
                  </Text>
                </XStack>
              </Pressable>
            );
          })}
        </XStack>
      </YStack>

      {/* List */}
      {listData.length === 0 ? (
        <EmptyState
          title={t('empty.dashboard.title')}
          description={t('empty.dashboard.description')}
          illustration={<IllustrationPlaceholder name="empty-fridge" width={200} height={160} />}
          primaryAction={{
            label: t('dashboard.fabManual'),
            onPress: () => addSheetRef.current?.expand(),
          }}
          secondaryAction={{
            label: t('containers.printStickers'),
            onPress: () => router.push('/stickers'),
          }}
        />
      ) : (
        <FlashList
          data={listData}
          estimatedItemSize={68}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          getItemType={(row) => row.type}
          keyExtractor={(row) =>
            row.type === 'section' ? `section-${row.key}` : `item-${row.item.id}`
          }
          renderItem={({ item: row }) => {
            if (row.type === 'section') {
              return <SectionHeader labelKey={row.labelKey} count={row.count} />;
            }
            return (
              <ItemRow
                item={row.item}
                onPress={() => router.push(`/items/${row.item.id}`)}
                onEaten={() => handleMarkEaten(row.item)}
                onTossed={() => handleMarkTossed(row.item)}
              />
            );
          }}
          contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
        />
      )}

      {/* FAB */}
      <Pressable
        onPress={async () => {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          addSheetRef.current?.expand();
        }}
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
          shadowColor: '#0F1411',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.2,
          shadowRadius: 12,
          elevation: 8,
        }}
      >
        <Plus size={24} color="white" strokeWidth={2.5} />
      </Pressable>

      <AddItemSheet
        bottomSheetRef={addSheetRef}
        householdId={PLACEHOLDER_HOUSEHOLD}
        userId={PLACEHOLDER_USER}
        onAdded={() => {/* list updates reactively */}}
      />
    </View>
  );
}

function SectionHeader({ labelKey, count }: { labelKey: string; count: number }) {
  const { t } = useTranslation();
  return (
    <XStack
      paddingHorizontal="$5"
      paddingTop="$4"
      paddingBottom="$2"
      alignItems="center"
      gap="$2"
    >
      <Text fontSize={12} fontWeight="700" color="$text/tertiary" textTransform="uppercase" letterSpacing={0.8}>
        {t(labelKey)}
      </Text>
      <Text fontSize={12} color="$text/tertiary">
        {t('dashboard.sectionCount', { count })}
      </Text>
    </XStack>
  );
}

interface ItemRowProps {
  item: Item;
  onPress: () => void;
  onEaten: () => void;
  onTossed: () => void;
}

function ItemRow({ item, onPress, onEaten, onTossed }: ItemRowProps) {
  const { t } = useTranslation();
  const status = getItemStatus(item);

  const renderRightActions = useCallback(() => (
    <XStack height="100%">
      <Pressable
        onPress={onEaten}
        style={{
          backgroundColor: '#3A8C5F',
          width: 80,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text color="white" fontSize={12} fontWeight="600" textAlign="center">
          {t('dashboard.swipeEaten')}
        </Text>
      </Pressable>
      <Pressable
        onPress={onTossed}
        style={{
          backgroundColor: '#C24A3E',
          width: 80,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text color="white" fontSize={12} fontWeight="600" textAlign="center">
          {t('dashboard.swipeToss')}
        </Text>
      </Pressable>
    </XStack>
  ), [onEaten, onTossed, t]);

  return (
    <Swipeable renderRightActions={renderRightActions} overshootRight={false} friction={2}>
      <Pressable onPress={onPress}>
        <XStack
          backgroundColor="$surface/raised"
          paddingHorizontal="$5"
          paddingVertical="$3"
          alignItems="center"
          gap="$3"
          borderBottomWidth={1}
          borderBottomColor="$border/subtle"
          pressStyle={{ opacity: 0.75 }}
        >
          {/* Color strip */}
          <View
            width={4}
            height={44}
            borderRadius={2}
            backgroundColor={
              status === 'expired' ? '$status/expired' :
              status === 'urgent' ? '$status/urgent' :
              status === 'soon' ? '$status/soon' :
              status === 'frozen' ? '$brand/primary' :
              '$status/fresh'
            }
          />

          <YStack flex={1} gap="$1">
            <Text fontSize={16} fontWeight="600" color="$text/primary" numberOfLines={1}>
              {item.foodName}
            </Text>
            <XStack gap="$2" alignItems="center">
              <Text fontSize={13} color="$text/secondary">
                {item.storageLocation.charAt(0).toUpperCase() + item.storageLocation.slice(1)}
              </Text>
              {item.quantityText && (
                <>
                  <Text fontSize={13} color="$text/tertiary">·</Text>
                  <Text fontSize={13} color="$text/secondary">{item.quantityText}</Text>
                </>
              )}
            </XStack>
          </YStack>

          <YStack alignItems="flex-end" gap="$1">
            <StatusBadge status={status} size="sm" />
            <Text fontSize={12} color="$text/tertiary">
              {formatTimeLeft(item.expiryAt)}
            </Text>
          </YStack>
        </XStack>
      </Pressable>
    </Swipeable>
  );
}
