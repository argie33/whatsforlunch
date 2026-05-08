import React, { useRef, useState, useCallback } from 'react';
import { Dimensions, ScrollView, Pressable, View as RNView, Animated } from 'react-native';
import { YStack, XStack, Text, View } from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { MMKV } from 'react-native-mmkv';
import * as Notifications from 'expo-notifications';
import { Camera } from 'react-native-vision-camera';
import { LinearGradient } from 'expo-linear-gradient';
import { lightTheme } from '@/theme/tokens';

const C = lightTheme;
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const storage = new MMKV({ id: 'wfl.app' });

const PAGES = [
  {
    emoji: '📦',
    gradientStart: '#FFE099',
    gradientEnd: C['accent/honey'],
    title: 'Track everything in your fridge',
    subtitle: "Add items in seconds with AI scanning. We'll watch the dates so you don't have to.",
  },
  {
    emoji: '🍳',
    gradientStart: '#FFB088',
    gradientEnd: C['accent/coral'],
    title: 'Get recipe ideas',
    subtitle: 'Discover recipes based on what you have. Reduce waste. Cook smarter.',
  },
  {
    emoji: '🛒',
    gradientStart: '#5AC5FF',
    gradientEnd: C['accent/sky'],
    title: 'Plan your shopping',
    subtitle: 'Create shopping lists and never forget what you need.',
  },
  {
    emoji: '💚',
    gradientStart: '#2DBC83',
    gradientEnd: C['brand/primary'],
    title: 'Save money and the planet',
    subtitle: 'Track your savings and environmental impact as you reduce food waste.',
  },
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
    await Camera.requestCameraPermission();
  } catch (error) {
    console.error('Camera permission request failed:', error);
  }
}

async function requestNotificationPermission() {
  try {
    await Notifications.requestPermissionsAsync();
  } catch (error) {
    console.error('Notification permission request failed:', error);
  }
}

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const [currentPage, setCurrentPage] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  const handleNext = useCallback(() => {
    if (currentPage < PAGES.length - 1) {
      scrollViewRef.current?.scrollTo({ x: (currentPage + 1) * SCREEN_WIDTH, animated: true });
      setCurrentPage(currentPage + 1);
    } else {
      finishOnboarding();
    }
  }, [currentPage]);

  const handleSkip = useCallback(() => {
    finishOnboarding();
  }, []);

  const isLastPage = currentPage === PAGES.length - 1;
  const page = PAGES[currentPage];

  return (
    <RNView style={{ flex: 1, backgroundColor: C['surface/base'] }}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        scrollEventThrottle={16}
        onScroll={(event) => {
          const contentOffsetX = event.nativeEvent.contentOffset.x;
          const newPage = Math.round(contentOffsetX / SCREEN_WIDTH);
          if (newPage !== currentPage) setCurrentPage(newPage);
        }}
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        style={{ flex: 1 }}
      >
        {PAGES.map((p, idx) => (
          <RNView
            key={idx}
            style={{
              width: SCREEN_WIDTH,
              justifyContent: 'center',
              alignItems: 'center',
              paddingHorizontal: 32,
            }}
          >
            <YStack alignItems="center" gap={36}>
              <LinearGradient
                colors={[p.gradientStart, p.gradientEnd]}
                start={{ x: 0.3, y: 0.3 }}
                end={{ x: 1, y: 1 }}
                style={{
                  width: 240,
                  height: 240,
                  borderRadius: 120,
                  justifyContent: 'center',
                  alignItems: 'center',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 20 },
                  shadowOpacity: 0.1,
                  shadowRadius: 40,
                  elevation: 8,
                }}
              >
                <Text fontSize={110}>{p.emoji}</Text>
              </LinearGradient>
              <YStack alignItems="center" gap={14}>
                <Text
                  fontSize={36}
                  fontWeight="800"
                  color={C['text/primary']}
                  letterSpacing={-1.2}
                  textAlign="center"
                  lineHeight={38}
                  fontFamily="Fraunces"
                >
                  {p.title}
                </Text>
                <Text fontSize={17} color={C['text/secondary']} textAlign="center" lineHeight={26}>
                  {p.subtitle}
                </Text>
              </YStack>
            </YStack>
          </RNView>
        ))}
      </ScrollView>

      {/* === Dots and Actions === */}
      <RNView
        style={{
          paddingHorizontal: 22,
          paddingTop: 24,
          paddingBottom: insets.bottom + 24,
        }}
      >
        {/* Dots */}
        <XStack justifyContent="center" gap={6} marginBottom={24}>
          {PAGES.map((_, idx) => (
            <RNView
              key={idx}
              style={{
                width: idx === currentPage ? 28 : 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: idx === currentPage ? C['brand/primary'] : C['border/strong'],
              }}
            />
          ))}
        </XStack>

        {/* Action Buttons */}
        <XStack gap={10} marginBottom={isLastPage ? 16 : 0}>
          <Pressable
            onPress={handleSkip}
            style={{
              flex: 0,
              backgroundColor: 'transparent',
              borderRadius: 16,
              paddingVertical: 16,
              paddingHorizontal: 12,
              alignItems: 'center',
            }}
          >
            <Text fontSize={16} fontWeight="700" color={C['brand/primary']}>
              Skip
            </Text>
          </Pressable>
          <Pressable
            onPress={handleNext}
            style={{
              flex: 1,
              backgroundColor: C['brand/primary'],
              borderRadius: 16,
              paddingVertical: 16,
              paddingHorizontal: 24,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text fontSize={16} fontWeight="700" color="white">
              {currentPage === PAGES.length - 1 ? 'Start →' : 'Continue →'}
            </Text>
          </Pressable>
        </XStack>

        {/* Permission buttons (last page only) */}
        {isLastPage && (
          <YStack gap={8}>
            <Pressable
              onPress={requestCameraPermission}
              style={{
                backgroundColor: C['brand/soft'],
                borderRadius: 16,
                padding: 16,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: C['brand/primary'],
              }}
            >
              <Text fontSize={16} fontWeight="700" color={C['brand/primary']}>
                📷 Allow camera for scanning
              </Text>
            </Pressable>
            <Pressable
              onPress={requestNotificationPermission}
              style={{
                backgroundColor: C['brand/soft'],
                borderRadius: 16,
                padding: 16,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: C['brand/primary'],
              }}
            >
              <Text fontSize={16} fontWeight="700" color={C['brand/primary']}>
                🔔 Allow notifications
              </Text>
            </Pressable>
          </YStack>
        )}
      </RNView>
    </RNView>
  );
}
