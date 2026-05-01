import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { Pressable, RefreshControl, TextInput, StyleSheet, Animated, Image } from 'react-native';
import { YStack, XStack, Text, View } from 'tamagui';
import { FlashList } from '@shopify/flash-list';
import { Swipeable } from 'react-native-gesture-handler';
import BottomSheet from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { haptics } from '@/lib/haptics';
import { router } from 'expo-router';
import {
  Plus,
  Search,
  Trash2,
  CheckSquare,
  Square,
  X as XIcon,
  Sparkles,
} from 'lucide-react-native';
import { cancelExpiryNotification } from '@/lib/notifications';

import { useDatabase } from '@/db';
import { ItemRepository } from '@/db/repositories/ItemRepository';
import type { Item } from '@/db/models/Item';
import { itemsService } from '@/services/ItemsService';
import { useSyncState, useSync } from '@/services/SyncContext';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { IllustrationPlaceholder } from '@/components/ui/IllustrationPlaceholder';
import { AddItemSheet } from '@/features/items/AddItemSheet';
import { groupItemsIntoSections, getItemStatus, formatTimeLeftI18n } from '@/lib/itemUtils';
import { SyncStatusBadge } from '@/components/ui/SyncStatusBadge';
import { useAuthIds } from '@/features/auth';

const STORAGE_FILTERS = [
  { key: 'all', labelKey: 'dashboard.filterAll' },
  { key: 'fridge', labelKey: 'dashboard.filterFridge' },
  { key: 'freezer', labelKey: 'dashboard.filterFreezer' },
  { key: 'pantry', labelKey: 'dashboard.filterPantry' },
] as const;
type StorageFilter = (typeof STORAGE_FILTERS)[number]['key'];

type ListItem =
  | { type: 'section'; key: string; labelKey: string; count: number }
  | { type: 'item'; item: Item };

