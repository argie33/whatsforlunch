import React, { useRef, useState, useCallback } from 'react';
import { Dimensions, FlatList, Pressable, ViewToken } from 'react-native';
import { YStack, XStack, Text, View } from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { haptics } from '@/lib/haptics';
import { MMKV } from 'react-native-mmkv';
import * as Notifications from 'expo-notifications';
import { Camera } from 'react-native-vision-camera';

import { IllustrationPlaceholder } from '@/components/ui/IllustrationPlaceholder';
import { Button } from '@/components/ui/Button';
import { trackOnboardingSlide } from '@/lib/analytics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const storage = new MMKV({ id: 'wfl.app' });

const SLIDES = [
  { key: '1', illustration: 'onboarding-1' as const },
  { key: '2', illustration: 'onboarding-2' as const },
  { key: '3', illustration: 'onboarding-3' as const },
  { key: '4', illustration: 'onboarding-4' as const },
];

function markOnboardingSeen() {
  storage.set('wfl_onboarding_seen', true);
}

function finishOnboarding() {
  markOnboardingSeen();
  router.replace('/(auth)/sign-in');
}

async function requestCameraPermission() {
  try {
    await haptics.tap();
    await Camera.requestCameraPermission();
  } catch (error) {
    console.error('Camera permission request failed:', error);
  }
}

async function requestNotificationPermission() {
  try {
    await haptics.tap();
    await Notifications.requestPermissionsAsync();
  } catch (error) {
    console.error('Notification permission request failed:', error);
  }
}

export default function OnboardingScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<FlatList>(null);

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems[0]?.index != null) {
      setActiveIndex(viewableItems[0].index);
      trackOnboardingSlide((viewableItems[0].index + 1) as 1 | 2 | 3 | 4);
    }
  });

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 });

  const handleNext = useCallback(async () => {
    await haptics.tap();
    if (activeIndex < SLIDES.length - 1) {
      listRef.current?.scrollToIndex({ index: activeIndex + 1, animated: true });
    } else {
      finishOnboarding();
    }
  }, [activeIndex]);

  const handleSkip = useCallback(async () => {
    await haptics.selection();
    finishOnboarding();
  }, []);

  const isLastSlide = activeIndex === SLIDES.length - 1;
  const slideKey = `slide${activeIndex + 1}` as `slide${1 | 2 | 3 | 4}`;

  const ctaLabel = isLastSlide
    ? t('onboarding.slide4.cta')
    : (t(`onboarding.${slideKey}.cta` as any) as string);

  return (
    <YStack
      flex={1}
      backgroundColor="$surface/base"
      paddingTop={insets.top}
      paddingBottom={insets.bottom + 24}
    >
      {/* Skip button */}
      {!isLastSlide && (
        <XStack justifyContent="flex-end" paddingHorizontal="$5" paddingVertical="$3">
          <Pressable
            onPress={handleSkip}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={t('common.skip')}
          >
            <Text fontSize={15} color="$text/tertiary" fontWeight="500">
              {t('common.skip')}
            </Text>
          </Pressable>
        </XStack>
      )}

      {isLastSlide && <View height={52} />}

      {/* Slides */}
      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(item) => item.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        onViewableItemsChanged={onViewableItemsChanged.current}
        viewabilityConfig={viewabilityConfig.current}
        renderItem={({ item, index }) => (
          <SlideContent slideIndex={index} illustration={item.illustration} />
        )}
        style={{ flex: 1 }}
      />

      {/* Permission buttons (slide 4 only) */}
      {isLastSlide && (
        <YStack paddingHorizontal="$6" gap="$3" marginBottom="$4">
          <Button variant="tinted" size="lg" onPress={requestCameraPermission}>
            {t('onboarding.slide4.allowCamera')}
          </Button>
          <Button variant="tinted" size="lg" onPress={requestNotificationPermission}>
            {t('onboarding.slide4.allowNotifications')}
          </Button>
        </YStack>
      )}

      {/* Page dots */}
      <XStack
        justifyContent="center"
        gap="$2"
        marginBottom="$4"
        accessibilityRole="tablist"
        accessible
        accessibilityLabel={t('onboarding.pageIndicator', {
          current: activeIndex + 1,
          total: SLIDES.length,
        })}
      >
        {SLIDES.map((_, i) => (
          <View
            key={i}
            width={i === activeIndex ? 20 : 6}
            height={6}
            borderRadius={3}
            backgroundColor={i === activeIndex ? '$brand/primary' : '$border/strong'}
            accessible={false}
          />
        ))}
      </XStack>

      {/* CTA */}
      <YStack paddingHorizontal="$6">
        <Button variant="filled" size="lg" onPress={handleNext}>
          {ctaLabel}
        </Button>
      </YStack>
    </YStack>
  );
}

function SlideContent({
  slideIndex,
  illustration,
}: {
  slideIndex: number;
  illustration: 'onboarding-1' | 'onboarding-2' | 'onboarding-3' | 'onboarding-4';
}) {
  const { t } = useTranslation();
  const slideKey = `slide${slideIndex + 1}` as `slide${1 | 2 | 3 | 4}`;

  return (
    <YStack
      width={SCREEN_WIDTH}
      flex={1}
      alignItems="center"
      justifyContent="center"
      paddingHorizontal="$8"
      gap="$6"
    >
      <IllustrationPlaceholder name={illustration} width={240} height={200} />
      <YStack alignItems="center" gap="$3">
        <Text
          fontSize={28}
          fontWeight="700"
          color="$text/primary"
          textAlign="center"
          lineHeight={34}
          accessibilityRole="header"
        >
          {t(`onboarding.${slideKey}.title` as any)}
        </Text>
        <Text fontSize={16} color="$text/secondary" textAlign="center" lineHeight={24}>
          {t(`onboarding.${slideKey}.body` as any)}
        </Text>
      </YStack>
    </YStack>
  );
}
