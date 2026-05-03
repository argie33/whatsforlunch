import React, { useState } from 'react';
import { ScrollView, View, Pressable, Alert, TextInput } from 'react-native';
import { Text, YStack, XStack } from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Save } from 'lucide-react-native';

import { useAuthIds } from '@/features/auth';
import { useDatabase } from '@/db';
import { itemsService } from '@/services';

type StorageLocation = 'fridge' | 'freezer' | 'pantry' | 'counter';
type Category = 'dairy' | 'protein' | 'produce' | 'grain' | 'leftover' | 'sauce';

const STORAGE_OPTIONS: Array<{ label: string; value: StorageLocation; icon: string }> = [
  { label: 'Fridge', value: 'fridge', icon: '🧊' },
  { label: 'Freezer', value: 'freezer', icon: '❄️' },
  { label: 'Pantry', value: 'pantry', icon: '🥫' },
  { label: 'Counter', value: 'counter', icon: '🍞' },
];

const CATEGORY_OPTIONS: Array<{ label: string; value: Category; icon: string }> = [
  { label: 'Dairy', value: 'dairy', icon: '🥛' },
  { label: 'Protein', value: 'protein', icon: '🥩' },
  { label: 'Produce', value: 'produce', icon: '🥦' },
  { label: 'Grain', value: 'grain', icon: '🌾' },
  { label: 'Leftover', value: 'leftover', icon: '🍱' },
  { label: 'Sauce', value: 'sauce', icon: '🍅' },
];

const EXPIRY_OPTIONS: Array<{ label: string; days: number }> = [
  { label: '1 day', days: 1 },
  { label: '3 days', days: 3 },
  { label: '1 week', days: 7 },
  { label: '2 weeks', days: 14 },
  { label: '1 month', days: 30 },
  { label: 'Custom', days: 0 },
];

