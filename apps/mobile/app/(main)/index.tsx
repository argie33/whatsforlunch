import React, { useState, useEffect } from 'react';
import { View, Alert, Pressable } from 'react-native';
import { Text, YStack, XStack, Input } from 'tamagui';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2 } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';

import { useAuthIds } from '@/features/auth';
import { useDatabase } from '@/db';
import type { Item } from '@/db/models/Item';
import { ItemRepository } from '@/db/repositories/ItemRepository';
import { itemsService } from '@/services';
import { Button } from '@/components/ui/Button';

type Filter = 'all' | 'fridge' | 'freezer' | 'pantry';

export default function DashboardScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const db = useDatabase();
  const { householdId, userId } = useAuthIds();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');

  const [showAddForm, setShowAddForm] = useState(false);
  const [foodName, setFoodName] = useState('');
  const [storageLocation, setStorageLocation] = useState<'fridge' | 'freezer' | 'pantry'>('fridge');
  const [category, setCategory] = useState('vegetable');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!householdId) return;
    setLoading(true);
    const repo = new ItemRepository(db);
    const sub = repo.observeByHousehold(householdId).subscribe({
      next: (fetchedItems) => {
        setItems(fetchedItems);
        setLoading(false);
      },
      error: () => {
        setLoading(false);
      },
    });
    return () => sub.unsubscribe();
  }, [db, householdId]);

  const handleAddItem = async () => {
    if (!foodName.trim() || !householdId || !userId) {
      Alert.alert(t('common.error'), t('items.foodNameRequired'));
      return;
    }

    setAdding(true);
    try {
      const expiryAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      await itemsService.createItem(db, {
        householdId,
        addedByUserId: userId,
        foodName: foodName.trim(),
        foodType: category,
        category,
        storageLocation: storageLocation as 'fridge' | 'freezer' | 'pantry',
        expiryAt,
        expirySource: 'user',
      });

      setFoodName('');
      setStorageLocation('fridge');
      setCategory('vegetable');
      setShowAddForm(false);

      Alert.alert(t('common.success'), t('items.itemAdded'));
    } catch (e) {
      Alert.alert(t('common.error'), String(e));
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteItem = async (item: Item) => {
    Alert.alert(t('items.deleteTitle'), t('items.deleteConfirm'), [
      { text: t('common.cancel'), onPress: () => {} },
      {
        text: t('common.delete'),
        onPress: async () => {
          try {
            await itemsService.deleteItem(db, item.id);
            Alert.alert(t('common.success'), t('items.itemDeleted'));
          } catch (e) {
            Alert.alert(t('common.error'), String(e));
          }
        },
      },
    ]);
  };

  const getFilteredItems = () => {
    let filtered = items.filter((item) => item.status === 'active');

    if (filter === 'all') {
      return filtered;
    }

    return filtered.filter((item) => item.storageLocation === filter);
  };

  const getStorageLocationDisplay = (item: Item): string => {
    if (item.storageLocation === 'freezer' || item.status === 'frozen') {
      return '⛄ Frozen';
    }
    const location = item.storageLocation;
    return location.charAt(0).toUpperCase() + location.slice(1);
  };

  const filteredItems = getFilteredItems();

  return (
    <YStack flex={1} backgroundColor="$surface/base">
      {/* Header */}
      <YStack
        paddingTop={insets.top + 8}
        paddingHorizontal="$4"
        paddingBottom="$3"
        backgroundColor="$surface/raised"
        borderBottomWidth={1}
        borderBottomColor="$border/subtle"
      >
        <Text fontSize={28} fontWeight="700" color="$text/primary">
          {t('dashboard.myItems')}
        </Text>
        <Text fontSize={14} color="$text/secondary" marginTop="$1">
          {filteredItems.length} {t('dashboard.items')}
        </Text>
      </YStack>

      {/* Items List */}
      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text>{t('common.loading')}</Text>
        </View>
      ) : filteredItems.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text fontSize={16} color="$text/secondary">
            {t('dashboard.noItems')}
          </Text>
          <Text fontSize={14} color="$text/tertiary" marginTop="$2">
            {t('dashboard.addFirstItem')}
          </Text>
        </View>
      ) : (
        <FlashList
          data={filteredItems}
          estimatedItemSize={80}
          contentContainerStyle={{ padding: 12, paddingBottom: insets.bottom + 100 }}
          renderItem={({ item }) => (
            <YStack
              marginVertical="$2"
              padding="$3"
              backgroundColor="$surface/raised"
              borderRadius="$md"
              flexDirection="row"
              justifyContent="space-between"
              alignItems="center"
            >
              <YStack flex={1}>
                <Text fontWeight="600" fontSize={15}>
                  {item.foodName}
                </Text>
                <Text fontSize={12} color="$text/tertiary" marginTop={2}>
                  📍 {getStorageLocationDisplay(item)}
                </Text>
                {item.expiryAt && (
                  <Text fontSize={12} color="$text/tertiary" marginTop={2}>
                    {t('items.expires')}: {new Date(item.expiryAt).toLocaleDateString()}
                  </Text>
                )}
              </YStack>
              <Pressable
                onPress={() => handleDeleteItem(item)}
                style={{ padding: 8, marginLeft: 8 }}
              >
                <Trash2 size={18} color="$status/danger" />
              </Pressable>
            </YStack>
          )}
          keyExtractor={(item) => item.id}
        />
      )}

      {/* Add Item FAB */}
      <YStack
        position="absolute"
        bottom={20}
        right={20}
        width={56}
        height={56}
        borderRadius={28}
        backgroundColor="$brand/primary"
        justifyContent="center"
        alignItems="center"
        shadowColor="$text/primary"
        shadowOffset={{ width: 0, height: 2 }}
        shadowOpacity={0.2}
        shadowRadius={8}
        elevation={4}
      >
        <Pressable onPress={() => setShowAddForm(!showAddForm)}>
          <Plus size={28} color="$white" />
        </Pressable>
      </YStack>

      {/* Add Item Modal */}
      {showAddForm && (
        <YStack
          position="absolute"
          bottom={0}
          left={0}
          right={0}
          backgroundColor="$surface/base"
          padding="$4"
          borderTopLeftRadius={16}
          borderTopRightRadius={16}
          borderTopWidth={1}
          borderColor="$border/subtle"
        >
          <Text fontSize={18} fontWeight="bold" marginBottom="$3">
            {t('items.addItem')}
          </Text>

          <Input
            placeholder={t('items.foodName')}
            value={foodName}
            onChangeText={setFoodName}
            marginBottom="$3"
          />

          <XStack gap="$2" marginBottom="$3">
            {(['fridge', 'freezer', 'pantry'] as const).map((loc) => (
              <YStack key={loc} flex={1}>
                <Pressable onPress={() => setStorageLocation(loc)}>
                  <YStack
                    padding="$3"
                    borderRadius="$md"
                    backgroundColor={storageLocation === loc ? '$brand/primary' : '$surface/sunken'}
                    alignItems="center"
                  >
                    <Text
                      textAlign="center"
                      color={storageLocation === loc ? '$white' : '$text/secondary'}
                      fontWeight={storageLocation === loc ? '600' : '400'}
                      fontSize={13}
                    >
                      {t(`items.storage.${loc}`)}
                    </Text>
                  </YStack>
                </Pressable>
              </YStack>
            ))}
          </XStack>

          <YStack marginBottom="$2">
            <Button onPress={handleAddItem} disabled={adding} variant="filled" size="lg">
              {adding ? t('common.loading') : t('items.addItem')}
            </Button>
          </YStack>

          <Pressable onPress={() => setShowAddForm(false)}>
            <YStack
              padding="$3"
              borderRadius="$md"
              backgroundColor="$surface/sunken"
              alignItems="center"
            >
              <Text fontWeight="600">{t('common.cancel')}</Text>
            </YStack>
          </Pressable>
        </YStack>
      )}
    </YStack>
  );
}
