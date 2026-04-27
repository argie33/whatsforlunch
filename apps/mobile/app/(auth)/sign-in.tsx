import React, { useState, useCallback } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, Alert } from 'react-native';
import { YStack, XStack, Text, View } from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { IllustrationPlaceholder } from '@/components/ui/IllustrationPlaceholder';
import { IS_MOCK } from '@/features/auth/authService';

const schema = z.object({
  email: z.string().email(),
});
type FormValues = z.infer<typeof schema>;

export default function SignInScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const { control, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  });

  const handleSendLink = useCallback(async (values: FormValues) => {
    setLoading(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      // Phase C: call Amplify signIn (magic link) here
      // For now, simulate a 1.5s delay then show success
      await new Promise((r) => setTimeout(r, 1500));
      setSent(true);
    } catch (err) {
      Alert.alert(t('common.error'), String(err));
    } finally {
      setLoading(false);
    }
  }, [t]);

  const handleDevBypass = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Mock auth — skip to main app immediately
    router.replace('/(main)');
  }, []);

  if (sent) {
    return (
      <YStack
        flex={1}
        backgroundColor="$surface/base"
        justifyContent="center"
        alignItems="center"
        padding="$6"
        gap="$5"
        paddingBottom={insets.bottom + 24}
      >
        <IllustrationPlaceholder name="email-sent" width={180} height={140} />
        <YStack alignItems="center" gap="$3">
          <Text fontSize={24} fontWeight="700" color="$text/primary" textAlign="center">
            {t('auth.checkEmail')}
          </Text>
          <Text fontSize={16} color="$text/secondary" textAlign="center" lineHeight={24}>
            {t('auth.subtitle')}
          </Text>
        </YStack>
        <Pressable onPress={() => setSent(false)}>
          <Text fontSize={15} color="$brand/primary" fontWeight="500">
            {t('auth.resendLink')}
          </Text>
        </Pressable>
      </YStack>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <YStack
        flex={1}
        backgroundColor="$surface/base"
        paddingHorizontal="$6"
        paddingTop={insets.top + 48}
        paddingBottom={insets.bottom + 24}
        gap="$6"
      >
        {/* Logo + headline */}
        <YStack alignItems="center" gap="$3">
          <IllustrationPlaceholder name="logo" width={80} height={80} />
          <Text fontSize={28} fontWeight="700" color="$text/primary" textAlign="center" lineHeight={34}>
            {t('auth.screenTitle')}
          </Text>
          <Text fontSize={16} color="$text/secondary" textAlign="center" lineHeight={24}>
            {t('auth.subtitle')}
          </Text>
        </YStack>

        <YStack gap="$4">
          {/* Email field */}
          <YStack gap="$2">
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, value } }) => (
                <Input
                  placeholder={t('auth.emailPlaceholder')}
                  value={value}
                  onChangeText={onChange}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="done"
                  onSubmitEditing={handleSubmit(handleSendLink)}
                />
              )}
            />
            {errors.email && (
              <Text fontSize={13} color="$status/urgent">{t('auth.email')} — invalid format</Text>
            )}
          </YStack>

          <Button variant="filled" size="lg" onPress={handleSubmit(handleSendLink)} loading={loading}>
            {t('auth.sendMagicLink')}
          </Button>

          {/* Divider */}
          <XStack alignItems="center" gap="$3">
            <View flex={1} height={1} backgroundColor="$border/subtle" />
            <Text fontSize={13} color="$text/tertiary">{t('common.or')}</Text>
            <View flex={1} height={1} backgroundColor="$border/subtle" />
          </XStack>

          {/* Apple Sign-In (iOS only) */}
          {Platform.OS === 'ios' && (
            <Pressable
              onPress={async () => {
                await Haptics.selectionAsync();
                // Phase C: AppleAuthentication flow
                Alert.alert('Apple Sign-In', 'Coming in Phase C');
              }}
              style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
            >
              <XStack
                height={52}
                backgroundColor="black"
                borderRadius="$md"
                alignItems="center"
                justifyContent="center"
                gap="$2"
              >
                <Text color="white" fontSize={17} fontWeight="600">
                   {t('auth.signInWithApple')}
                </Text>
              </XStack>
            </Pressable>
          )}

          {/* Google Sign-In */}
          <Pressable
            onPress={async () => {
              await Haptics.selectionAsync();
              // Phase C: Google OAuth flow
              Alert.alert('Google Sign-In', 'Coming in Phase C');
            }}
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          >
            <XStack
              height={52}
              backgroundColor="$surface/raised"
              borderRadius="$md"
              borderWidth={1}
              borderColor="$border/strong"
              alignItems="center"
              justifyContent="center"
              gap="$2"
            >
              <Text color="$text/primary" fontSize={17} fontWeight="500">
                🔵 {t('auth.signInWithGoogle')}
              </Text>
            </XStack>
          </Pressable>
        </YStack>

        {/* Dev Mode bypass — only shows when EXPO_PUBLIC_AUTH_MODE=local|mock */}
        {IS_MOCK && (
          <YStack
            marginTop="auto"
            paddingTop="$4"
            borderTopWidth={1}
            borderTopColor="$border/subtle"
            alignItems="center"
            gap="$2"
          >
            <Text fontSize={11} color="$text/tertiary" textTransform="uppercase" letterSpacing={0.5}>
              Dev Mode
            </Text>
            <Pressable onPress={handleDevBypass}>
              <XStack
                paddingHorizontal="$4"
                paddingVertical="$2"
                borderRadius="$full"
                borderWidth={1}
                borderColor="$border/subtle"
                backgroundColor="$surface/sunken"
              >
                <Text fontSize={14} color="$text/secondary" fontWeight="500">
                  Continue as Dev User (skip auth)
                </Text>
              </XStack>
            </Pressable>
          </YStack>
        )}

        {/* Terms */}
        <Text fontSize={12} color="$text/tertiary" textAlign="center" lineHeight={18}>
          {t('auth.termsNotice')}
        </Text>
      </YStack>
    </KeyboardAvoidingView>
  );
}
