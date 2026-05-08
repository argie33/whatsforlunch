import React, { useEffect } from 'react';
import { View } from 'react-native';
import { Text, YStack } from 'tamagui';
import { router } from 'expo-router';
import { lightTheme } from '@/theme/tokens';

const C = lightTheme;

export default function SplashScreen() {
  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace('/onboarding');
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: C['surface/base'],
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <YStack alignItems="center" gap={12}>
        <Text fontSize={80}>🥬</Text>
        <Text fontSize={32} fontWeight="800" color={C['text/primary']} letterSpacing={-0.8}>
          WhatsFresh
        </Text>
        <Text fontSize={14} color={C['text/secondary']}>
          Fresh ideas. Less waste.
        </Text>
      </YStack>
    </View>
  );
}
