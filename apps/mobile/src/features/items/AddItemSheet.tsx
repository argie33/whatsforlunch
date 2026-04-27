import React, { useState, useCallback } from 'react';
import { ScrollView, Pressable, Platform } from 'react-native';
import { YStack, XStack, Text, View } from 'tamagui';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { useDatabase } from '@/db';
import { ItemRepository } from '@/db/repositories/ItemRepository';
import { router } from 'expo-router';

const STORAGE_LOCATIONS = [
  { key: 'fridge', labelKey: 'items.storageFridge', icon: 'thermometer' },
  { key: 'freezer', labelKey: 'items.storageFreezer', icon: 'snowflake' },
  { key: 'pantry', labelKey: 'items.storagePantry', icon: 'archive' },
  { key: 'counter', labelKey: 'items.storageCounter', icon: 'kitchen' },
] as const;

type StorageLocation = typeof STORAGE_LOCATIONS[number]['key'];

const schema = z.object({
  foodName: z.string().min(1),
  storageLocation: z.enum(['fridge', 'freezer', 'pantry', 'counter']),
  expiryDays: z.number().int().min(0).max(3650),
  quantityText: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface AddItemSheetProps {
  bottomSheetRef: React.RefObject<BottomSheet>;
  householdId: string;
  userId: string;
  containerId?: string;
  onAdded?: (itemId: string) => void;
}

export function AddItemSheet({
  bottomSheetRef,
  householdId,
  userId,
  containerId,
  onAdded,
}: AddItemSheetProps) {
  const { t } = useTranslation();
  const db = useDatabase();
  const [saving, setSaving] = useState(false);

  const { control, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      foodName: '',
      storageLocation: 'fridge',
      expiryDays: 7,
      quantityText: '',
      notes: '',
    },
  });

  const onSubmit = useCallback(async (values: FormValues) => {
    setSaving(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const repo = new ItemRepository(db);
      const now = Date.now();
      const item = await repo.create({
        householdId,
        containerId,
        addedByUserId: userId,
        foodType: values.foodName.toLowerCase().replace(/\s+/g, '_'),
        foodName: values.foodName,
        category: 'prepared',
        storageLocation: values.storageLocation,
        storedAt: now,
        storedTz: Intl.DateTimeFormat().resolvedOptions().timeZone,
        expiryAt: now + values.expiryDays * 24 * 60 * 60 * 1000,
        expirySource: 'user',
        quantityText: values.quantityText || undefined,
        notes: values.notes || undefined,
      });
      reset();
      bottomSheetRef.current?.close();
      onAdded?.(item.id);
    } catch (err) {
      console.error('[AddItemSheet] create failed:', err);
    } finally {
      setSaving(false);
    }
  }, [db, householdId, userId, containerId, onAdded, reset, bottomSheetRef]);

  const handleScanPress = useCallback(async (mode: 'qr' | 'barcode' | 'photo' | 'date') => {
    await Haptics.selectionAsync();
    bottomSheetRef.current?.close();
    router.push({ pathname: '/scan', params: { mode } });
  }, [bottomSheetRef]);

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={['60%', '90%']}
      enablePanDownToClose
      backgroundStyle={{ backgroundColor: 'transparent' }}
    >
      <BottomSheetScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <YStack
          backgroundColor="$surface/raised"
          borderTopLeftRadius="$xl"
          borderTopRightRadius="$xl"
          padding="$5"
          gap="$4"
        >
          {/* Header */}
          <XStack justifyContent="space-between" alignItems="center">
            <Text fontSize={20} fontWeight="700" color="$text/primary">
              {t('items.addItem')}
            </Text>
            <Pressable onPress={() => bottomSheetRef.current?.close()} hitSlop={12}>
              <Icon name="x" size={20} color="$text/secondary" />
            </Pressable>
          </XStack>

          {/* Quick scan shortcuts */}
          <XStack gap="$2">
            {([
              { mode: 'qr' as const, label: 'QR', icon: 'qrcode' },
              { mode: 'barcode' as const, label: 'Barcode', icon: 'barcode' },
              { mode: 'photo' as const, label: 'Photo', icon: 'camera' },
              { mode: 'date' as const, label: 'Date', icon: 'calendar' },
            ] as const).map(({ mode, label, icon }) => (
              <Pressable key={mode} onPress={() => handleScanPress(mode)} style={{ flex: 1 }}>
                <YStack
                  alignItems="center"
                  gap="$1"
                  paddingVertical="$2"
                  borderWidth={1}
                  borderColor="$border/subtle"
                  borderRadius="$md"
                  backgroundColor="$surface/sunken"
                >
                  <Icon name={icon} size={18} color="$brand/primary" />
                  <Text fontSize={11} color="$text/secondary" fontWeight="500">{label}</Text>
                </YStack>
              </Pressable>
            ))}
          </XStack>

          <YStack height={1} backgroundColor="$border/subtle" />

          {/* Food name */}
          <YStack gap="$2">
            <Text fontSize={13} fontWeight="600" color="$text/secondary" textTransform="uppercase" letterSpacing={0.4}>
              {t('items.foodName')}
            </Text>
            <Controller
              control={control}
              name="foodName"
              render={({ field: { onChange, value } }) => (
                <Input
                  placeholder={t('items.foodPlaceholder')}
                  value={value}
                  onChangeText={onChange}
                  autoFocus
                  returnKeyType="next"
                />
              )}
            />
          </YStack>

          {/* Storage location */}
          <YStack gap="$2">
            <Text fontSize={13} fontWeight="600" color="$text/secondary" textTransform="uppercase" letterSpacing={0.4}>
              {t('items.storageLocation')}
            </Text>
            <Controller
              control={control}
              name="storageLocation"
              render={({ field: { onChange, value } }) => (
                <XStack gap="$2" flexWrap="wrap">
                  {STORAGE_LOCATIONS.map(({ key, labelKey }) => {
                    const active = value === key;
                    return (
                      <Pressable
                        key={key}
                        onPress={async () => {
                          await Haptics.selectionAsync();
                          onChange(key);
                        }}
                      >
                        <XStack
                          paddingHorizontal="$3"
                          paddingVertical="$2"
                          borderRadius="$full"
                          borderWidth={active ? 0 : 1}
                          borderColor="$border/subtle"
                          backgroundColor={active ? '$brand/primary' : '$surface/sunken'}
                          alignItems="center"
                          gap="$1"
                        >
                          <Text
                            fontSize={14}
                            fontWeight={active ? '600' : '400'}
                            color={active ? 'white' : '$text/secondary'}
                          >
                            {t(labelKey)}
                          </Text>
                        </XStack>
                      </Pressable>
                    );
                  })}
                </XStack>
              )}
            />
          </YStack>

          {/* Expiry days */}
          <YStack gap="$2">
            <Text fontSize={13} fontWeight="600" color="$text/secondary" textTransform="uppercase" letterSpacing={0.4}>
              {t('items.expiryDate')}
            </Text>
            <Controller
              control={control}
              name="expiryDays"
              render={({ field: { onChange, value } }) => (
                <XStack gap="$2" alignItems="center" flexWrap="wrap">
                  {[1, 3, 7, 14, 30].map((days) => (
                    <Pressable
                      key={days}
                      onPress={async () => {
                        await Haptics.selectionAsync();
                        onChange(days);
                      }}
                    >
                      <YStack
                        paddingHorizontal="$3"
                        paddingVertical="$2"
                        borderRadius="$full"
                        borderWidth={value === days ? 0 : 1}
                        borderColor="$border/subtle"
                        backgroundColor={value === days ? '$brand/primary' : '$surface/sunken'}
                        alignItems="center"
                      >
                        <Text
                          fontSize={14}
                          fontWeight={value === days ? '600' : '400'}
                          color={value === days ? 'white' : '$text/secondary'}
                        >
                          {days === 1 ? '1 day' : `${days} days`}
                        </Text>
                      </YStack>
                    </Pressable>
                  ))}
                </XStack>
              )}
            />
          </YStack>

          {/* Quantity (optional) */}
          <YStack gap="$2">
            <Text fontSize={13} fontWeight="600" color="$text/secondary" textTransform="uppercase" letterSpacing={0.4}>
              {t('items.quantity')}
            </Text>
            <Controller
              control={control}
              name="quantityText"
              render={({ field: { onChange, value } }) => (
                <Input
                  placeholder={t('items.quantityPlaceholder')}
                  value={value ?? ''}
                  onChangeText={onChange}
                  returnKeyType="next"
                />
              )}
            />
          </YStack>

          {/* Notes (optional) */}
          <YStack gap="$2">
            <Text fontSize={13} fontWeight="600" color="$text/secondary" textTransform="uppercase" letterSpacing={0.4}>
              {t('items.notes')}
            </Text>
            <Controller
              control={control}
              name="notes"
              render={({ field: { onChange, value } }) => (
                <Input
                  placeholder={t('items.notesPlaceholder')}
                  value={value ?? ''}
                  onChangeText={onChange}
                  multiline
                  numberOfLines={3}
                  returnKeyType="done"
                />
              )}
            />
          </YStack>

          <Button
            variant="filled"
            size="lg"
            onPress={handleSubmit(onSubmit)}
            loading={saving}
          >
            {t('items.addItem')}
          </Button>
        </YStack>
      </BottomSheetScrollView>
    </BottomSheet>
  );
}
