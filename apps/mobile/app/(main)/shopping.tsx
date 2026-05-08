import { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, Pressable, TextInput, Alert } from 'react-native';
import { Text, YStack, XStack } from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useDatabase } from '@nozbe/watermelondb/react';
import { ShoppingListItem } from '@/db/models/ShoppingListItem';
import { shoppingListService } from '@/services';
import { useAuthIds } from '@/features/auth';
import { lightTheme } from '@/theme/tokens';

const C = lightTheme;

const CATEGORY_INFO: Record<string, { icon: string; bg: string; label: string }> = {
  produce: { icon: '🥦', bg: C['accent/honeySoft'], label: 'Produce' },
  meat: { icon: '🥩', bg: C['accent/coralSoft'], label: 'Meat' },
  dairy: { icon: '🥛', bg: C['brand/soft'], label: 'Dairy' },
  bakery: { icon: '🍞', bg: C['accent/honeySoft'], label: 'Bakery' },
  frozen: { icon: '❄️', bg: C['accent/skySoft'], label: 'Frozen' },
  pantry: { icon: '🥫', bg: C['accent/plumSoft'], label: 'Pantry' },
  beverages: { icon: '🥤', bg: C['accent/skySoft'], label: 'Beverages' },
  other: { icon: '🛒', bg: C['surface/sunken'], label: 'Other' },
};

