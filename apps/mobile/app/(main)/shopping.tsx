import { useMemo, useState, useCallback } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StyleSheet, View, FlatList, ListRenderItem } from 'react-native';
import { useLiveQuery } from '@nozbe/watermelondb/react';
import { useDatabase } from '@nozbe/watermelondb/react';
import { Stack } from 'expo-router';
import { Text, Button, Input, Card, Stack as TStack, XStack, Checkbox } from 'tamagui';
import { Plus, Trash2, Check } from '@tamagui/lucide-icons';
import { useAuth } from '@/hooks/useAuth';
import { useHousehold } from '@/hooks/useHousehold';
import { ShoppingListRepository } from '@/db/repositories';
import { ShoppingListItem } from '@/db/models/ShoppingListItem';
import { shoppingListService } from '@/services';

export default function ShoppingListScreen() {
  const db = useDatabase();
  const { userId } = useAuth();
  const { householdId } = useHousehold();
  const insets = useSafeAreaInsets();

  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('');

  const repo = useMemo(() => new ShoppingListRepository(db), [db]);
  const items = useLiveQuery(() => repo.observePending(householdId!).pipe());

  const handleAddItem = useCallback(async () => {
    if (!newItemName.trim() || !householdId || !userId) return;

    try {
      await shoppingListService.addItem(db, {
        householdId,
        name: newItemName.trim(),
        category: newItemCategory || undefined,
        addedByUserId: userId,
        autoSuggested: false,
      });
      setNewItemName('');
      setNewItemCategory('');
    } catch (err) {
      console.error('Failed to add item:', err);
    }
  }, [newItemName, newItemCategory, householdId, userId, db]);

  const handleMarkPurchased = useCallback(
    async (item: ShoppingListItem) => {
      try {
        await shoppingListService.markPurchased(db, item.id, userId!);
      } catch (err) {
        console.error('Failed to mark item:', err);
      }
    },
    [db, userId],
  );

  const handleDelete = useCallback(
    async (item: ShoppingListItem) => {
      try {
        await shoppingListService.deleteItem(db, item.id);
      } catch (err) {
        console.error('Failed to delete item:', err);
      }
    },
    [db],
  );

  const renderItem: ListRenderItem<ShoppingListItem> = ({ item }) => (
    <Card
      pressStyle={{ opacity: 0.5 }}
      marginBottom="$3"
      paddingHorizontal="$4"
      paddingVertical="$3"
      backgroundColor="$gray1"
    >
      <XStack justifyContent="space-between" alignItems="center">
        <XStack flex={1} alignItems="center" gap="$3">
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
        </XStack>
        <Button
          icon={<Trash2 size={16} />}
          size="$3"
          circular
          backgroundColor="$red2"
          onPress={() => handleDelete(item)}
        />
      </XStack>
    </Card>
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Shopping List',
          headerShown: true,
        }}
      />
      <View
        style={[
          styles.container,
          {
            paddingTop: insets.top,
            paddingBottom: insets.bottom,
          },
        ]}
      >
        <TStack flex={1} padding="$4" gap="$4">
          {/* Add Item Form */}
          <Card padding="$4" backgroundColor="$blue2">
            <TStack gap="$3">
              <Input
                placeholder="Item name"
                value={newItemName}
                onChangeText={setNewItemName}
                size="$4"
                returnKeyType="next"
              />
              <XStack gap="$2">
                <Input
                  placeholder="Category (optional)"
                  value={newItemCategory}
                  onChangeText={setNewItemCategory}
                  flex={1}
                  size="$4"
                />
                <Button
                  icon={<Plus size={18} />}
                  onPress={handleAddItem}
                  disabled={!newItemName.trim()}
                  size="$4"
                  paddingHorizontal="$4"
                >
                  Add
                </Button>
              </XStack>
            </TStack>
          </Card>

          {/* Items List */}
          <FlatList
            data={items}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            scrollEnabled={true}
            ListEmptyComponent={
              <Text color="$gray11" textAlign="center" marginTop="$8">
                No pending items. Add one to get started!
              </Text>
            }
          />
        </TStack>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});
