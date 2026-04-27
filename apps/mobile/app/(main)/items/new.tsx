import React, { useRef, useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Image, Pressable } from 'react-native';
import { YStack, XStack, Text, View } from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ChevronLeft } from 'lucide-react-native';
import BottomSheet from '@gorhom/bottom-sheet';

import { AddItemSheet, AddItemPrefill } from '@/features/items/AddItemSheet';
import { itemsService } from '@/services/ItemsService';
import { useAuthIds } from '@/features/auth';

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

  const sheetRef = useRef<BottomSheet>(null);
  const [prefill, setPrefill] = useState<AddItemPrefill>({
    foodName: params.prefillName ?? '',
    barcode: params.prefillBarcode,
  });
  const [classifying, setClassifying] = useState(false);

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
      <YStack
        flex={1}
        backgroundColor="$surface/base"
        paddingTop={insets.top}
      >
        {/* Nav bar */}
        <XStack paddingHorizontal="$4" paddingVertical="$3" alignItems="center" gap="$3">
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <ChevronLeft size={24} color="#5C615E" />
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
              >
                <Text fontSize={12} color="white">
                  {classifying ? t('scan.classifying') : t('scan.noResultPhoto')}
                </Text>
              </View>
            )}
          </View>
        )}

        <AddItemSheet
          bottomSheetRef={sheetRef}
          householdId={PLACEHOLDER_HOUSEHOLD}
          userId={PLACEHOLDER_USER}
          containerId={params.containerId}
          prefill={prefill}
          onAdded={() => router.back()}
        />
      </YStack>
    </KeyboardAvoidingView>
  );
}
