import React, { useState, useCallback } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { YStack, XStack, Text, View } from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { signOut } from '@/features/auth/authService';
import {
  trackDeleteAccountInitiated,
  trackDeleteAccountConfirmed,
  SettingsEvents,
} from '@/features/settings/analytics';
import { useAnalytics } from '@/lib/posthog';
import { captureException } from '@/lib/sentry';

const CONFIRM_PHRASE = 'DELETE';

const DATA_TO_DELETE = [
  'All food items and containers',
  'Your household memberships',
  'Shopping list and meal history',
  'Profile and preferences',
  'All photos and AI scan history',
];

export default function DeleteAccountScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { track } = useAnalytics();
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const canConfirm = confirmText === CONFIRM_PHRASE;

  // Track that user arrived at this screen
  React.useEffect(() => {
    trackDeleteAccountInitiated();
    track(SettingsEvents.DELETE_ACCOUNT_INITIATED);
  }, [track]);

  const handleDelete = useCallback(async () => {
    if (!canConfirm) return;
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      'Final confirmation',
      'This is permanent and cannot be undone. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete my account',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              trackDeleteAccountConfirmed();
              track(SettingsEvents.DELETE_ACCOUNT_CONFIRMED);
              // Phase B: call delete-account Lambda via AppSync mutation
              await signOut();
              Alert.alert('Account deleted', 'Your account has been permanently deleted.', [
                {
                  text: 'OK',
                  onPress: () => router.replace('/(auth)/sign-in'),
                },
              ]);
            } catch (err) {
              captureException(err);
              Alert.alert(t('common.error'), String(err));
              setDeleting(false);
            }
          },
        },
      ],
    );
  }, [canConfirm, t, track]);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={{ flex: 1, backgroundColor: '#FBFAF7' }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32, paddingHorizontal: 20, paddingTop: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Warning banner */}
        <YStack
          backgroundColor="$status/urgentBg"
          borderRadius="$lg"
          padding="$4"
          marginBottom="$5"
          borderWidth={1}
          borderColor="$status/urgent"
          gap="$2"
        >
          <Text fontSize="$4" fontWeight="700" color="$status/urgent">
            ⚠️ Are you sure?
          </Text>
          <Text fontSize="$3" color="$text/primary" lineHeight={20}>
            {t('settings.deleteAccountConfirm')}
          </Text>
        </YStack>

        {/* Data list */}
        <YStack
          backgroundColor="$surface/raised"
          borderRadius="$lg"
          padding="$4"
          marginBottom="$5"
          borderWidth={1}
          borderColor="$border/subtle"
          gap="$2"
        >
          <Text fontSize="$3" fontWeight="600" color="$text/secondary" marginBottom="$1">
            The following will be permanently deleted:
          </Text>
          {DATA_TO_DELETE.map((item) => (
            <XStack key={item} gap="$2" alignItems="center">
              <Text fontSize="$3" color="$status/urgent">•</Text>
              <Text fontSize="$3" color="$text/primary">{item}</Text>
            </XStack>
          ))}
        </YStack>

        {/* Confirm input */}
        <YStack gap="$3" marginBottom="$5">
          <Text fontSize="$3" color="$text/secondary" lineHeight={20}>
            Type <Text fontWeight="700" color="$text/primary">DELETE</Text> to confirm.
          </Text>
          <Input
            value={confirmText}
            onChangeText={setConfirmText}
            placeholder="Type DELETE to confirm"
            autoCapitalize="characters"
            autoCorrect={false}
            returnKeyType="done"
          />
        </YStack>

        <Button
          variant="destructive"
          size="lg"
          onPress={handleDelete}
          disabled={!canConfirm}
          loading={deleting}
        >
          Permanently Delete
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
