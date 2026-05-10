import React, { useState } from 'react';
import { YStack, Text } from 'tamagui';
import { useRouter } from 'expo-router';
import { Button } from '@/components/ui';
import { TopBar } from '@/components/ui';
import { lightTheme } from '@/theme/tokens';

const C = lightTheme;

export default function MagicLinkScreen() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleResend = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
    }, 2000);
  };

  const handleContinue = () => {
    // In real app, would verify email and navigate to dashboard
    router.replace('/(main)/dashboard');
  };

  return (
    <YStack flex={1} backgroundColor={C['surface/base']}>
      <TopBar title="Check your email" subtitle="Magic link sent" />

      <YStack flex={1} paddingHorizontal={22} gap={24} justifyContent="center">
        {/* Icon */}
        <YStack alignItems="center">
          <Text fontSize={64}>📧</Text>
        </YStack>

        {/* Message */}
        <YStack gap={12} alignItems="center">
          <Text
            fontSize={22}
            fontWeight="700"
            letterSpacing={-0.4}
            color={C['text/primary']}
            textAlign="center"
          >
            Check your inbox
          </Text>
          <Text fontSize={16} lineHeight={23} color={C['text/secondary']} textAlign="center">
            We sent a magic link to{'\n'}
            <Text fontWeight="600">you@example.com</Text>
          </Text>
          <Text fontSize={14} lineHeight={20} color={C['text/tertiary']} textAlign="center">
            Click the link to verify your email and sign in.
          </Text>
        </YStack>

        {/* Continue Button */}
        <Button variant="primary" size="lg" full onPress={handleContinue}>
          I've verified my email
        </Button>

        {/* Resend */}
        <Button variant="ghost" size="lg" full onPress={handleResend} loading={isLoading}>
          {isLoading ? 'Resending...' : "Didn't receive it? Resend"}
        </Button>

        {/* Help Text */}
        <Text fontSize={12} color={C['text/tertiary']} textAlign="center">
          Check your spam folder if you don't see it.
        </Text>
      </YStack>
    </YStack>
  );
}
