import React, { useState, useCallback } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { haptics } from '@/lib/haptics';
import { useAppTheme } from '@/features/settings/useAppTheme';
import { lightTheme, darkTheme } from '@/theme/tokens';
import { R } from '@/theme/tokens';

import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { signOut } from '@/features/auth/authService';
import { useDatabase } from '@/db';
import {
  trackDeleteAccountInitiated,
  trackDeleteAccountConfirmed,
  SettingsEvents,
} from '@/features/settings/analytics';
import { useAnalytics } from '@/lib/posthog';
import { captureException } from '@/lib/sentry';
import { MMKV } from 'react-native-mmkv';

const CONFIRM_PHRASE = 'DELETE';

export default function DeleteAccountScreen() {
  const { t } = useTranslation();
  const appTheme = useAppTheme();
  const theme = appTheme === 'dark' ? darkTheme : lightTheme;
  const insets = useSafeAreaInsets();
  const { track } = useAnalytics();
  const db = useDatabase();
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const canConfirm = confirmText === CONFIRM_PHRASE;

  React.useEffect(() => {
    trackDeleteAccountInitiated();
    track(SettingsEvents.DELETE_ACCOUNT_INITIATED);
  }, [track]);

  const handleDelete = useCallback(async () => {
    if (!canConfirm) return;
    await haptics.warning();
    Alert.alert(t('settings.deleteAccountFinalTitle'), t('settings.deleteAccountFinalBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('settings.deleteAccountFinal'),
        style: 'destructive',
        onPress: async () => {
          setDeleting(true);
          try {
            trackDeleteAccountConfirmed();
            track(SettingsEvents.DELETE_ACCOUNT_CONFIRMED);

            // Wipe all local data
            await wipeAllLocalData(db);

            // Sign out (clears auth tokens)
            await signOut();

            Alert.alert(
              t('settings.deleteAccountSuccessTitle'),
              t('settings.deleteAccountSuccessBody'),
              [{ text: t('common.done'), onPress: () => router.replace('/(auth)/sign-in') }],
            );
          } catch (err) {
            captureException(err);
            Alert.alert(t('common.error'), String(err));
            setDeleting(false);
          }
        },
      },
    ]);
  }, [canConfirm, t, track, db]);

  const dataItems = [
    t('settings.deleteAccountData.foodItems'),
    t('settings.deleteAccountData.households'),
    t('settings.deleteAccountData.history'),
    t('settings.deleteAccountData.profile'),
    t('settings.deleteAccountData.photos'),
  ];

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={{ flex: 1, backgroundColor: theme['surface/base'] }}
        contentContainerStyle={{
          paddingBottom: insets.bottom + 32,
          paddingHorizontal: 20,
          paddingTop: 24,
        }}
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
          <Text fontSize="$4" fontWeight="700" color="$status/urgent" accessibilityRole="header">
            {t('settings.deleteAccountWarning')}
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
            {t('settings.deleteAccountDataLabel')}
          </Text>
          {dataItems.map((item) => (
            <XStack key={item} gap="$2" alignItems="center">
              <Text fontSize="$3" color="$status/urgent" accessible={false}>
                •
              </Text>
              <Text fontSize="$3" color="$text/primary">
                {item}
              </Text>
            </XStack>
          ))}
        </YStack>

        {/* Confirm input */}
        <YStack gap="$3" marginBottom="$5">
          <Text fontSize="$3" color="$text/secondary" lineHeight={20}>
            {t('settings.deleteAccountTypeConfirm')}
          </Text>
          <Input
            value={confirmText}
            onChangeText={setConfirmText}
            placeholder={t('settings.deleteAccountTypeConfirm')}
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
          accessibilityHint={t('accessibility.deleteAccountHint')}
        >
          {t('settings.deleteAccountButtonLabel')}
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

async function wipeAllLocalData(db: any): Promise<void> {
  // Delete WatermelonDB tables
  try {
    const tables = ['items', 'containers', 'profiles', 'households', 'household_members'];
    for (const table of tables) {
      try {
        const records = await db.get(table).query().fetch();
        await Promise.all(records.map((r: any) => r.markAsDeleted()));
      } catch {
        // Table may not exist
      }
    }
  } catch (err) {
    console.warn('[DeleteAccount] Error wiping database tables:', err);
  }

  // Clear MMKV storage (sync queue, preferences, etc.)
  try {
    const mmkv = new MMKV();
    const allKeys = mmkv.getAllKeys();
    for (const key of allKeys) {
      mmkv.delete(key);
    }
  } catch (err) {
    console.warn('[DeleteAccount] Error clearing MMKV:', err);
  }
}