export default function DashboardScreen() {
  const { t } = useTranslation();
  const db = useDatabase();
  const { householdId, userId } = useAuthIds();
  const insets = useSafeAreaInsets();
  const addSheetRef = useRef<BottomSheet>(null);
  const syncState = useSyncState();
  const sync = useSync();

  const [allItems, setAllItems] = useState<Item[]>([]);
  const [storageFilter, setStorageFilter] = useState<StorageFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const bulkBarSlide = useRef(new Animated.Value(80)).current;

  useEffect(() => {
    const repo = new ItemRepository(db);
    const sub = repo.observeByStatus(householdId, 'active').subscribe(setAllItems);
    return () => sub.unsubscribe();
  }, [db, householdId]);

  const filteredItems = useMemo(() => {
    let items =
      storageFilter === 'all'
        ? allItems
        : allItems.filter((i) => i.storageLocation === storageFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter((i) => i.foodName.toLowerCase().includes(q));
    }
    return items;
  }, [allItems, storageFilter, searchQuery]);

  const sections = useMemo(() => groupItemsIntoSections(filteredItems), [filteredItems]);

  const listData = useMemo<ListItem[]>(() => {
    const rows: ListItem[] = [];
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

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await sync(householdId);
    } catch {
      // SyncService logs internally; swallow here so spinner always stops
    } finally {
      setRefreshing(false);
    }
  }, [sync, householdId]);

  const handleMarkEaten = useCallback(
    async (item: Item) => {
      await haptics.success();
      try {
        await itemsService.markItemEaten(db, item.id);
      } catch (err) {
        console.error('[dashboard] markItemEaten failed:', err);
      }
    },
    [db],
  );

  const handleMarkTossed = useCallback(
    async (item: Item) => {
      await haptics.warning();
      try {
        await itemsService.markItemTossed(db, item.id);
      } catch (err) {
        console.error('[dashboard] markItemTossed failed:', err);
      }
    },
    [db],
  );

  const enterSelectMode = useCallback(() => {
    setSelectMode(true);
    setSelectedIds(new Set());
    Animated.spring(bulkBarSlide, { toValue: 0, useNativeDriver: true }).start();
    haptics.selection().catch(() => {});
  }, [bulkBarSlide]);

  const exitSelectMode = useCallback(() => {
    setSelectMode(false);
    setSelectedIds(new Set());
    Animated.spring(bulkBarSlide, { toValue: 80, useNativeDriver: true }).start();
  }, [bulkBarSlide]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    haptics.selection().catch(() => {});
  }, []);

  const handleBulkEaten = useCallback(async () => {
    if (selectedIds.size === 0) return;
    await haptics.success();
    await Promise.all(
      [...selectedIds].map((id) => {
        cancelExpiryNotification(id).catch(() => {});
        return itemsService.markItemEaten(db, id);
      }),
    );
    exitSelectMode();
  }, [selectedIds, db, exitSelectMode]);

  const handleBulkToss = useCallback(async () => {
    if (selectedIds.size === 0) return;
    await haptics.warning();
    await Promise.all(
      [...selectedIds].map((id) => {
        cancelExpiryNotification(id).catch(() => {});
        return itemsService.markItemTossed(db, id);
      }),
    );
    exitSelectMode();
  }, [selectedIds, db, exitSelectMode]);

  const urgentCount = useMemo(
    () =>
      allItems.filter((i) => {
        const ms = i.expiryAt - Date.now();
        return ms >= 0 && ms <= 3 * 24 * 60 * 60 * 1000;
      }).length,
    [allItems],
  );

  const useTodayItems = useMemo(
    () =>
      allItems.filter((i) => {
        const ms = i.expiryAt - Date.now();
        return ms >= 0 && ms <= 24 * 60 * 60 * 1000;
      }),
    [allItems],
  );

  const expiredItems = useMemo(() => allItems.filter((i) => i.expiryAt < Date.now()), [allItems]);

  const handleTossAllExpired = useCallback(async () => {
    if (expiredItems.length === 0) return;
    await haptics.warning();
    await Promise.all(
      expiredItems.map((i) => {
        cancelExpiryNotification(i.id).catch(() => {});
        return itemsService.markItemTossed(db, i.id);
      }),
    );
  }, [expiredItems, db]);

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
        <XStack justifyContent="space-between" alignItems="flex-start">
          <YStack flex={1}>
            {selectMode ? (
              <Text fontSize={20} fontWeight="700" color="$text/primary" lineHeight={28}>
                {t('dashboard.selectCount', { count: selectedIds.size })}
              </Text>
            ) : (
              <Text fontSize={28} fontWeight="700" color="$text/primary" lineHeight={34}>
                {t('dashboard.title')}
              </Text>
            )}
            {!selectMode && (
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
            )}
          </YStack>
          {selectMode ? (
            <Pressable
              onPress={exitSelectMode}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={t('common.cancel')}
            >
              <XIcon size={22} color="#8A8E8C" />
            </Pressable>
          ) : (
            <SyncStatusBadge state={syncState} />
          )}
        </XStack>

        {/* Search bar */}
        <XStack
          marginTop="$3"
          backgroundColor="$surface/sunken"
          borderRadius="$md"
          paddingHorizontal="$3"
          paddingVertical="$2"
          alignItems="center"
          gap="$2"
          borderWidth={1}
          borderColor="$border/subtle"
        >
          <Search size={16} color="#8A8E8C" />
          <TextInput
            style={styles.searchInput}
            placeholder={t('dashboard.searchPlaceholder')}
            placeholderTextColor="#8A8E8C"
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
            accessibilityLabel={t('dashboard.searchPlaceholder')}
            accessibilityRole="search"
          />
        </XStack>

        {/* Storage filter */}
        <XStack gap="$2" marginTop="$2" justifyContent="space-between" alignItems="center">
          {STORAGE_FILTERS.map(({ key, labelKey }) => {
            const active = storageFilter === key;
            return (
              <Pressable
                key={key}
                onPress={async () => {
                  await haptics.selection();
                  setStorageFilter(key);
                }}
                accessibilityRole="radio"
                accessibilityLabel={t(labelKey)}
                accessibilityState={{ checked: active }}
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

        {/* Bulk toss expired */}
        {expiredItems.length > 0 && (
          <Pressable
            onPress={handleTossAllExpired}
            accessibilityRole="button"
            accessibilityLabel={t('dashboard.tossAllExpired', { count: expiredItems.length })}
          >
            <XStack
              marginTop="$2"
              paddingHorizontal="$3"
              paddingVertical="$2"
              borderRadius="$md"
              backgroundColor="$status/expiredBg"
              alignItems="center"
              gap="$2"
            >
              <Trash2 size={13} color="#C24A3E" />
              <Text fontSize={13} fontWeight="600" color="$status/urgent">
                {t('dashboard.tossAllExpired', { count: expiredItems.length })}
              </Text>
            </XStack>
          </Pressable>
        )}

        {/* Use Today banner — items expiring within 24 hours */}
        {useTodayItems.length > 0 && (
          <Pressable
            onPress={async () => {
              await haptics.selection();
              router.push('/(main)/recipes');
            }}
            accessibilityRole="button"
            accessibilityLabel={t('dashboard.useTodayBanner', { count: useTodayItems.length })}
          >
            <XStack
              marginTop="$2"
              paddingHorizontal="$3"
              paddingVertical="$2"
              borderRadius="$md"
              backgroundColor="#EAF5F0"
              borderWidth={1}
              borderColor="#B5D9C8"
              alignItems="center"
              gap="$2"
            >
              <Sparkles size={13} color="#2F7D5B" />
              <Text fontSize={13} fontWeight="600" color="#2F7D5B" flex={1}>
                {t('dashboard.useTodayBanner', { count: useTodayItems.length })}
              </Text>
              <Text fontSize={12} color="#2F7D5B">
                {t('dashboard.useTodayCta')} →
              </Text>
            </XStack>
          </Pressable>
        )}
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
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
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
                onPress={() => {
                  if (selectMode) {
                    toggleSelect(row.item.id);
                  } else {
                    router.push(`/items/${row.item.id}`);
                  }
                }}
                onLongPress={() => {
                  if (!selectMode) enterSelectMode();
                  toggleSelect(row.item.id);
                }}
                onEaten={() => handleMarkEaten(row.item)}
                onTossed={() => handleMarkTossed(row.item)}
                selectMode={selectMode}
                selected={selectedIds.has(row.item.id)}
              />
            );
          }}
          contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
        />
      )}

      {/* Bulk action bar */}
      <Animated.View
        style={[
          styles.bulkBar,
          { bottom: insets.bottom + 8, transform: [{ translateY: bulkBarSlide }] },
        ]}
      >
        <Pressable
          style={[styles.bulkButton, { backgroundColor: '#3A8C5F' }]}
          onPress={handleBulkEaten}
          disabled={selectedIds.size === 0}
          accessibilityRole="button"
          accessibilityLabel={t('dashboard.bulkEaten', { count: selectedIds.size })}
          accessibilityState={{ disabled: selectedIds.size === 0 }}
        >
          <Text color="white" fontSize={14} fontWeight="600">
            ✓ {t('dashboard.bulkEaten', { count: selectedIds.size })}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.bulkButton, { backgroundColor: '#C24A3E' }]}
          onPress={handleBulkToss}
          disabled={selectedIds.size === 0}
          accessibilityRole="button"
          accessibilityLabel={t('dashboard.bulkToss', { count: selectedIds.size })}
          accessibilityState={{ disabled: selectedIds.size === 0 }}
        >
          <Text color="white" fontSize={14} fontWeight="600">
            🗑 {t('dashboard.bulkToss', { count: selectedIds.size })}
          </Text>
        </Pressable>
      </Animated.View>

      {/* FAB — hidden in select mode */}
      {!selectMode && (
        <Pressable
          onPress={async () => {
            await haptics.tap();
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
          accessibilityRole="button"
          accessibilityLabel={t('accessibility.fabButton')}
        >
          <Plus size={24} color="white" strokeWidth={2.5} aria-hidden />
        </Pressable>
      )}

      <AddItemSheet
        bottomSheetRef={addSheetRef}
        householdId={householdId}
        userId={userId}
        onAdded={() => {
          /* list updates reactively */
        }}
      />
    </View>
  );
}

