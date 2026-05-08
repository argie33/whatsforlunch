import React, { useEffect } from 'react';
import { View, Animated } from 'react-native';
import { Text, YStack } from 'tamagui';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { lightTheme } from '@/theme/tokens';

const C = lightTheme;

export default function SplashScreen() {
  const floatAnim = new Animated.Value(0);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -12,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ]),
    ).start();

    const timer = setTimeout(() => {
      router.replace('/onboarding');
    }, 2500);
    return () => clearTimeout(timer);
  }, [floatAnim]);

  return (
    <LinearGradient
      colors={[C['brand/primaryDark'], C['brand/primary'], C['brand/primaryLight']]}
      start={{ x: 0.2, y: 0.2 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
    >
      <YStack alignItems="center" gap={12}>
        <Animated.Text
          style={{
            fontSize: 90,
            transform: [{ translateY: floatAnim }],
          }}
        >
          🥬
        </Animated.Text>
        <Text
          fontSize={42}
          fontWeight="800"
          color="white"
          letterSpacing={-1.8}
          fontFamily="Fraunces"
        >
          WhatsFresh
        </Text>
        <Text fontSize={16} color="white" opacity={0.9} fontWeight="500">
          Fresh ideas. Less waste.
        </Text>
      </YStack>
    </LinearGradient>
  );
}
