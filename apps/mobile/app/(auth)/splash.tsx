import React, { useEffect } from 'react';
import { View } from 'react-native';
import { Text, YStack } from 'tamagui';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  withSpring,
  useAnimatedStyle,
  FadeInDown,
  FadeInUp,
} from 'react-native-reanimated';
import { lightTheme } from '@/theme/tokens';

const C = lightTheme;

export default function SplashScreen() {
  const logoScale = useSharedValue(0.8);
  const logoOpacity = useSharedValue(0);

  useEffect(() => {
    logoScale.value = withSpring(1, { damping: 0.8, mass: 1 });
    logoOpacity.value = withSpring(1, { damping: 0.8, mass: 1 });

    const timer = setTimeout(() => {
      router.replace('/onboarding');
    }, 3000);
    return () => clearTimeout(timer);
  }, [logoScale, logoOpacity]);

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
    opacity: logoOpacity.value,
  }));

  return (
    <LinearGradient
      colors={[C['brand/primaryDark'], C['brand/primary'], C['brand/primaryLight']]}
      start={{ x: 0.2, y: 0.2 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
    >
      <YStack alignItems="center" gap={12}>
        <Animated.View style={logoAnimatedStyle}>
          <Text fontSize={90}>🥬</Text>
        </Animated.View>
        <Animated.View entering={FadeInDown.duration(500).delay(200)}>
          <Text
            fontSize={42}
            fontWeight="800"
            color="white"
            letterSpacing={-1.8}
            fontFamily="Fraunces"
          >
            WhatsFresh
          </Text>
        </Animated.View>
        <Animated.View entering={FadeInUp.duration(500).delay(400)}>
          <Text fontSize={16} color="white" opacity={0.9} fontWeight="500">
            Fresh ideas. Less waste.
          </Text>
        </Animated.View>
      </YStack>
    </LinearGradient>
  );
}
