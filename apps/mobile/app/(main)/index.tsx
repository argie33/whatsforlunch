import React, { useState, useEffect } from 'react';
import { View, TextInput, TouchableOpacity, Alert } from 'react-native';
import { Text, YStack } from 'tamagui';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2 } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';

import { useAuthIds } from '@/features/auth';
import { useDatabase } from '@/db';
import type { Item } from '@/db/models/Item';
import { ItemRepository } from '@/db/repositories/ItemRepository';
import { itemsService } from '@/services';

export default function DashboardScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const db = useDatabase();
  const { householdId, userId } = useAuthIds();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);

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

  const activeItems = items.filter((item) => item.status === 'active');

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
          {activeItems.length} {t('dashboard.items')}
        </Text>
      </YStack>

      {/* Items List */}
      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text>{t('common.loading')}</Text>
        </View>
      ) : activeItems.length === 0 ? (
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
          data={activeItems}
          estimatedItemSize={80}
          contentContainerStyle={{ padding: 12, paddingBottom: insets.bottom + 100 }}
          renderItem={({ item }) => (
            <View
              style={{
                marginVertical: 6,
                padding: 12,
                backgroundColor: '#f5f5f5',
                borderRadius: 8,
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <View style={{ flex: 1 }}>
                <Text fontWeight="600" fontSize={15}>
                  {item.foodName}
                </Text>
                <Text fontSize={12} color="$text/tertiary" marginTop={2}>
                  📍 {item.storageLocation}
                </Text>
                {item.expiryAt && (
                  <Text fontSize={12} color="$text/tertiary" marginTop={2}>
                    {t('items.expires')}: {new Date(item.expiryAt).toLocaleDateString()}
                  </Text>
                )}
              </View>
              <TouchableOpacity
                onPress={() => handleDeleteItem(item)}
                style={{ padding: 8, marginLeft: 8 }}
              >
                <Trash2 size={18} color="red" />
              </TouchableOpacity>
            </View>
          )}
          keyExtractor={(item) => item.id}
        />
      )}

      {/* Add Item FAB */}
      <TouchableOpacity
        onPress={() => setShowAddForm(!showAddForm)}
        style={{
          position: 'absolute',
          bottom: 20,
          right: 20,
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: '#2F7D5B',
          justifyContent: 'center',
          alignItems: 'center',
          shadowColor: '#0F1411',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.2,
          shadowRadius: 8,
          elevation: 4,
        }}
      >
        <Plus size={28} color="white" />
      </TouchableOpacity>

      {/* Add Item Modal */}
      {showAddForm && (
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: 'white',
            padding: 16,
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            borderTopWidth: 1,
            borderColor: '#ddd',
          }}
        >
          <Text fontSize={18} fontWeight="bold" marginBottom={12}>
            {t('items.addItem')}
          </Text>

          <TextInput
            placeholder={t('items.foodName')}
            value={foodName}
            onChangeText={setFoodName}
            style={{
              borderWidth: 1,
              borderColor: '#ddd',
              borderRadius: 8,
              padding: 10,
              marginBottom: 12,
              fontSize: 14,
            }}
          />

          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
            {(['fridge', 'freezer', 'pantry'] as const).map((loc) => (
              <TouchableOpacity
                key={loc}
                onPress={() => setStorageLocation(loc)}
                style={{
                  flex: 1,
                  padding: 10,
                  borderRadius: 8,
                  backgroundColor: storageLocation === loc ? '#2F7D5B' : '#f0f0f0',
                }}
              >
                <Text
                  textAlign="center"
                  color={storageLocation === loc ? 'white' : 'black'}
                  fontWeight={storageLocation === loc ? '600' : '400'}
                  fontSize={13}
                >
                  {t(`items.storage.${loc}`)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            onPress={handleAddItem}
            disabled={adding}
            style={{
              padding: 12,
              borderRadius: 8,
              backgroundColor: '#2F7D5B',
              marginBottom: 8,
            }}
          >
            <Text textAlign="center" color="white" fontWeight="600">
              {adding ? t('common.loading') : t('items.addItem')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setShowAddForm(false)}
            style={{
              padding: 12,
              borderRadius: 8,
              backgroundColor: '#f0f0f0',
            }}
          >
            <Text textAlign="center" fontWeight="600">
              {t('common.cancel')}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </YStack>
  );
}
