import React, { useState } from 'react';
import { YStack, Text } from 'tamagui';
import { ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { TopBar, Button, Input } from '@/components/ui';
import { lightTheme } from '@/theme/tokens';

const C = lightTheme;

export default function AddItemScreen() {
  const router = useRouter();
  const [itemName, setItemName] = useState('');
  const [foodType, setFoodType] = useState('produce');
  const [container, setContainer] = useState('fridge');
  const [addedDate, setAddedDate] = useState(new Date().toISOString().split('T')[0]);
  const [expiryDate, setExpiryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleAddItem = async () => {
    if (!itemName.trim() || !expiryDate) {
      return;
    }

    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      router.back();
    }, 800);
  };

  const isValid = itemName.trim().length > 0 && expiryDate.length > 0;

  return (
    <YStack flex={1} backgroundColor={C['surface/base']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Top Bar */}
        <TopBar title="Add Item" subtitle="What do you have?" />

        {/* Form */}
        <YStack paddingHorizontal={22} paddingTop={24} gap={20}>
          {/* Item Name */}
          <YStack gap={8}>
            <Text fontSize={14} fontWeight="600" color={C['text/secondary']}>
              Item name *
            </Text>
            <Input
              placeholder="e.g., Lettuce, Milk, Eggs"
              value={itemName}
              onChangeText={setItemName}
              placeholderTextColor={C['text/tertiary']}
            />
          </YStack>

          {/* Food Type */}
          <YStack gap={8}>
            <Text fontSize={14} fontWeight="600" color={C['text/secondary']}>
              Food type
            </Text>
            <Input
              placeholder="e.g., Produce, Dairy, Meat"
              value={foodType}
              onChangeText={setFoodType}
              placeholderTextColor={C['text/tertiary']}
            />
          </YStack>

          {/* Container */}
          <YStack gap={8}>
            <Text fontSize={14} fontWeight="600" color={C['text/secondary']}>
              Storage location
            </Text>
            <Input
              placeholder="e.g., Fridge, Freezer, Pantry"
              value={container}
              onChangeText={setContainer}
              placeholderTextColor={C['text/tertiary']}
            />
          </YStack>

          {/* Added Date */}
          <YStack gap={8}>
            <Text fontSize={14} fontWeight="600" color={C['text/secondary']}>
              Date added
            </Text>
            <Input
              placeholder="YYYY-MM-DD"
              value={addedDate}
              onChangeText={setAddedDate}
              placeholderTextColor={C['text/tertiary']}
            />
          </YStack>

          {/* Expiry Date */}
          <YStack gap={8}>
            <Text fontSize={14} fontWeight="600" color={C['text/secondary']}>
              Expiry date *
            </Text>
            <Input
              placeholder="YYYY-MM-DD"
              value={expiryDate}
              onChangeText={setExpiryDate}
              placeholderTextColor={C['text/tertiary']}
            />
          </YStack>

          {/* Notes */}
          <YStack gap={8}>
            <Text fontSize={14} fontWeight="600" color={C['text/secondary']}>
              Notes
            </Text>
            <Input
              placeholder="Any special notes..."
              value={notes}
              onChangeText={setNotes}
              placeholderTextColor={C['text/tertiary']}
              multiline
            />
          </YStack>

          {/* Action Buttons */}
          <YStack gap={12} paddingTop={12}>
            <Button
              variant="primary"
              size="lg"
              full
              onPress={handleAddItem}
              disabled={!isValid || isLoading}
              loading={isLoading}
            >
              Add Item
            </Button>

            <Button
              variant="secondary"
              size="lg"
              full
              onPress={() => router.back()}
              disabled={isLoading}
            >
              Cancel
            </Button>
          </YStack>

          {/* Scan Barcode */}
          <Text
            fontSize={14}
            color={C['brand/primary']}
            fontWeight="600"
            textAlign="center"
            onPress={() => {}}
          >
            📱 Scan barcode instead
          </Text>
        </YStack>
      </ScrollView>
    </YStack>
  );
}