export default function ShoppingListScreen() {
  const insets = useSafeAreaInsets();
  const db = useDatabase();
  const { userId, householdId } = useAuthIds();

  const [items, setItems] = useState<ShoppingListItem[]>([]);
  const [newItemName, setNewItemName] = useState('');
  const [loading, setLoading] = useState(false);

  const loadItems = useCallback(async () => {
    if (!householdId) return;
    try {
      setLoading(true);
      const pending = await shoppingListService.fetchPending(db, householdId);
      setItems(pending);
    } catch (err) {
      console.error('[Shopping] Load failed:', err);
    } finally {
      setLoading(false);
    }
  }, [db, householdId]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const handleAddItem = useCallback(async () => {
    if (!newItemName.trim() || !householdId || !userId) return;
    try {
      const item = await shoppingListService.addItem(db, {
        householdId,
        name: newItemName.trim(),
        addedByUserId: userId,
      });
      setItems([...items, item]);
      setNewItemName('');
    } catch (err) {
      Alert.alert('Error', 'Failed to add item');
    }
  }, [db, householdId, userId, newItemName, items]);

  const handleMarkPurchased = useCallback(
    async (item: ShoppingListItem) => {
      try {
        await shoppingListService.markPurchased(db, item.id, userId!);
        setItems(items.filter((i) => i.id !== item.id));
      } catch (err) {
        Alert.alert('Error', 'Failed to update');
      }
    },
    [db, userId, items],
  );

  const handleDelete = useCallback(
    async (item: ShoppingListItem) => {
      try {
        await shoppingListService.deleteItem(db, item.id);
        setItems(items.filter((i) => i.id !== item.id));
      } catch (err) {
        Alert.alert('Error', 'Failed to delete');
      }
    },
    [db, items],
  );

  const groupedItems = items.reduce(
    (groups, item) => {
      const cat = (item.category || 'other').toLowerCase();
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
      return groups;
    },
    {} as Record<string, ShoppingListItem[]>,
  );

  return (
    <View style={{ flex: 1, backgroundColor: C['surface/base'] }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 8,
          paddingBottom: insets.bottom + 100,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* === Header === */}
        <View
          style={{
            paddingHorizontal: 16,
            paddingVertical: 14,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Pressable
            onPress={() => router.back()}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: C['surface/raised'],
              borderWidth: 1,
              borderColor: C['border/subtle'],
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Text fontSize={20}>←</Text>
          </Pressable>
          <YStack alignItems="center">
            <Text fontSize={11} fontWeight="600" color={C['text/secondary']} letterSpacing={0.3}>
              {items.length} items
            </Text>
            <Text
              fontSize={22}
              fontWeight="800"
              color={C['text/primary']}
              letterSpacing={-0.5}
              fontFamily="Fraunces"
            >
              Shopping
            </Text>
          </YStack>
          <View style={{ width: 40 }} />
        </View>

        {/* === Add Item Input === */}
        <View style={{ paddingHorizontal: 22, marginBottom: 20 }}>
          <View
            style={{
              backgroundColor: C['surface/raised'],
              borderRadius: 22,
              padding: 16,
              borderWidth: 1,
              borderColor: C['border/subtle'],
              flexDirection: 'row',
              gap: 10,
              alignItems: 'center',
            }}
          >
            <TextInput
              value={newItemName}
              onChangeText={setNewItemName}
              placeholder="Add item to list..."
              placeholderTextColor={C['text/tertiary']}
              onSubmitEditing={handleAddItem}
              style={{
                flex: 1,
                fontSize: 15,
                color: C['text/primary'],
              }}
            />
            <Pressable
              onPress={handleAddItem}
              disabled={!newItemName.trim()}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: newItemName.trim() ? C['brand/primary'] : C['surface/sunken'],
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Text fontSize={20} color="white" fontWeight="700">
                +
              </Text>
            </Pressable>
          </View>
        </View>

        {/* === Items by Category === */}
        {Object.keys(groupedItems).length === 0 ? (
          <View style={{ paddingHorizontal: 22 }}>
            <View
              style={{
                backgroundColor: C['surface/raised'],
                borderRadius: 22,
                padding: 32,
                borderWidth: 1,
                borderColor: C['border/subtle'],
                alignItems: 'center',
              }}
            >
              <Text fontSize={48} marginBottom={12}>
                🛒
              </Text>
              <Text fontSize={16} fontWeight="700" color={C['text/primary']} marginBottom={4}>
                {loading ? 'Loading...' : 'List is empty'}
              </Text>
              <Text fontSize={13} color={C['text/secondary']} textAlign="center">
                Add items above to get started
              </Text>
            </View>
          </View>
        ) : (
          Object.entries(groupedItems).map(([category, categoryItems]) => {
            const info = CATEGORY_INFO[category] || CATEGORY_INFO.other;
            return (
              <View key={category} style={{ paddingHorizontal: 22, marginBottom: 16 }}>
                <Text
                  fontSize={11}
                  fontWeight="800"
                  color={C['text/secondary']}
                  letterSpacing={1.5}
                  marginBottom={8}
                >
                  {info.label.toUpperCase()}
                </Text>
                <View
                  style={{
                    backgroundColor: C['surface/raised'],
                    borderRadius: 22,
                    borderWidth: 1,
                    borderColor: C['border/subtle'],
                    overflow: 'hidden',
                  }}
                >
                  {categoryItems.map((item, idx) => (
                    <View
                      key={item.id}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        padding: 14,
                        gap: 12,
                        borderBottomWidth: idx < categoryItems.length - 1 ? 1 : 0,
                        borderBottomColor: C['border/subtle'],
                      }}
                    >
                      <Pressable
                        onPress={() => handleMarkPurchased(item)}
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: 6,
                          borderWidth: 2,
                          borderColor: C['border/strong'],
                        }}
                      />
                      <View
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 10,
                          backgroundColor: info.bg,
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}
                      >
                        <Text fontSize={18}>{info.icon}</Text>
                      </View>
                      <YStack flex={1}>
                        <Text
                          fontSize={15}
                          fontWeight="700"
                          color={C['text/primary']}
                          letterSpacing={-0.1}
                        >
                          {item.name}
                        </Text>
                        {item.quantity && (
                          <Text fontSize={12} color={C['text/secondary']} marginTop={2}>
                            {item.quantity}
                          </Text>
                        )}
                      </YStack>
                      <Pressable
                        onPress={() => handleDelete(item)}
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 16,
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}
                      >
                        <Text fontSize={18} color={C['text/tertiary']}>
                          ×
                        </Text>
                      </Pressable>
                    </View>
                  ))}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}
