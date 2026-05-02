import React, { useRef, useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Image, Pressable, StyleSheet } from 'react-native';
import { YStack, XStack, Text, View } from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ChevronLeft } from 'lucide-react-native';
import BottomSheet from '@gorhom/bottom-sheet';

import { AddItemSheet, AddItemPrefill } from '@/features/items/AddItemSheet';
import { itemsService, photoUploadService } from '@/services';
import { useAuthIds } from '@/features/auth';
import { useDatabase } from '@/db';
import { LottiePlayer } from '@/components/ui/LottiePlayer';

export default function NewItemScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    prefillName?: string;
    prefillBarcode?: string;
    prefillPhotoPath?: string;
    prefillSource?: 'photo' | 'date' | 'barcode';
    containerId?: string;
  }>();

  const { householdId, userId } = useAuthIds();
  const db = useDatabase();
  const sheetRef = useRef<BottomSheet>(null);
  const [prefill, setPrefill] = useState<AddItemPrefill>({
    foodName: params.prefillName ?? '',
    barcode: params.prefillBarcode,
  });
  const [classifying, setClassifying] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  // When arriving from barcode scan, try Open Food Facts lookup
  useEffect(() => {
    if (params.prefillBarcode && !params.prefillName) {
      itemsService.lookupBarcode(params.prefillBarcode).then((result) => {
        if (result?.product) {
          setPrefill({
            foodName: result.product,
            barcode: params.prefillBarcode,
          });
        }
      });
    }
  }, [params.prefillBarcode, params.prefillName]);

  // Handle photo upload and AI classification
  useEffect(() => {
    if (!params.prefillPhotoPath || !householdId) return;

    const processPhoto = async () => {
      if (!householdId) return;
      setClassifying(true);
      try {
        const { photoUrl: url } = await photoUploadService.uploadPhoto(
          params.prefillPhotoPath!,
          householdId as string,
        );
        setPhotoUrl(url);

        if (params.prefillSource === 'photo') {
          const classification = await photoUploadService.classifyFood(url, householdId as string);
          if (classification.foodName) {
            setPrefill((prev) => ({
              ...prev,
              foodName: classification.foodName,
              category: classification.category as any,
              photoUrl: url,
            }));
          }
        } else if (params.prefillSource === 'date') {
          const expiryStr = await itemsService.ocrExpiryDate(householdId as string, url);
          if (expiryStr) {
            const expiryDate = new Date(expiryStr);
            const today = new Date();
            const daysUntilExpiry = Math.ceil(
              (expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
            );
            setPrefill((prev) => ({
              ...prev,
              expiryDays: Math.max(0, daysUntilExpiry),
              photoUrl: url,
            }));
          }
        }
      } catch (err) {
        console.error('[NewItemScreen] Photo processing failed:', err);
      } finally {
        setClassifying(false);
      }
    };

    processPhoto();
  }, [params.prefillPhotoPath, params.prefillSource, db, householdId]);

  // Open sheet immediately on mount
  useEffect(() => {
    const timeout = setTimeout(() => sheetRef.current?.expand(), 200);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <YStack flex={1} backgroundColor="$surface/base" paddingTop={insets.top}>
        {/* Nav bar */}
        <XStack paddingHorizontal="$4" paddingVertical="$3" alignItems="center" gap="$3">
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
          >
            <ChevronLeft size={24} color="#5C615E" aria-hidden />
          </Pressable>
          <Text fontSize={18} fontWeight="700" color="$text/primary">
            {t('items.addItem')}
          </Text>
        </XStack>

        {/* Photo preview (if from photo capture) */}
        {params.prefillPhotoPath && (
          <View
            marginHorizontal="$4"
            marginBottom="$3"
            borderRadius="$lg"
            overflow="hidden"
            height={200}
          >
            <Image
              source={{ uri: `file://${params.prefillPhotoPath}` }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
            {params.prefillSource === 'photo' && (
              <View
                position="absolute"
                bottom={8}
                left={8}
                backgroundColor="rgba(0,0,0,0.6)"
                paddingHorizontal="$3"
                paddingVertical="$1"
                borderRadius="$full"
                flexDirection="row"
                alignItems="center"
                gap={6}
              >
                {classifying && (
                  <LottiePlayer
                    source={require('~/assets/lottie/ai-processing.json')}
                    loop
                    style={styles.aiSpinner}
                  />
                )}
                <Text fontSize={12} color="white">
                  {classifying ? t('scan.classifying') : t('scan.noResultPhoto')}
                </Text>
              </View>
            )}
          </View>
        )}

        {householdId && userId && (
          <AddItemSheet
            bottomSheetRef={sheetRef}
            householdId={householdId!}
            userId={userId!}
            containerId={params.containerId}
            prefill={prefill}
            onAdded={() => router.back()}
          />
        )}
      </YStack>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  aiSpinner: {
    width: 20,
    height: 20,
  },
});
