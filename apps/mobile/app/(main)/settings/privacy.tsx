import React, { useCallback, useState } from 'react';
import { ScrollView, Switch, Alert } from 'react-native';
import { YStack, XStack, Text, View } from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';

import { Button } from '@/components/ui/Button';
import { useUserPreferences } from '@/features/settings/useUserPreferences';
import { useAnalytics } from '@/lib/posthog';
import { SettingsEvents, trackExportDataRequested } from '@/features/settings/analytics';
import { captureException } from '@/lib/sentry';

function ToggleRow({
  label,
  body,
  value,
  onToggle,
}: {
  label: string;
  body: string;
  value: boolean;
  onToggle: () => void;
}) {
  return (
    <XStack paddingHorizontal="$5" paddingVertical="$4" alignItems="flex-start" gap="$3">
      <YStack flex={1} gap="$1">
        <Text fontSize="$4" fontWeight="500" color="$text/primary">{label}</Text>
        <Text fontSize="$3" color="$text/secondary" lineHeight={18}>{body}</Text>
      </YStack>
      <Switch
        value={value}
        onValueChange={() => { Haptics.selectionAsync(); onToggle(); }}
        trackColor={{ true: '#2F7D5B' }}
      />
    </XStack>
  );
}

export default function PrivacyScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { prefs, setPrefs } = useUserPreferences();
  const { track } = useAnalytics();
  const [exporting, setExporting] = useState(false);

  const handleExport = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    trackExportDataRequested();
    track(SettingsEvents.EXPORT_DATA_REQUESTED);
    setExporting(true);
    try {
      // Phase B: call export-data Lambda via AppSync mutation
      await new Promise((r) => setTimeout(r, 1500));
      Alert.alert(t('settings.privacy.exportReady'), t('settings.privacy.exportBody'));
    } catch (err) {
      captureException(err);
      Alert.alert(t('common.error'), String(err));
    } finally {
      setExporting(false);
    }
  }, [t, track]);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#FBFAF7' }}
      contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
      showsVerticalScrollIndicator={false}
    >
      <YStack
        marginHorizontal="$4"
        marginTop="$5"
        backgroundColor="$surface/raised"
        borderRadius="$lg"
        overflow="hidden"
        borderWidth={1}
        borderColor="$border/subtle"
      >
        <ToggleRow
          label={t('settings.privacy.deletePhotosAfterAI')}
          body={t('settings.privacy.deletePhotosBody')}
          value={prefs.deletePhotosAfterAI}
          onToggle={() => {
            setPrefs({ deletePhotosAfterAI: !prefs.deletePhotosAfterAI });
            track(SettingsEvents.PRIVACY_UPDATED, { deletePhotosAfterAI: !prefs.deletePhotosAfterAI });
          }}
        />
        <View height={1} backgroundColor="$border/subtle" marginHorizontal="$5" />
        <ToggleRow
          label={t('settings.privacy.shareAnalytics')}
          body={t('settings.privacy.shareAnalyticsBody')}
          value={prefs.shareAnalytics}
          onToggle={() => {
            setPrefs({ shareAnalytics: !prefs.shareAnalytics });
            track(SettingsEvents.PRIVACY_UPDATED, { shareAnalytics: !prefs.shareAnalytics });
          }}
        />
      </YStack>

      <YStack paddingHorizontal="$4" marginTop="$6" gap="$3">
        <Text fontSize="$3" fontWeight="600" color="$text/tertiary" textTransform="uppercase" letterSpacing={0.5}>
          Data
        </Text>
        <Button variant="tinted" size="lg" onPress={handleExport} loading={exporting}>
          {t('settings.privacy.exportData')}
        </Button>
      </YStack>
    </ScrollView>
  );
}
