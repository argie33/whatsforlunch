import { useEffect, useState, useCallback } from 'react';
import { Stack } from 'expo-router';
import { View, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useDatabase } from '@nozbe/watermelondb/react';
import { Text, Button, Input, Card, Stack as TStack, XStack, Checkbox } from 'tamagui';
import { useTranslation } from 'react-i18next';
import { Lightbulb } from 'lucide-react-native';
import { ShoppingListItem } from '@/db/models/ShoppingListItem';
import { shoppingListService, shoppingListSuggestionsService, SuggestionItem } from '@/services';
import { useAuthIds } from '@/features/auth';

const CATEGORY_ORDER = [
  'produce',
  'meat',
  'seafood',
  'dairy',
  'bakery',
  'frozen',
  'pantry',
  'beverages',
  'meal-plan',
  'other',
];

export default function ShoppingListScreen() {
  const { t } = useTranslation();
  const db = useDatabase();
  const { userId, householdId } = useAuthIds();

  const [items, setItems] = useState<ShoppingListItem[]>([]);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = useCallback(async () => {
    if (!householdId) return;
    try {
      setLoading(true);
      const pending = await shoppingListService.fetchPending(db, householdId);
      setItems(pending);
    } catch (err) {
      console.error('[Shopping List] Load failed:', err);
      Alert.alert(t('common.error'), t('common.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [db, householdId, t]);

  const loadSuggestions = useCallback(async () => {
    if (!householdId) return;
    try {
      setSuggestionsLoading(true);
      const suggested = await shoppingListSuggestionsService.getSuggestions(db, householdId);
      setSuggestions(suggested);
      setShowSuggestions(true);
    } catch (err) {
      console.error('[Shopping Suggestions] Load failed:', err);
      Alert.alert(t('common.error'), t('shopping.suggestionsFailed'));
    } finally {
      setSuggestionsLoading(false);
    }
  }, [db, householdId, t]);

  const handleAddItem = useCallback(async () => {
    if (!newItemName.trim() || !householdId || !userId) return;

    try {
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
      Alert.alert(t('common.error'), t('shopping.addItemFailed'));
    }
  }, [db, householdId, userId, newItemName, newItemCategory, items, t]);

  const handleMarkPurchased = useCallback(
    async (item: ShoppingListItem) => {
      try {
        await shoppingListService.markPurchased(db, item.id, userId!);
        setItems(items.filter((i) => i.id !== item.id));
      } catch (err) {
        console.error('[Shopping List] Mark failed:', err);
        Alert.alert(t('common.error'), t('shopping.markPurchasedFailed'));
      }
    },
    [db, userId, items, t],
  );

  const handleDelete = useCallback(
    async (item: ShoppingListItem) => {
      try {
        await shoppingListService.deleteItem(db, item.id);
        setItems(items.filter((i) => i.id !== item.id));
      } catch (err) {
        console.error('[Shopping List] Delete failed:', err);
        Alert.alert(t('common.error'), t('shopping.deleteItemFailed'));
      }
    },
    [db, items, t],
  );

  const handleAddSuggestion = useCallback(
    async (suggestion: SuggestionItem) => {
      if (!householdId || !userId) return;

      try {
        const item = await shoppingListService.addItem(db, {
          householdId,
          name: suggestion.name,
          category: suggestion.category,
          addedByUserId: userId,
        });
        setItems([...items, item]);
        setSuggestions(suggestions.filter((s) => s.name !== suggestion.name));
      } catch (err) {
        console.error('[Shopping List] Add suggestion failed:', err);
        Alert.alert(t('common.error'), t('shopping.addItemFailed'));
      }
    },
    [db, householdId, userId, items, suggestions, t],
  );

  const groupByCategory = (shoppingItems: ShoppingListItem[]) => {
    const grouped = new Map<string, ShoppingListItem[]>();

    shoppingItems.forEach((item) => {
      const category = (item.category || 'other').toLowerCase();
      if (!grouped.has(category)) {
        grouped.set(category, []);
      }
      grouped.get(category)!.push(item);
    });

    // Sort by CATEGORY_ORDER
    const sorted = Array.from(grouped.entries()).sort(([catA], [catB]) => {
      const indexA = CATEGORY_ORDER.indexOf(catA);
      const indexB = CATEGORY_ORDER.indexOf(catB);
      return (
        (indexA === -1 ? CATEGORY_ORDER.length : indexA) -
        (indexB === -1 ? CATEGORY_ORDER.length : indexB)
      );
    });

    return sorted;
  };

  const getCategoryLabel = (category: string): string => {
    if (category === 'meal-plan') return '🗓️ Meal Plan';
    return category.charAt(0).toUpperCase() + category.slice(1);
  };

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

            {/* Suggestions Section */}
            <Card
              padding="$4"
              backgroundColor="$yellow2"
              onPress={() => {
                if (!showSuggestions && !suggestionsLoading) {
                  loadSuggestions();
                }
              }}
            >
              <XStack alignItems="center" justifyContent="space-between">
                <XStack alignItems="center" gap="$2" flex={1}>
                  <Lightbulb size={20} color="#CAAE00" />
                  <TStack flex={1}>
                    <Text fontSize="$4" fontWeight="600">
                      {t('shopping.suggestions')}
                    </Text>
                    {suggestions.length > 0 && (
                      <Text fontSize="$2" color="$gray11">
                        {t('shopping.suggestionsCount', { count: suggestions.length })}
                      </Text>
                    )}
                  </TStack>
                </XStack>
                {suggestionsLoading && <ActivityIndicator color="#CAAE00" />}
              </XStack>
            </Card>

            {/* Suggestions List */}
            {showSuggestions && suggestions.length > 0 && (
              <TStack gap="$2">
                <Text fontSize={11} fontWeight="700" color="$text/tertiary" letterSpacing={1}>
                  {t('shopping.suggestedItems')}
                </Text>
                {suggestions.map((suggestion, idx) => (
                  <Card
                    key={idx}
                    paddingHorizontal="$4"
                    paddingVertical="$3"
                    backgroundColor="$yellow3"
                  >
                    <XStack justifyContent="space-between" alignItems="center" gap="$3">
                      <TStack flex={1}>
                        <Text fontSize="$4" fontWeight="600">
                          {suggestion.name}
                        </Text>
                        <Text fontSize="$2" color="$gray11">
                          {suggestion.reason}
                        </Text>
                      </TStack>
                      <Button
                        onPress={() => handleAddSuggestion(suggestion)}
                        size="$3"
                        backgroundColor="$green10"
                      >
                        +
                      </Button>
                    </XStack>
                  </Card>
                ))}
              </TStack>
            )}

            {showSuggestions && suggestions.length === 0 && !suggestionsLoading && (
              <Text color="$gray11" textAlign="center">
                {t('shopping.noSuggestions')}
              </Text>
            )}

            {/* Items List */}
            {items.length === 0 ? (
              <Text color="$gray11" textAlign="center" marginTop="$8">
                {loading ? t('common.loading') : t('shopping.noPendingItems')}
              </Text>
            ) : (
              <TStack gap="$4">
                {groupByCategory(items).map(([category, categoryItems]) => (
                  <TStack key={category} gap="$2">
                    <Text
                      fontSize={11}
                      fontWeight="700"
                      color="$text/tertiary"
                      paddingVertical="$1"
                      letterSpacing={1}
                      style={{ textTransform: 'uppercase' }}
                    >
                      {getCategoryLabel(category)}
                    </Text>
                    <TStack gap="$2">
                      {categoryItems.map((item) => (
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
                  </TStack>
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
