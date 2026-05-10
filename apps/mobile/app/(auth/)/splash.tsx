import React, { useEffect } from 'react';
import { YStack, Text, View } from 'tamagui';
import { useRouter } from 'expo-router';
import { lightTheme } from '@/theme/tokens';

const C = lightTheme;

export default function SplashScreen() {
  const router = useRouter();

  useEffect(() => {
    // Auto-navigate to onboarding after 2 seconds
    const timer = setTimeout(() => {
      router.replace('/(auth)/onboarding');
    }, 2000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <YStack
      flex={1}
      backgroundColor={C['surface/base']}
      justifyContent="center"
      alignItems="center"
      gap={24}
      paddingHorizontal={24}
    >
      {/* Logo/Emoji */}
      <Text fontSize={80}>🍽️</Text>

      {/* App Name */}
      <YStack gap={8} alignItems="center">
        <Text
          fontSize={34}
          fontWeight="800"
          letterSpacing={-1.2}
          color={C['text/primary']}
          textAlign="center"
          fontFamily="$serif"
        >
          WhatsFresh
        </Text>
        <Text fontSize={16} lineHeight={23} color={C['text/secondary']} textAlign="center">
          Track what's fresh. Reduce waste. Cook smart.
        </Text>
      </YStack>

      {/* Loading indicator */}
      <View
        width={4}
        height={4}
        borderRadius={2}
        backgroundColor={C['brand/primary']}
        opacity={0.5}
      />
    </YStack>
  );
}
