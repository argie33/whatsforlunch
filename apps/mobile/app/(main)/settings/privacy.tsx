import React, { useCallback, useState } from 'react';
import { ScrollView, Switch, Share } from 'react-native';
import { YStack, XStack, Text, View } from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { haptics } from '@/lib/haptics';

import { Button } from '@/components/ui/Button';
import { useUserPreferences } from '@/features/settings/useUserPreferences';
import { useAnalytics } from '@/lib/posthog';
import { SettingsEvents, trackExportDataRequested } from '@/features/settings/analytics';
import { captureException } from '@/lib/sentry';
import { useToast } from '@/lib/toast';
import { useDatabase } from '@/db';
import type { Item } from '@/db/models/Item';
import type { Container } from '@/db/models/Container';

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
        <Text fontSize="$4" fontWeight="500" color="$text/primary">
          {label}
        </Text>
        <Text fontSize="$3" color="$text/secondary" lineHeight={18}>
          {body}
        </Text>
      </YStack>
      <Switch
        value={value}
        onValueChange={() => {
          void haptics.selection();
          onToggle();
        }}
        trackColor={{ true: '#2F7D5B' }}
      />
    </XStack>
  );
}

export default function PrivacyScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const db = useDatabase();
  const { prefs, setPrefs } = useUserPreferences();
  const { track } = useAnalytics();
  const { showToast } = useToast();
  const [exporting, setExporting] = useState(false);

  const handleExport = useCallback(async () => {
    await haptics.medium();
    trackExportDataRequested();
    track(SettingsEvents.EXPORT_DATA_REQUESTED);
    setExporting(true);
    try {
      const [items, containers] = await Promise.all([
        db.get<Item>('items').query().fetch(),
        db.get<Container>('containers').query().fetch(),
      ]);

      const exportData = {
        exportedAt: new Date().toISOString(),
        items: items.map((i) => ({
          foodName: i.foodName,
          foodType: i.foodType,
          category: i.category,
          storageLocation: i.storageLocation,
          expiryAt: i.expiryAt,
          status: i.status,
          quantityText: i.quantityText,
          storedAt: i.storedAt,
        })),
        containers: containers.map((c) => ({
          nickname: c.nickname,
          qrToken: c.qrToken,
        })),
      };

      await Share.share({
        title: 'WhatsForLunch Data Export',
        message: JSON.stringify(exportData, null, 2),
      });
      showToast(t('settings.privacy.exportSuccess'), { type: 'success' });
    } catch (err) {
      if ((err as any)?.message !== 'User did not share') {
        captureException(err);
        showToast(t('errors.exportFailed'), { type: 'error' });
      }
    } finally {
      setExporting(false);
    }
  }, [db, t, track]);

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
            track(SettingsEvents.PRIVACY_UPDATED, {
              deletePhotosAfterAI: !prefs.deletePhotosAfterAI,
            });
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
        <Text
          fontSize="$3"
          fontWeight="600"
          color="$text/tertiary"
          textTransform="uppercase"
          letterSpacing={0.5}
        >
          {t('settings.privacy.dataSection')}
        </Text>
        <Button variant="tinted" size="lg" onPress={handleExport} loading={exporting}>
          {t('settings.privacy.exportData')}
        </Button>
      </YStack>
    </ScrollView>
  );
}
