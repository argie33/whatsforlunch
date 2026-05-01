import React, { useState, useCallback, useEffect } from 'react';
import { View, ScrollView, TextInput, TouchableOpacity, Alert } from 'react-native';
import { Text, YStack } from 'tamagui';
import { Trash2, Plus, Check } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useAuthIds } from '@/features/auth';
import { getLocalToken } from '@/lib/local-auth';
import { IS_MOCK } from '@/features/auth/authService';

interface ShoppingItem {
  id: string;
  name: string;
  category?: string;
  purchasedAt?: string;
}

const API_URL = process.env['EXPO_PUBLIC_APPSYNC_URL'] ?? 'http://localhost:4000/graphql';

async function graphQLCall(query: string, variables: Record<string, any>) {
  const token = await getLocalToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(API_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const json = await res.json();
  if (json.errors?.length) throw new Error(json.errors[0]?.message ?? 'GraphQL error');

  return json.data;
}

export default function ShoppingListScreen() {
  const { t } = useTranslation();
  const { householdId } = useAuthIds();
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);

  const loadItems = useCallback(async () => {
    if (!householdId || IS_MOCK) return;

    setLoading(true);
    try {
      const query = `
        query ListShoppingItems($householdId: ID!) {
          listShoppingItems(householdId: $householdId) {
            id name category purchasedAt
          }
        }
      `;
      const data = await graphQLCall(query, { householdId });
      const pending = (data?.listShoppingItems || []).filter((i: ShoppingItem) => !i.purchasedAt);
      setItems(pending);
    } catch (e) {
      console.error('Failed to load shopping items:', e);
    } finally {
      setLoading(false);
    }
  }, [householdId]);

  useEffect(() => {
    loadItems();
    const interval = setInterval(loadItems, 10000);
    return () => clearInterval(interval);
  }, [loadItems]);

  const handleAdd = async () => {
    if (!newName.trim() || !householdId) {
      Alert.alert('Error', 'Enter an item name');
      return;
    }

    setAdding(true);
    try {
      const mutation = `
        mutation AddShoppingItem($input: AddShoppingListItemInput!) {
          addShoppingListItem(input: $input) {
            id name category
          }
        }
      `;
      const data = await graphQLCall(mutation, {
        input: {
          householdId,
          name: newName,
          category: 'other',
          addedByUserId: 'user-1',
        },
      });

      if (data?.addShoppingListItem) {
        setItems([...items, data.addShoppingListItem]);
        setNewName('');
        Alert.alert('Success', 'Item added to shopping list');
      }
    } catch (e) {
      Alert.alert('Error', String(e));
    } finally {
      setAdding(false);
    }
  };

  const handleMark = async (itemId: string) => {
    if (!householdId) return;

    try {
      const mutation = `
        mutation MarkPurchased($householdId: ID!, $id: ID!) {
          markShoppingItemPurchased(householdId: $householdId, id: $id)
        }
      `;
      await graphQLCall(mutation, { householdId, id: itemId });
      setItems(items.filter((i) => i.id !== itemId));
      Alert.alert('Success', 'Item marked as purchased');
    } catch (e) {
      Alert.alert('Error', String(e));
    }
  };

  const handleDelete = async (itemId: string) => {
    if (!householdId) return;

    Alert.alert('Delete?', 'Remove this item from the list', [
      { text: 'Cancel' },
      {
        text: 'Delete',
        onPress: async () => {
          try {
            const mutation = `
              mutation DeleteShoppingItem($householdId: ID!, $id: ID!) {
                deleteShoppingItem(householdId: $householdId, id: $id)
              }
            `;
            await graphQLCall(mutation, { householdId, id: itemId });
            setItems(items.filter((i) => i.id !== itemId));
            Alert.alert('Success', 'Item deleted');
          } catch (e) {
            Alert.alert('Error', String(e));
          }
        },
      },
    ]);
  };

  if (IS_MOCK) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>App is in MOCK mode. Set EXPO_PUBLIC_AUTH_MODE=local to use API.</Text>
      </View>
    );
  }

  return (
    <YStack flex={1} backgroundColor="$background">
      {/* Header */}
      <View style={{ paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 }}>
        <Text fontSize={24} fontWeight="bold">
          Shopping List
        </Text>
        <Text fontSize={14} color="$textTertiary">
          {items.length} items to buy
        </Text>
      </View>

      {/* Items List */}
      <ScrollView style={{ flex: 1, paddingHorizontal: 16 }}>
        {loading ? (
          <Text style={{ marginTop: 20, textAlign: 'center' }}>Loading...</Text>
        ) : items.length === 0 ? (
          <View style={{ marginTop: 40, alignItems: 'center' }}>
            <Text fontSize={16} color="$textSecondary">
              No items to buy
            </Text>
            <Text fontSize={14} color="$textTertiary" marginTop={8}>
              Add items below
            </Text>
          </View>
        ) : (
          items.map((item) => (
            <View
              key={item.id}
              style={{
                marginVertical: 8,
                padding: 12,
                backgroundColor: '#f5f5f5',
                borderRadius: 8,
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Text fontWeight="600" flex={1}>
                {item.name}
              </Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity onPress={() => handleMark(item.id)} style={{ padding: 8 }}>
                  <Check size={20} color="green" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(item.id)} style={{ padding: 8 }}>
                  <Trash2 size={20} color="red" />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Add Item Form */}
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: 'white',
          padding: 16,
          borderTopWidth: 1,
        }}
      >
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <TextInput
            placeholder="Add to shopping list..."
            value={newName}
            onChangeText={setNewName}
            style={{
              flex: 1,
              borderWidth: 1,
              borderColor: '#ddd',
              borderRadius: 8,
              padding: 10,
            }}
          />
          <TouchableOpacity
            onPress={handleAdd}
            disabled={adding}
            style={{
              width: 48,
              height: 48,
              borderRadius: 8,
              backgroundColor: '#2F7D5B',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Plus size={24} color="white" />
          </TouchableOpacity>
        </View>
      </View>
    </YStack>
  );
}
