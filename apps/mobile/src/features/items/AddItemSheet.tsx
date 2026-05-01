import React, { useState, useCallback, useEffect } from 'react';
import { ScrollView, Pressable, Platform } from 'react-native';
import { YStack, XStack, Text, View } from 'tamagui';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useTranslation } from 'react-i18next';
import { haptics } from '@/lib/haptics';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { useDatabase } from '@/db';
import { itemsService } from '@/services/ItemsService';
import { PhotoUploadService } from '@/services/PhotoUploadService';
import { useToast } from '@/lib/toast';
import { useAuthIds } from '@/features/auth';
import { router } from 'expo-router';
import { scheduleExpiryNotification } from '@/lib/notifications';
import { trackItemAdded } from '@/lib/analytics';

const STORAGE_LOCATIONS = [
  { key: 'fridge', labelKey: 'items.storageFridge', icon: 'thermometer' },
  { key: 'freezer', labelKey: 'items.storageFreezer', icon: 'snowflake' },
  { key: 'pantry', labelKey: 'items.storagePantry', icon: 'archive' },
  { key: 'counter', labelKey: 'items.storageCounter', icon: 'kitchen' },
] as const;

type StorageLocation = (typeof STORAGE_LOCATIONS)[number]['key'];

const schema = z.object({
  foodName: z.string().min(1),
  storageLocation: z.enum(['fridge', 'freezer', 'pantry', 'counter']),
  expiryDays: z.number().int().min(0).max(3650),
  quantityText: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export interface AddItemPrefill {
  foodName?: string;
  storageLocation?: StorageLocation;
  expiryDays?: number;
  quantityText?: string;
  barcode?: string;
  photoUrl?: string;
  category?: string;
}

interface AddItemSheetProps {
  bottomSheetRef: React.RefObject<BottomSheet>;
  householdId: string;
  userId: string;
  containerId?: string;
  prefill?: AddItemPrefill;
  onAdded?: (itemId: string) => void;
}

export function AddItemSheet({
  bottomSheetRef,
  householdId,
  userId,
  containerId,
  prefill,
  onAdded,
}: AddItemSheetProps) {
  const { t } = useTranslation();
  const db = useDatabase();
  const { showToast } = useToast();
  const { householdId: authHouseholdId } = useAuthIds();
  const [saving, setSaving] = useState(false);
  const [classifying, setClassifying] = useState(false);
  const [barcode, setBarcode] = useState<string | undefined>(prefill?.barcode);
  const [photoUrl, setPhotoUrl] = useState<string | undefined>(prefill?.photoUrl);
  const [photoKey, setPhotoKey] = useState<string | undefined>();

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      foodName: prefill?.foodName ?? '',
      storageLocation: prefill?.storageLocation ?? 'fridge',
      expiryDays: prefill?.expiryDays ?? 7,
      quantityText: prefill?.quantityText ?? '',
      notes: '',
    },
  });

  useEffect(() => {
    if (prefill) {
      reset({
        foodName: prefill.foodName ?? '',
        storageLocation: prefill.storageLocation ?? 'fridge',
        expiryDays: prefill.expiryDays ?? 7,
        quantityText: prefill.quantityText ?? '',
        notes: '',
      });
      setBarcode(prefill.barcode);
      setPhotoUrl(prefill.photoUrl);
    }
  }, [prefill, reset]);

  // Process photo from scan screen: upload and classify
  useEffect(() => {
    if (
      prefill?.photoUrl &&
      prefill.photoUrl.startsWith('file://') &&
      !photoKey &&
      authHouseholdId
    ) {
      (async () => {
        setClassifying(true);
        try {
          const { imageKey, photoUrl: cdnUrl, classification } = await PhotoUploadService.uploadAndClassify(
            prefill.photoUrl!,
            householdId,
          );
          setPhotoKey(imageKey);
          setPhotoUrl(cdnUrl);

          // Auto-fill form with classified data
          if (classification.foodName) {
            reset((prev) => ({
              ...prev,
              foodName: classification.foodName,
            }));
          }

          showToast(t('items.photoClassified'), { type: 'success' });
        } catch (err) {
          console.error('[AddItemSheet] Photo processing failed:', err);
          showToast(t('items.photoProcessingFailed'), { type: 'error' });
        } finally {
          setClassifying(false);
        }
      })();
    }
  }, [prefill?.photoUrl, photoKey, householdId, authHouseholdId, reset, showToast, t]);

  const onSubmit = useCallback(
    async (values: FormValues) => {
      setSaving(true);
      await haptics.medium();
      try {
        const now = Date.now();
        const item = await itemsService.createItem(db, {
          householdId,
          containerId,
          addedByUserId: userId,
          foodType: values.foodName.toLowerCase().replace(/\s+/g, '_'),
          foodName: values.foodName,
          category: prefill?.category ?? 'prepared',
          storageLocation: values.storageLocation,
          storedAt: new Date(now).toISOString(),
          storedTz: Intl.DateTimeFormat().resolvedOptions().timeZone,
          expiryAt: new Date(now + values.expiryDays * 24 * 60 * 60 * 1000).toISOString(),
          expirySource: photoKey ? 'ai' : prefill?.category ? 'ai' : barcode ? 'barcode' : 'user',
          quantityText: values.quantityText || undefined,
          notes: values.notes || undefined,
          barcode: barcode || undefined,
          photoPath: photoKey || photoUrl || undefined,
        });
        reset();
        bottomSheetRef.current?.close();
        scheduleExpiryNotification(item).catch(() => {});
        trackItemAdded(
          barcode ? 'barcode' : 'manual',
          values.foodName.toLowerCase().replace(/\s+/g, '_'),
          values.storageLocation,
        );
        onAdded?.(item.id);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        showToast(message, { type: 'error' });
        console.error('[AddItemSheet] create failed:', err);
      } finally {
        setSaving(false);
      }
    },
    [
      db,
      householdId,
      userId,
      containerId,
      onAdded,
      reset,
      bottomSheetRef,
      prefill,
      barcode,
      photoUrl,
      showToast,
    ],
  );

  const handleScanPress = useCallback(
    async (mode: 'qr' | 'barcode' | 'photo' | 'date') => {
      await haptics.selection();
      bottomSheetRef.current?.close();
      router.push({ pathname: '/scan', params: { mode } });
    },
    [bottomSheetRef],
  );

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={['60%', '90%']}
      enablePanDownToClose
      backgroundStyle={{ backgroundColor: 'transparent' }}
    >
      <BottomSheetScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }}>
        <YStack
          backgroundColor="$surface/raised"
          borderTopLeftRadius="$xl"
          borderTopRightRadius="$xl"
          padding="$5"
          gap="$4"
          accessibilityViewIsModal
        >
          {/* Header */}
          <XStack justifyContent="space-between" alignItems="center">
            <Text fontSize={20} fontWeight="700" color="$text/primary">
              {t('items.addItem')}
            </Text>
            <Pressable
              onPress={() => bottomSheetRef.current?.close()}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={t('accessibility.closeSheet')}
            >
              <Icon name="x" size={20} color="$text/secondary" accessible={false} />
            </Pressable>
          </XStack>

          {/* Quick scan shortcuts */}
          <XStack gap="$2">
            {(
              [
                { mode: 'qr' as const, labelKey: 'scan.modeQR' as const, icon: 'qrcode' },
                {
                  mode: 'barcode' as const,
                  labelKey: 'scan.modeBarcode' as const,
                  icon: 'barcode',
                },
                { mode: 'photo' as const, labelKey: 'scan.modePhoto' as const, icon: 'camera' },
                { mode: 'date' as const, labelKey: 'scan.modeDate' as const, icon: 'calendar' },
              ] as const
            ).map(({ mode, labelKey, icon }) => (
              <Pressable
                key={mode}
                onPress={() => handleScanPress(mode)}
                style={{ flex: 1 }}
                accessibilityRole="button"
                accessibilityLabel={t(labelKey)}
              >
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
                  <Text fontSize={11} color="$text/secondary" fontWeight="500">
                    {t(labelKey)}
                  </Text>
                </YStack>
              </Pressable>
            ))}
          </XStack>

          <YStack height={1} backgroundColor="$border/subtle" />

          {/* Food name */}
          <YStack gap="$2">
            <Text
              fontSize={13}
              fontWeight="600"
              color="$text/secondary"
              textTransform="uppercase"
              letterSpacing={0.4}
            >
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
                  accessibilityLabel={t('items.foodName')}
                />
              )}
            />
          </YStack>

          {/* Storage location */}
          <YStack gap="$2">
            <Text
              fontSize={13}
              fontWeight="600"
              color="$text/secondary"
              textTransform="uppercase"
              letterSpacing={0.4}
            >
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
                          await haptics.selection();
                          onChange(key);
                        }}
                        accessibilityRole="radio"
                        accessibilityLabel={t(labelKey)}
                        accessibilityState={{ checked: active }}
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
            <Text
              fontSize={13}
              fontWeight="600"
              color="$text/secondary"
              textTransform="uppercase"
              letterSpacing={0.4}
            >
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
                        await haptics.selection();
                        onChange(days);
                      }}
                      accessibilityRole="radio"
                      accessibilityLabel={t('common.daysLeft', { count: days })}
                      accessibilityState={{ checked: value === days }}
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
                          {t('common.daysLeft', { count: days })}
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
            <Text
              fontSize={13}
              fontWeight="600"
              color="$text/secondary"
              textTransform="uppercase"
              letterSpacing={0.4}
            >
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
                  accessibilityLabel={t('items.quantity')}
                />
              )}
            />
          </YStack>

          {/* Notes (optional) */}
          <YStack gap="$2">
            <Text
              fontSize={13}
              fontWeight="600"
              color="$text/secondary"
              textTransform="uppercase"
              letterSpacing={0.4}
            >
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
                  accessibilityLabel={t('items.notes')}
                />
              )}
            />
          </YStack>

          <Button variant="filled" size="lg" onPress={handleSubmit(onSubmit)} loading={saving}>
            {t('items.addItem')}
          </Button>
        </YStack>
      </BottomSheetScrollView>
    </BottomSheet>
  );
}
