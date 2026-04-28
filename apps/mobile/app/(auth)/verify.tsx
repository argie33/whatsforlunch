import React, { useCallback, useEffect, useState } from 'react';
import { YStack, Text } from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useLocalSearchParams, router } from 'expo-router';
import { haptics } from '@/lib/haptics';
import { Alert } from 'react-native';

import { Button } from '@/components/ui/Button';
import { IllustrationPlaceholder } from '@/components/ui/IllustrationPlaceholder';
import { IS_MOCK } from '@/features/auth/authService';

export default function VerifyScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { token } = useLocalSearchParams<{ token?: string }>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = useCallback(async (linkToken: string) => {
    setLoading(true);
    setError(null);
    await haptics.medium();
    try {
      if (IS_MOCK) {
        // Mock: treat any token as valid
        router.replace('/(main)');
        return;
      }
      // Phase C: call Amplify confirmSignIn with the token from deep link
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const authModule = (await import('@aws-amplify/auth')) as any;
      const confirmFn = authModule.confirmSignIn ?? authModule.default?.confirmSignIn;
      if (confirmFn) await confirmFn({ challengeResponse: linkToken });
      router.replace('/(main)');
    } catch (err) {
      setError(String(err));
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) handleVerify(token);
  }, [token, handleVerify]);

  if (loading) {
    return (
      <YStack
        flex={1}
        backgroundColor="$surface/base"
        justifyContent="center"
        alignItems="center"
        gap="$5"
      >
        <IllustrationPlaceholder name="magic-link-sent" width={180} height={140} />
        <Text fontSize="$4" color="$text/secondary">
          {t('common.loading')}
        </Text>
      </YStack>
    );
  }

  return (
    <YStack
      flex={1}
      backgroundColor="$surface/base"
      justifyContent="center"
      alignItems="center"
      padding="$6"
      paddingBottom={insets.bottom + 24}
      gap="$5"
    >
      <IllustrationPlaceholder name="magic-link-sent" width={180} height={140} />
      <YStack alignItems="center" gap="$3">
        <Text
          fontSize={24}
          fontWeight="700"
          color="$text/primary"
          textAlign="center"
          accessibilityRole="header"
        >
          {t('auth.verifyingLink')}
        </Text>
        {error && (
          <Text
            fontSize={15}
            color="$status/urgent"
            textAlign="center"
            accessibilityLiveRegion="polite"
            accessibilityRole="alert"
          >
            {error}
          </Text>
        )}
      </YStack>
      {error && (
        <Button variant="tinted" size="lg" onPress={() => router.replace('/(auth)/sign-in')}>
          {t('common.back')}
        </Button>
      )}
    </YStack>
  );
}
