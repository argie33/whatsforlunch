import React, { useState } from 'react';
import { ScrollView, View, Pressable, TextInput, Alert } from 'react-native';
import { Text, YStack, XStack } from 'tamagui';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthIds } from '@/features/auth';
import { useDatabase } from '@/db';
import { itemsService } from '@/services';
import { lightTheme } from '@/theme/tokens';

const C = lightTheme;

const STORAGE_OPTIONS = [
  { key: 'fridge', label: 'Fridge', icon: '🧊' },
  { key: 'freezer', label: 'Freezer', icon: '❄️' },
  { key: 'pantry', label: 'Pantry', icon: '🥫' },
  { key: 'counter', label: 'Counter', icon: '🍞' },
] as const;

const CATEGORY_OPTIONS = [
  { key: 'dairy', label: 'Dairy', icon: '🥛' },
  { key: 'protein', label: 'Protein', icon: '🥩' },
  { key: 'produce', label: 'Produce', icon: '🥦' },
  { key: 'grain', label: 'Grain', icon: '🌾' },
  { key: 'leftover', label: 'Leftover', icon: '🍱' },
  { key: 'sauce', label: 'Sauce', icon: '🍅' },
];

const EXPIRY_OPTIONS = [
  { days: 1, label: '1 day' },
  { days: 3, label: '3 days' },
  { days: 7, label: '1 week' },
  { days: 14, label: '2 weeks' },
  { days: 30, label: '1 month' },
  { days: null, label: 'Custom' },
];

