import { useEffect, useState, useCallback } from 'react';
import { Stack } from 'expo-router';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useDatabase } from '@nozbe/watermelondb/react';
import { Text, Button, Input, Card, Stack as TStack, XStack, Checkbox } from 'tamagui';
import { useTranslation } from 'react-i18next';
import { ShoppingListItem } from '@/db/models/ShoppingListItem';
import { shoppingListService } from '@/services';
import { useAuthIds } from '@/features/auth';

export default function ShoppingListScreen() {
  const { t } = useTranslation();
  const db = useDatabase();
  const { userId, householdId } = useAuthIds();

  const [items, setItems] = useState<ShoppingListItem[]>([]);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = useCallback(async () => {
    if (!householdId) return;
    try {
      setLoading(true);
      const pending = await shoppingListService.fetchPending(db, householdId);
      setItems(pending);
      console.log('[Shopping List] Loaded', pending.length, 'items');
    } catch (err) {
      console.error('[Shopping List] Load failed:', err);
    } finally {
      setLoading(false);
    }
  }, [db, householdId]);

  const handleAddItem = useCallback(async () => {
    if (!newItemName.trim() || !householdId || !userId) return;

    try {
      console.log('[Shopping List] Adding:', newItemName);
      const item = await shoppingListService.addItem(db, {
        householdId,
        name: newItemName.trim(),
        category: newItemCategory || undefined,
        addedByUserId: userId,
      });
      setItems([...items, item]);
      setNewItemName('');
      setNewItemCategory('');
    } catch (err) {
      console.error('[Shopping List] Add failed:', err);
    }
  }, [db, householdId, userId, newItemName, newItemCategory, items]);

  const handleMarkPurchased = useCallback(
    async (item: ShoppingListItem) => {
      try {
        await shoppingListService.markPurchased(db, item.id, userId!);
        setItems(items.filter((i) => i.id !== item.id));
      } catch (err) {
        console.error('[Shopping List] Mark failed:', err);
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
        console.error('[Shopping List] Delete failed:', err);
      }
    },
    [db, items],
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: t('shopping.screenTitle'),
          headerShown: true,
        }}
      />
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <TStack padding="$4" gap="$4">
            {/* Add Item Form */}
            <Card padding="$4" backgroundColor="$blue2">
              <TStack gap="$3">
                <Input
                  placeholder={t('shopping.itemName')}
                  value={newItemName}
                  onChangeText={setNewItemName}
                  size="$4"
                  editable={!loading}
                />
                <XStack gap="$2">
                  <Input
                    placeholder={t('shopping.category')}
                    value={newItemCategory}
                    onChangeText={setNewItemCategory}
                    flex={1}
                    size="$4"
                    editable={!loading}
                  />
                  <Button
                    onPress={handleAddItem}
                    disabled={!newItemName.trim() || loading}
                    size="$4"
                    paddingHorizontal="$4"
                  >
                    +
                  </Button>
                </XStack>
              </TStack>
            </Card>

            {/* Items List */}
            {items.length === 0 ? (
              <Text color="$gray11" textAlign="center" marginTop="$8">
                {loading ? t('common.loading') : t('shopping.noPendingItems')}
              </Text>
            ) : (
              <TStack gap="$3">
                {items.map((item) => (
                  <Card
                    key={item.id}
                    paddingHorizontal="$4"
                    paddingVertical="$3"
                    backgroundColor="$gray1"
                  >
                    <XStack justifyContent="space-between" alignItems="center" gap="$3">
                      <Checkbox size="$5" onCheckedChange={() => handleMarkPurchased(item)} />
                      <TStack flex={1}>
                        <Text fontSize="$4" fontWeight="600">
                          {item.name}
                        </Text>
                        {item.quantity && (
                          <Text fontSize="$2" color="$gray11">
                            {item.quantity}
                            {item.category ? ` • ${item.category}` : ''}
                          </Text>
                        )}
                      </TStack>
                      <Button
                        size="$3"
                        circular
                        backgroundColor="$red2"
                        onPress={() => handleDelete(item)}
                      >
                        ×
                      </Button>
                    </XStack>
                  </Card>
                ))}
              </TStack>
            )}
          </TStack>
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
  },
});