function SectionHeader({ labelKey, count }: { labelKey: string; count: number }) {
  const { t } = useTranslation();
  return (
    <XStack paddingHorizontal="$5" paddingTop="$4" paddingBottom="$2" alignItems="center" gap="$2">
      <Text
        fontSize={12}
        fontWeight="700"
        color="$text/tertiary"
        textTransform="uppercase"
        letterSpacing={0.8}
      >
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
  onLongPress: () => void;
  onEaten: () => void;
  onTossed: () => void;
  selectMode: boolean;
  selected: boolean;
}

const STORAGE_LABEL_KEYS: Record<string, string> = {
  fridge: 'items.storageFridge',
  freezer: 'items.storageFreezer',
  pantry: 'items.storagePantry',
  counter: 'items.storageCounter',
};

function ItemRow({
  item,
  onPress,
  onLongPress,
  onEaten,
  onTossed,
  selectMode,
  selected,
}: ItemRowProps) {
  const { t } = useTranslation();
  const status = getItemStatus(item);

  const renderRightActions = useCallback(() => {
    if (selectMode) return null;
    return (
      <XStack height="100%">
        <Pressable
          onPress={onEaten}
          style={{
            backgroundColor: '#3A8C5F',
            width: 80,
            alignItems: 'center',
            justifyContent: 'center',
          }}
          accessibilityRole="button"
          accessibilityLabel={t('accessibility.swipeEaten')}
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
          accessibilityRole="button"
          accessibilityLabel={t('accessibility.swipeToss')}
        >
          <Text color="white" fontSize={12} fontWeight="600" textAlign="center">
            {t('dashboard.swipeToss')}
          </Text>
        </Pressable>
      </XStack>
    );
  }, [onEaten, onTossed, t, selectMode]);

  return (
    <Swipeable
      renderRightActions={renderRightActions}
      overshootRight={false}
      friction={2}
      enabled={!selectMode}
    >
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        delayLongPress={350}
        accessibilityRole="button"
        accessibilityLabel={t('accessibility.itemCard', {
          name: item.foodName,
          status: t(`items.status${status.charAt(0).toUpperCase()}${status.slice(1)}`),
          daysLeft: formatTimeLeftI18n(item.expiryAt, t),
        })}
        accessibilityHint={selectMode ? undefined : t('accessibility.swipeEaten')}
      >
        <XStack
          backgroundColor={selected ? '$surface/sunken' : '$surface/raised'}
          paddingHorizontal="$5"
          paddingVertical="$3"
          alignItems="center"
          gap="$3"
          borderBottomWidth={1}
          borderBottomColor="$border/subtle"
          pressStyle={{ opacity: 0.75 }}
        >
          {/* Checkbox in select mode, photo or color strip otherwise */}
          {selectMode ? (
            <View width={24} alignItems="center" justifyContent="center">
              {selected ? (
                <CheckSquare size={22} color="#2F7D5B" />
              ) : (
                <Square size={22} color="#8A8E8C" />
              )}
            </View>
          ) : item.photoUrl ? (
            <View width={44} height={44} borderRadius="$md" overflow="hidden" position="relative">
              <Image source={{ uri: item.photoUrl }} style={{ width: '100%', height: '100%' }} />
              <View
                position="absolute"
                left={0}
                top={0}
                bottom={0}
                width={3}
                backgroundColor={
                  status === 'expired'
                    ? '$status/expired'
                    : status === 'urgent'
                      ? '$status/urgent'
                      : status === 'soon'
                        ? '$status/soon'
                        : status === 'frozen'
                          ? '$brand/primary'
                          : '$status/fresh'
                }
              />
            </View>
          ) : (
            <View
              width={4}
              height={44}
              borderRadius={2}
              backgroundColor={
                status === 'expired'
                  ? '$status/expired'
                  : status === 'urgent'
                    ? '$status/urgent'
                    : status === 'soon'
                      ? '$status/soon'
                      : status === 'frozen'
                        ? '$brand/primary'
                        : '$status/fresh'
              }
            />
          )}

          <YStack flex={1} gap="$1">
            <Text fontSize={16} fontWeight="600" color="$text/primary" numberOfLines={1}>
              {item.foodName}
            </Text>
            <XStack gap="$2" alignItems="center">
              <Text fontSize={13} color="$text/secondary">
                {t(STORAGE_LABEL_KEYS[item.storageLocation] ?? 'items.storageFridge')}
              </Text>
              {item.quantityText && (
                <>
                  <Text fontSize={13} color="$text/tertiary">
                    ·
                  </Text>
                  <Text fontSize={13} color="$text/secondary">
                    {item.quantityText}
                  </Text>
                </>
              )}
            </XStack>
          </YStack>

          <YStack alignItems="flex-end" gap="$1">
            <StatusBadge status={status} size="sm" />
            <Text fontSize={12} color="$text/tertiary">
              {formatTimeLeftI18n(item.expiryAt, t)}
            </Text>
          </YStack>
        </XStack>
      </Pressable>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1A1F1C',
    paddingVertical: 0,
  },
  bulkBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    gap: 8,
    zIndex: 10,
  },
  bulkButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F1411',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 6,
  },
});
