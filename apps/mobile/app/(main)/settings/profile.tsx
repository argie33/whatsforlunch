import React, { useState, useCallback } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { YStack, Text } from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';

import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { useCurrentUser } from '@/features/auth/useCurrentUser';
import { useDatabase } from '@/db';
import { profileService } from '@/services/ProfileService';
import { captureException } from '@/lib/sentry';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const db = useDatabase();
  const { user } = useCurrentUser();
  const [name, setName] = useState(user?.name ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const initials = name
    ? name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  const deviceTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const handleSave = useCallback(async () => {
    if (!name.trim() || !user) return;
    setSaving(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await profileService.updateProfile(db, user.userId, { displayName: name.trim() });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      captureException(err);
    } finally {
      setSaving(false);
    }
  }, [db, user, name]);

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
        <YStack alignItems="center" marginBottom="$6" gap="$3">
          <Avatar initials={initials} size={64} name={name} />
          <Text fontSize="$3" color="$brand/primary" fontWeight="500">
            {t('settings.profile.changePhoto')}
          </Text>
        </YStack>

        <YStack gap="$4">
          <YStack gap="$2">
            <Text fontSize="$3" fontWeight="600" color="$text/secondary">
              {t('settings.profile.name')}
            </Text>
            <Input
              value={name}
              onChangeText={setName}
              placeholder={t('settings.profile.namePlaceholder')}
              autoCapitalize="words"
              returnKeyType="done"
              onSubmitEditing={handleSave}
            />
          </YStack>

          <YStack gap="$2">
            <Text fontSize="$3" fontWeight="600" color="$text/secondary">
              {t('settings.profile.email')}
            </Text>
            <Input
              value={user?.email ?? ''}
              editable={false}
              opacity={0.6}
            />
          </YStack>

          <YStack gap="$2">
            <Text fontSize="$3" fontWeight="600" color="$text/secondary">
              {t('settings.profile.timezone')}
            </Text>
            <Input
              value={deviceTimeZone}
              editable={false}
              opacity={0.6}
            />
            <Text fontSize="$2" color="$text/tertiary">
              {t('settings.profile.timezoneAuto')}
            </Text>
          </YStack>

          <Button
            variant="filled"
            size="lg"
            onPress={handleSave}
            loading={saving}
            disabled={!name.trim() || name.trim() === user?.name}
          >
            {saved ? 'Saved!' : t('common.save')}
          </Button>
        </YStack>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
