import React, { useEffect, useState, useCallback } from 'react';
import { ScrollView, Pressable, TextInput as RNTextInput, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { YStack, XStack, Text, View } from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useLocalSearchParams, router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { ChevronLeft, Minus, Plus } from 'lucide-react-native';

import { useDatabase } from '@/db';
import { ItemRepository } from '@/db/repositories/ItemRepository';
import type { Item } from '@/db/models/Item';
import { writeQueue } from '@/db/queue';
import { scheduleExpiryNotification, cancelExpiryNotification } from '@/lib/notifications';
import { Button } from '@/components/ui/Button';

const STORAGE_LOCATIONS = [
  { key: 'fridge', label: 'Fridge' },
  { key: 'freezer', label: 'Freezer' },
  { key: 'pantry', label: 'Pantry' },
  { key: 'counter', label: 'Counter' },
] as const;

type StorageLocation = typeof STORAGE_LOCATIONS[number]['key'];

export default function EditItemScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const db = useDatabase();
  const insets = useSafeAreaInsets();

  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [foodName, setFoodName] = useState('');
  const [storageLocation, setStorageLocation] = useState<StorageLocation>('fridge');
  const [expiryAt, setExpiryAt] = useState(Date.now() + 7 * 86400000);
  const [quantityText, setQuantityText] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!id) return;
    const repo = new ItemRepository(db);
    repo.findById(id).then((found) => {
      if (!found) { router.back(); return; }
      setItem(found);
      setFoodName(found.foodName);
      setStorageLocation(found.storageLocation as StorageLocation);
      setExpiryAt(found.expiryAt);
      setQuantityText(found.quantityText ?? '');
      setNotes(found.notes ?? '');
      setLoading(false);
    });
  }, [id, db]);

  const adjustExpiry = useCallback(async (days: number) => {
    await Haptics.selectionAsync();
    setExpiryAt((prev) => Math.max(Date.now(), prev + days * 86400000));
  }, []);

  const handleSave = useCallback(async () => {
    if (!item || saving) return;
    if (!foodName.trim()) return;
    setSaving(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const repo = new ItemRepository(db);
      await repo.update(item, {
        foodName: foodName.trim(),
        foodType: foodName.trim().toLowerCase().replace(/\s+/g, '_'),
        storageLocation,
        expiryAt,
        quantityText: quantityText.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      writeQueue.enqueue({
        type: 'updateItem',
        localId: item.id,
        cloudId: item.cloudId,
        householdId: item.householdId,
        payload: {
          id: item.cloudId,
          householdId: item.householdId,
          foodName: foodName.trim(),
          storageLocation,
          expiryAt: new Date(expiryAt).toISOString(),
          quantityText: quantityText.trim() || null,
          notes: notes.trim() || null,
        },
      });
      cancelExpiryNotification(item.id).catch(() => {});
      scheduleExpiryNotification({ ...item, expiryAt } as Item).catch(() => {});
      router.back();
    } catch (err) {
      console.error('[EditItem] save failed:', err);
    } finally {
      setSaving(false);
    }
  }, [item, saving, foodName, storageLocation, expiryAt, quantityText, notes, db]);

  if (loading || !item) {
    return (
      <YStack flex={1} backgroundColor="$surface/base" justifyContent="center" alignItems="center">
        <Text color="$text/tertiary">{t('common.loading')}</Text>
      </YStack>
    );
  }

  const expiryDate = new Date(expiryAt).toLocaleDateString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric',
  });
  const daysLeft = Math.round((expiryAt - Date.now()) / 86400000);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View flex={1} backgroundColor="$surface/base">
        {/* Header */}
        <XStack
          paddingTop={insets.top + 8}
          paddingHorizontal="$4"
          paddingBottom="$3"
          backgroundColor="$surface/raised"
          borderBottomWidth={1}
          borderBottomColor="$border/subtle"
          alignItems="center"
          gap="$3"
        >
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <ChevronLeft size={24} color="#2F7D5B" />
          </Pressable>
          <Text flex={1} fontSize={17} fontWeight="600" color="$text/primary">
            {t('items.editItem')}
          </Text>
          <Pressable onPress={handleSave} disabled={saving || !foodName.trim()} hitSlop={8}>
            <Text
              fontSize={16}
              fontWeight="600"
              color={foodName.trim() ? '$brand/primary' : '$text/tertiary'}
            >
              {t('common.save')}
            </Text>
          </Pressable>
        </XStack>

        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40 }}>
          {/* Food name */}
          <YStack gap="$2" marginBottom="$4">
            <Text fontSize={13} fontWeight="600" color="$text/secondary" textTransform="uppercase" letterSpacing={0.4}>
              {t('items.foodName')}
            </Text>
            <RNTextInput
              style={[styles.input, { color: '#1A1F1C' }]}
              value={foodName}
              onChangeText={setFoodName}
              placeholder={t('items.foodPlaceholder')}
              placeholderTextColor="#8A8E8C"
              autoCapitalize="words"
              returnKeyType="next"
            />
          </YStack>

          {/* Storage location */}
          <YStack gap="$2" marginBottom="$4">
            <Text fontSize={13} fontWeight="600" color="$text/secondary" textTransform="uppercase" letterSpacing={0.4}>
              {t('items.storageLocation')}
            </Text>
            <XStack gap="$2" flexWrap="wrap">
              {STORAGE_LOCATIONS.map(({ key, label }) => {
                const active = storageLocation === key;
                return (
                  <Pressable
                    key={key}
                    onPress={async () => {
                      await Haptics.selectionAsync();
                      setStorageLocation(key);
                    }}
                  >
                    <XStack
                      paddingHorizontal="$3"
                      paddingVertical="$2"
                      borderRadius="$full"
                      borderWidth={active ? 0 : 1}
                      borderColor="$border/subtle"
                      backgroundColor={active ? '$brand/primary' : '$surface/sunken'}
                    >
                      <Text
                        fontSize={14}
                        fontWeight={active ? '600' : '400'}
                        color={active ? 'white' : '$text/secondary'}
                      >
                        {label}
                      </Text>
                    </XStack>
                  </Pressable>
                );
              })}
            </XStack>
          </YStack>

          {/* Expiry date stepper */}
          <YStack gap="$2" marginBottom="$4">
            <Text fontSize={13} fontWeight="600" color="$text/secondary" textTransform="uppercase" letterSpacing={0.4}>
              {t('items.expiryDate')}
            </Text>
            <XStack
              backgroundColor="$surface/raised"
              borderRadius="$md"
              borderWidth={1}
              borderColor="$border/subtle"
              padding="$4"
              alignItems="center"
              justifyContent="space-between"
            >
              <Pressable
                onPress={() => adjustExpiry(-1)}
                style={styles.stepperBtn}
                hitSlop={8}
              >
                <Minus size={18} color="#2F7D5B" />
              </Pressable>

              <YStack alignItems="center" gap="$1">
                <Text fontSize={18} fontWeight="700" color="$text/primary">{expiryDate}</Text>
                <Text fontSize={13} color="$text/secondary">
                  {daysLeft === 0
                    ? 'Today'
                    : daysLeft === 1
                    ? 'Tomorrow'
                    : daysLeft > 0
                    ? `In ${daysLeft} days`
                    : `${Math.abs(daysLeft)} days ago`}
                </Text>
              </YStack>

              <Pressable
                onPress={() => adjustExpiry(1)}
                style={styles.stepperBtn}
                hitSlop={8}
              >
                <Plus size={18} color="#2F7D5B" />
              </Pressable>
            </XStack>

            {/* Quick presets */}
            <XStack gap="$2" marginTop="$1">
              {[1, 3, 7, 14, 30].map((d) => (
                <Pressable
                  key={d}
                  onPress={async () => {
                    await Haptics.selectionAsync();
                    setExpiryAt(Date.now() + d * 86400000);
                  }}
                >
                  <YStack
                    paddingHorizontal="$2"
                    paddingVertical="$1"
                    borderRadius="$full"
                    borderWidth={1}
                    borderColor="$border/subtle"
                    backgroundColor="$surface/sunken"
                  >
                    <Text fontSize={12} color="$text/secondary">{d}d</Text>
                  </YStack>
                </Pressable>
              ))}
            </XStack>
          </YStack>

          {/* Quantity */}
          <YStack gap="$2" marginBottom="$4">
            <Text fontSize={13} fontWeight="600" color="$text/secondary" textTransform="uppercase" letterSpacing={0.4}>
              {t('items.quantity')} <Text fontSize={12} color="$text/tertiary">({t('common.optional')})</Text>
            </Text>
            <RNTextInput
              style={[styles.input, { color: '#1A1F1C' }]}
              value={quantityText}
              onChangeText={setQuantityText}
              placeholder={t('items.quantityPlaceholder')}
              placeholderTextColor="#8A8E8C"
              returnKeyType="next"
            />
          </YStack>

          {/* Notes */}
          <YStack gap="$2" marginBottom="$6">
            <Text fontSize={13} fontWeight="600" color="$text/secondary" textTransform="uppercase" letterSpacing={0.4}>
              {t('items.notes')} <Text fontSize={12} color="$text/tertiary">({t('common.optional')})</Text>
            </Text>
            <RNTextInput
              style={[styles.input, styles.multiline, { color: '#1A1F1C' }]}
              value={notes}
              onChangeText={setNotes}
              placeholder={t('items.notesPlaceholder')}
              placeholderTextColor="#8A8E8C"
              multiline
              numberOfLines={3}
              returnKeyType="done"
              textAlignVertical="top"
            />
          </YStack>

          <Button variant="filled" size="lg" onPress={handleSave} loading={saving}>
            {t('common.save')}
          </Button>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: '#F5F4F0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E6E5E0',
  },
  multiline: {
    paddingTop: 12,
    minHeight: 80,
  },
  stepperBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EEF7F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
