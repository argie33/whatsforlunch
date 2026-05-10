import React, { useState } from 'react';
import { YStack, XStack, Text } from 'tamagui';
import { useRouter } from 'expo-router';
import { Button, Input } from '@/components/ui';
import { TopBar } from '@/components/ui';
import { lightTheme } from '@/theme/tokens';

const C = lightTheme;

export default function AuthScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');

  const handleContinue = () => {
    if (email.trim()) {
      router.push('/(auth)/magic-link');
    }
  };

  return (
    <YStack flex={1} backgroundColor={C['surface/base']}>
      <TopBar title="Sign in" subtitle="Welcome back" />

      <YStack flex={1} paddingHorizontal={22} gap={24} justifyContent="center">
        {/* Logo */}
        <YStack alignItems="center" gap={12}>
          <Text fontSize={60}>🍽️</Text>
          <Text
            fontSize={28}
            fontWeight="800"
            letterSpacing={-0.8}
            color={C['text/primary']}
            textAlign="center"
            fontFamily="$serif"
          >
            WhatsFresh
          </Text>
        </YStack>

        {/* Email Input */}
        <YStack gap={8}>
          <Text fontSize={14} fontWeight="600" color={C['text/secondary']}>
            Email address
          </Text>
          <Input
            placeholder="you@example.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            placeholderTextColor={C['text/tertiary']}
          />
        </YStack>

        {/* Continue Button */}
        <Button variant="primary" size="lg" full onPress={handleContinue} disabled={!email.trim()}>
          Continue with Email
        </Button>

        {/* Divider */}
        <XStack alignItems="center" gap={12}>
          <YStack flex={1} height={1} backgroundColor={C['border/subtle']} />
          <Text fontSize={13} color={C['text/tertiary']}>
            or
          </Text>
          <YStack flex={1} height={1} backgroundColor={C['border/subtle']} />
        </XStack>

        {/* Social Login */}
        <Button variant="secondary" size="lg" full onPress={() => {}}>
          Continue with Google
        </Button>

        {/* Terms */}
        <Text fontSize={12} color={C['text/tertiary']} textAlign="center" lineHeight={18}>
          By continuing, you agree to our{'\n'}
          <Text color={C['brand/primary']} fontWeight="600">
            Terms of Service
          </Text>{' '}
          and{' '}
          <Text color={C['brand/primary']} fontWeight="600">
            Privacy Policy
          </Text>
        </Text>
      </YStack>
    </YStack>
  );
}
