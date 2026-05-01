import { useState } from 'react';
import { Stack } from 'expo-router';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Button, Input, Card, Stack as TStack, XStack } from 'tamagui';
import { useTranslation } from 'react-i18next';

export default function ShoppingListScreen() {
  const { t } = useTranslation();
  const [items, setItems] = useState<Array<{ id: string; name: string; category?: string }>>([]);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('');

  const handleAddItem = () => {
    if (!newItemName.trim()) return;

    const newItem = {
      id: String(Date.now()),
      name: newItemName.trim(),
      category: newItemCategory || undefined,
    };

    setItems([...items, newItem]);
    setNewItemName('');
    setNewItemCategory('');
  };

  const handleDelete = (id: string) => {
    setItems(items.filter((item) => item.id !== id));
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
                  returnKeyType="next"
                />
                <XStack gap="$2">
                  <Input
                    placeholder={t('shopping.category')}
                    value={newItemCategory}
                    onChangeText={setNewItemCategory}
                    flex={1}
                    size="$4"
                  />
                  <Button
                    onPress={handleAddItem}
                    disabled={!newItemName.trim()}
                    size="$4"
                    paddingHorizontal="$4"
                  >
                    {t('common.add')}
                  </Button>
                </XStack>
              </TStack>
            </Card>

            {/* Items List */}
            {items.length === 0 ? (
              <Text color="$gray11" textAlign="center" marginTop="$8">
                {t('shopping.noPendingItems')}
              </Text>
            ) : (
              <TStack gap="$3">
                {items.map((item) => (
                  <Card
                    key={item.id}
                    pressStyle={{ opacity: 0.5 }}
                    paddingHorizontal="$4"
                    paddingVertical="$3"
                    backgroundColor="$gray1"
                  >
                    <XStack justifyContent="space-between" alignItems="center">
                      <TStack flex={1}>
                        <Text fontSize="$4" fontWeight="600">
                          {item.name}
                        </Text>
                        {item.category && (
                          <Text fontSize="$2" color="$gray11">
                            {item.category}
                          </Text>
                        )}
                      </TStack>
                      <Button
                        size="$3"
                        circular
                        backgroundColor="$red2"
                        onPress={() => handleDelete(item.id)}
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