export default function NewItemScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const db = useDatabase();
  const { householdId, userId } = useAuthIds();

  const [foodName, setFoodName] = useState('Greek yogurt');
  const [storage, setStorage] = useState<StorageLocation>('fridge');
  const [category, setCategory] = useState<Category>('dairy');
  const [expiryDays, setExpiryDays] = useState(7);
  const [quantity, setQuantity] = useState('1 container');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!foodName.trim()) {
      Alert.alert('Required', 'Please enter a food name');
      return;
    }
    if (!householdId || !userId) {
      Alert.alert('Error', 'User information missing');
      return;
    }

    setSaving(true);
    try {
      const expiryAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString();
      await itemsService.createItem(db, {
        householdId,
        addedByUserId: userId,
        foodName: foodName.trim(),
        foodType: category,
        category,
        storageLocation: storage,
        expiryAt,
        expirySource: 'user',
        quantity,
        notes,
      });
      Alert.alert('Success', 'Item added!');
      router.back();
    } catch (err) {
      Alert.alert('Error', String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#FBFAF7' }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top,
          paddingHorizontal: 16,
          paddingBottom: insets.bottom + 60,
        }}
      >
        {/* Header */}
        <XStack
          justifyContent="space-between"
          alignItems="center"
          marginBottom={20}
          paddingVertical={12}
        >
          <Pressable onPress={() => router.back()}>
            <ChevronLeft size={24} color="#0F1411" />
          </Pressable>
          <Text fontSize={18} fontWeight="700" color="#0F1411">
            Add item
          </Text>
          <Pressable onPress={handleSave} disabled={saving}>
            <Text fontSize={16} fontWeight="800" color="#2F7D5B">
              {saving ? '...' : 'Save'}
            </Text>
          </Pressable>
        </XStack>

        {/* Capture Options */}
        <XStack gap={8} marginBottom={24}>
          {[
            { icon: '📷', label: 'AI Scan' },
            { icon: '🧾', label: 'Barcode' },
            { icon: '🗓️', label: 'Date OCR' },
          ].map((option) => (
            <Pressable key={option.label} style={{ flex: 1 }}>
              <YStack
                padding={14}
                backgroundColor="#FFFFFF"
                borderRadius={12}
                alignItems="center"
                gap={6}
              >
                <Text fontSize={28}>{option.icon}</Text>
                <Text fontSize={12} fontWeight="700" color="#0F1411">
                  {option.label}
                </Text>
              </YStack>
            </Pressable>
          ))}
        </XStack>

        {/* Food Name */}
        <YStack marginBottom={20}>
          <Text fontSize={12} fontWeight="700" color="#5C615E" marginBottom={8}>
            Food name
          </Text>
          <TextInput
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 12,
              paddingHorizontal: 14,
              paddingVertical: 12,
              fontSize: 16,
              color: '#0F1411',
              borderWidth: 1,
              borderColor: '#E8E5DE',
            }}
            placeholder="Greek yogurt"
            placeholderTextColor="#8B908D"
            value={foodName}
            onChangeText={setFoodName}
          />
        </YStack>

        {/* Storage Location */}
        <YStack marginBottom={20}>
          <Text fontSize={12} fontWeight="700" color="#5C615E" marginBottom={10}>
            Storage location
          </Text>
          <XStack gap={10} flexWrap="wrap">
            {STORAGE_OPTIONS.map((opt) => (
              <Pressable
                key={opt.value}
                onPress={() => setStorage(opt.value)}
                style={{
                  flex: 1,
                  minWidth: '48%',
                  paddingHorizontal: 12,
                  paddingVertical: 12,
                  borderRadius: 10,
                  backgroundColor: storage === opt.value ? '#2F7D5B' : '#FFFFFF',
                  borderWidth: 1,
                  borderColor: storage === opt.value ? '#2F7D5B' : '#E8E5DE',
                }}
              >
                <Text
                  textAlign="center"
                  fontSize={13}
                  fontWeight="700"
                  color={storage === opt.value ? 'white' : '#0F1411'}
                >
                  {opt.icon} {opt.label}
                </Text>
              </Pressable>
            ))}
          </XStack>
        </YStack>

        {/* Category */}
        <YStack marginBottom={20}>
          <Text fontSize={12} fontWeight="700" color="#5C615E" marginBottom={10}>
            Category
          </Text>
          <XStack gap={10} flexWrap="wrap">
            {CATEGORY_OPTIONS.map((opt) => (
              <Pressable
                key={opt.value}
                onPress={() => setCategory(opt.value)}
                style={{
                  flex: 1,
                  minWidth: '48%',
                  paddingHorizontal: 12,
                  paddingVertical: 12,
                  borderRadius: 10,
                  backgroundColor: category === opt.value ? '#2F7D5B' : '#FFFFFF',
                  borderWidth: 1,
                  borderColor: category === opt.value ? '#2F7D5B' : '#E8E5DE',
                }}
              >
                <Text
                  textAlign="center"
                  fontSize={13}
                  fontWeight="700"
                  color={category === opt.value ? 'white' : '#0F1411'}
                >
                  {opt.icon} {opt.label}
                </Text>
              </Pressable>
            ))}
          </XStack>
        </YStack>

        {/* Expiry */}
        <YStack marginBottom={20}>
          <Text fontSize={12} fontWeight="700" color="#5C615E" marginBottom={10}>
            Expires in
          </Text>
          <XStack gap={10} flexWrap="wrap">
            {EXPIRY_OPTIONS.map((opt) => (
              <Pressable
                key={opt.label}
                onPress={() => setExpiryDays(opt.days)}
                style={{
                  flex: 1,
                  minWidth: '30%',
                  paddingHorizontal: 10,
                  paddingVertical: 10,
                  borderRadius: 10,
                  backgroundColor: expiryDays === opt.days ? '#2F7D5B' : '#FFFFFF',
                  borderWidth: 1,
                  borderColor: expiryDays === opt.days ? '#2F7D5B' : '#E8E5DE',
                }}
              >
                <Text
                  textAlign="center"
                  fontSize={12}
                  fontWeight="700"
                  color={expiryDays === opt.days ? 'white' : '#0F1411'}
                >
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </XStack>
        </YStack>

        {/* Quantity */}
        <YStack marginBottom={20}>
          <Text fontSize={12} fontWeight="700" color="#5C615E" marginBottom={8}>
            Quantity
          </Text>
          <TextInput
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 12,
              paddingHorizontal: 14,
              paddingVertical: 12,
              fontSize: 16,
              color: '#0F1411',
              borderWidth: 1,
              borderColor: '#E8E5DE',
            }}
            placeholder="1 container"
            placeholderTextColor="#8B908D"
            value={quantity}
            onChangeText={setQuantity}
          />
        </YStack>

        {/* Notes */}
        <YStack marginBottom={30}>
          <Text fontSize={12} fontWeight="700" color="#5C615E" marginBottom={8}>
            Notes
          </Text>
          <TextInput
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 12,
              paddingHorizontal: 14,
              paddingVertical: 12,
              fontSize: 16,
              color: '#0F1411',
              borderWidth: 1,
              borderColor: '#E8E5DE',
              minHeight: 80,
              textAlignVertical: 'top',
            }}
            placeholder="Anything to remember?"
            placeholderTextColor="#8B908D"
            multiline
            value={notes}
            onChangeText={setNotes}
          />
        </YStack>

        {/* Buttons */}
        <Pressable
          onPress={handleSave}
          disabled={saving}
          style={{
            paddingHorizontal: 16,
            paddingVertical: 14,
            backgroundColor: '#2F7D5B',
            borderRadius: 12,
            alignItems: 'center',
            marginBottom: 12,
          }}
        >
          <Text fontSize={16} fontWeight="700" color="white">
            {saving ? 'Adding...' : 'Add to fridge'}
          </Text>
        </Pressable>

        <Pressable
          style={{
            paddingHorizontal: 16,
            paddingVertical: 14,
            backgroundColor: '#F2F0EB',
            borderRadius: 12,
            alignItems: 'center',
          }}
        >
          <Text fontSize={16} fontWeight="700" color="#0F1411">
            Save & add another
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