export default function AddItemScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const db = useDatabase();
  const { householdId, userId } = useAuthIds();

  const [name, setName] = useState('');
  const [storage, setStorage] = useState<'fridge' | 'freezer' | 'pantry' | 'counter'>('fridge');
  const [category, setCategory] = useState('dairy');
  const [expiryDays, setExpiryDays] = useState<number | null>(7);
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async (addAnother = false) => {
    if (!name.trim() || !householdId || !userId) {
      Alert.alert('Error', 'Food name is required');
      return;
    }

    if (expiryDays === null) {
      Alert.alert('Error', 'Please select an expiry date');
      return;
    }

    setSaving(true);
    try {
      const expiryAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString();
      await itemsService.createItem(db, {
        householdId,
        addedByUserId: userId,
        foodName: name.trim(),
        foodType: category,
        category,
        storageLocation: storage,
        expiryAt,
        expirySource: 'user',
        quantityText: quantity || undefined,
        notes: notes || undefined,
      });

      if (addAnother) {
        setName('');
        setQuantity('');
        setNotes('');
      } else {
        router.back();
      }
    } catch (e) {
      Alert.alert('Error', String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: C['surface/base'] }}>
      {/* === Back Bar === */}
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingHorizontal: 16,
          paddingBottom: 12,
          backgroundColor: C['surface/base'],
          borderBottomWidth: 1,
          borderBottomColor: C['border/subtle'],
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
        <Text fontSize={17} fontWeight="700" color={C['text/primary']} letterSpacing={-0.2}>
          Add item
        </Text>
        <Pressable onPress={() => handleSave(false)} disabled={saving}>
          <Text
            fontSize={15}
            fontWeight="800"
            color={saving ? C['text/tertiary'] : C['brand/primary']}
          >
            Save
          </Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 22,
          paddingTop: 16,
          paddingBottom: insets.bottom + 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* === Capture Options === */}
        <XStack gap={8} marginBottom={20}>
          {[
            { icon: '📷', label: 'AI Scan' },
            { icon: '🧾', label: 'Barcode' },
            { icon: '🗓️', label: 'Date OCR' },
          ].map((option, idx) => (
            <Pressable
              key={idx}
              onPress={() => router.push('/scan' as any)}
              style={{
                flex: 1,
                backgroundColor: C['surface/raised'],
                borderRadius: 16,
                padding: 16,
                paddingVertical: 16,
                borderWidth: 1,
                borderColor: C['border/subtle'],
                alignItems: 'center',
              }}
            >
              <Text fontSize={28} marginBottom={6}>
                {option.icon}
              </Text>
              <Text fontSize={12} fontWeight="700" color={C['text/primary']}>
                {option.label}
              </Text>
            </Pressable>
          ))}
        </XStack>

        {/* === Food Name === */}
        <View style={{ marginBottom: 18 }}>
          <Text
            fontSize={11}
            fontWeight="800"
            color={C['text/secondary']}
            letterSpacing={1.5}
            textTransform="uppercase"
            marginBottom={8}
          >
            Food name
          </Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Greek yogurt"
            placeholderTextColor={C['text/tertiary']}
            style={{
              backgroundColor: C['surface/raised'],
              borderRadius: 16,
              borderWidth: 1,
              borderColor: C['border/subtle'],
              paddingHorizontal: 16,
              paddingVertical: 14,
              fontSize: 16,
              color: C['text/primary'],
            }}
          />
        </View>

        {/* === Storage Location === */}
        <View style={{ marginBottom: 18 }}>
          <Text
            fontSize={11}
            fontWeight="800"
            color={C['text/secondary']}
            letterSpacing={1.5}
            textTransform="uppercase"
            marginBottom={8}
          >
            Storage location
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {STORAGE_OPTIONS.map((option) => (
              <Pressable
                key={option.key}
                onPress={() => setStorage(option.key)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  borderRadius: 9999,
                  backgroundColor:
                    storage === option.key ? C['brand/primary'] : C['surface/raised'],
                  borderWidth: 1,
                  borderColor: storage === option.key ? C['brand/primary'] : C['border/subtle'],
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Text fontSize={14}>{option.icon}</Text>
                <Text
                  fontSize={13}
                  fontWeight="600"
                  color={storage === option.key ? 'white' : C['text/primary']}
                >
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* === Category === */}
        <View style={{ marginBottom: 18 }}>
          <Text
            fontSize={11}
            fontWeight="800"
            color={C['text/secondary']}
            letterSpacing={1.5}
            textTransform="uppercase"
            marginBottom={8}
          >
            Category
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {CATEGORY_OPTIONS.map((option) => (
              <Pressable
                key={option.key}
                onPress={() => setCategory(option.key)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  borderRadius: 9999,
                  backgroundColor:
                    category === option.key ? C['brand/primary'] : C['surface/raised'],
                  borderWidth: 1,
                  borderColor: category === option.key ? C['brand/primary'] : C['border/subtle'],
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Text fontSize={14}>{option.icon}</Text>
                <Text
                  fontSize={13}
                  fontWeight="600"
                  color={category === option.key ? 'white' : C['text/primary']}
                >
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* === Expires In === */}
        <View style={{ marginBottom: 18 }}>
          <Text
            fontSize={11}
            fontWeight="800"
            color={C['text/secondary']}
            letterSpacing={1.5}
            textTransform="uppercase"
            marginBottom={8}
          >
            Expires in
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {EXPIRY_OPTIONS.map((option) => (
              <Pressable
                key={option.days}
                onPress={() => setExpiryDays(option.days)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  borderRadius: 9999,
                  backgroundColor:
                    expiryDays === option.days ? C['brand/primary'] : C['surface/raised'],
                  borderWidth: 1,
                  borderColor: expiryDays === option.days ? C['brand/primary'] : C['border/subtle'],
                }}
              >
                <Text
                  fontSize={13}
                  fontWeight="600"
                  color={expiryDays === option.days ? 'white' : C['text/primary']}
                >
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* === Quantity === */}
        <View style={{ marginBottom: 18 }}>
          <Text
            fontSize={11}
            fontWeight="800"
            color={C['text/secondary']}
            letterSpacing={1.5}
            textTransform="uppercase"
            marginBottom={8}
          >
            Quantity
          </Text>
          <TextInput
            value={quantity}
            onChangeText={setQuantity}
            placeholder="1 container"
            placeholderTextColor={C['text/tertiary']}
            style={{
              backgroundColor: C['surface/raised'],
              borderRadius: 16,
              borderWidth: 1,
              borderColor: C['border/subtle'],
              paddingHorizontal: 16,
              paddingVertical: 14,
              fontSize: 16,
              color: C['text/primary'],
            }}
          />
        </View>

        {/* === Notes === */}
        <View style={{ marginBottom: 24 }}>
          <Text
            fontSize={11}
            fontWeight="800"
            color={C['text/secondary']}
            letterSpacing={1.5}
            textTransform="uppercase"
            marginBottom={8}
          >
            Notes
          </Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Anything to remember?"
            placeholderTextColor={C['text/tertiary']}
            style={{
              backgroundColor: C['surface/raised'],
              borderRadius: 16,
              borderWidth: 1,
              borderColor: C['border/subtle'],
              paddingHorizontal: 16,
              paddingVertical: 14,
              fontSize: 16,
              color: C['text/primary'],
            }}
          />
        </View>

        {/* === Action Buttons === */}
        <Pressable
          onPress={() => handleSave(false)}
          disabled={saving}
          style={{
            backgroundColor: C['brand/primary'],
            borderRadius: 16,
            padding: 16,
            alignItems: 'center',
            marginBottom: 8,
            shadowColor: C['brand/primary'],
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.25,
            shadowRadius: 16,
            elevation: 6,
            opacity: saving ? 0.6 : 1,
          }}
        >
          <Text fontSize={16} fontWeight="700" color="white" letterSpacing={-0.1}>
            {saving ? 'Adding...' : 'Add to fridge'}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => handleSave(true)}
          disabled={saving}
          style={{
            padding: 16,
            alignItems: 'center',
            opacity: saving ? 0.6 : 1,
          }}
        >
          <Text fontSize={15} fontWeight="700" color={C['brand/primary']}>
            Save & add another
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
