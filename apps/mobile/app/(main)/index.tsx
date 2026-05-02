import React, { useState, useCallback } from 'react';
import { View, ScrollView, TextInput, TouchableOpacity, Alert } from 'react-native';
import { Text, YStack, XStack } from 'tamagui';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2 } from 'lucide-react-native';

import { useAuthIds } from '@/features/auth';
import { useLocalAPIItems } from '@/hooks/useLocalAPIItems';
import { createItemOnAPI, deleteItemFromAPI } from '@/lib/local-api-client';
import { IS_MOCK } from '@/features/auth/authService';

export default function WorkingDashboard() {
  const { t } = useTranslation();
  const { householdId } = useAuthIds();
  const { items, loading, refresh } = useLocalAPIItems(householdId);

  const [showAddForm, setShowAddForm] = useState(false);
  const [foodName, setFoodName] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [storage, setStorage] = useState('fridge');
  const [category, setCategory] = useState('vegetable');
  const [adding, setAdding] = useState(false);

  const handleAddItem = async () => {
    if (!foodName.trim() || !householdId) {
      Alert.alert('Error', 'Please enter a food name');
      return;
    }

    setAdding(true);
    try {
      const expiryAt = expiryDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      await createItemOnAPI({
        householdId,
        foodName,
        category: (category as any) || 'vegetable',
        storageLocation: (storage as any) || 'fridge',
        expiryAt,
      });

      setFoodName('');
      setExpiryDate('');
      setStorage('fridge');
      setCategory('vegetable');
      setShowAddForm(false);

      await refresh();
      Alert.alert('Success', 'Item added!');
    } catch (e) {
      Alert.alert('Error', String(e));
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!householdId) return;

    Alert.alert('Delete Item?', 'This cannot be undone', [
      { text: 'Cancel', onPress: () => {} },
      {
        text: 'Delete',
        onPress: async () => {
          try {
            await deleteItemFromAPI(householdId, itemId);
            await refresh();
            Alert.alert('Success', 'Item deleted');
          } catch (e) {
            Alert.alert('Error', String(e));
          }
        },
      },
    ]);
  };

  return (
    <YStack flex={1} backgroundColor="$background">
      {/* Header */}
      <View style={{ paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 }}>
        <Text fontSize={24} fontWeight="bold">
          My Items
        </Text>
        <Text fontSize={14} color="$textTertiary">
          {items.length} items
        </Text>
      </View>

      {/* Items List */}
      <ScrollView style={{ flex: 1, paddingHorizontal: 16 }}>
        {loading ? (
          <Text style={{ marginTop: 20, textAlign: 'center' }}>Loading...</Text>
        ) : items.length === 0 ? (
          <View style={{ marginTop: 40, alignItems: 'center' }}>
            <Text fontSize={16} color="$textSecondary">
              No items yet
            </Text>
            <Text fontSize={14} color="$textTertiary" marginTop={8}>
              Add your first item to get started
            </Text>
          </View>
        ) : (
          items.map((item: any) => (
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
              <View style={{ flex: 1 }}>
                <Text fontWeight="600">{item.foodName}</Text>
                <Text fontSize={12} color="$textTertiary">
                  📍 {item.storageLocation}
                </Text>
                {item.expiryAt && (
                  <Text fontSize={12} color="$textTertiary">
                    Expires: {new Date(item.expiryAt).toLocaleDateString()}
                  </Text>
                )}
              </View>
              <TouchableOpacity
                onPress={() => handleDeleteItem(item.id)}
                style={{ padding: 8 }}
              >
                <Trash2 size={20} color="red" />
              </TouchableOpacity>
            </View>
          ))
        )}
        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Add Item Button */}
      <TouchableOpacity
        onPress={() => setShowAddForm(!showAddForm)}
        style={{
          position: 'absolute',
          bottom: 20,
          right: 20,
          width: 60,
          height: 60,
          borderRadius: 30,
          backgroundColor: '#2F7D5B',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Plus size={30} color="white" />
      </TouchableOpacity>

      {/* Add Item Form */}
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
          }}
        >
          <Text fontSize={18} fontWeight="bold" marginBottom={12}>
            Add Item
          </Text>

          <TextInput
            placeholder="Food name"
            value={foodName}
            onChangeText={setFoodName}
            style={{
              borderWidth: 1,
              borderColor: '#ddd',
              borderRadius: 8,
              padding: 10,
              marginBottom: 12,
            }}
          />

          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
            {['fridge', 'freezer', 'pantry'].map((loc) => (
              <TouchableOpacity
                key={loc}
                onPress={() => setStorage(loc)}
                style={{
                  flex: 1,
                  padding: 10,
                  borderRadius: 8,
                  backgroundColor: storage === loc ? '#2F7D5B' : '#f0f0f0',
                }}
              >
                <Text
                  textAlign="center"
                  color={storage === loc ? 'white' : 'black'}
                  fontWeight={storage === loc ? '600' : '400'}
                >
                  {loc}
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
              {adding ? 'Adding...' : 'Add Item'}
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
              Cancel
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </YStack>
  );
}
