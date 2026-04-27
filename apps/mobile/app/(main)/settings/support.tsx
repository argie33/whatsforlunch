import React from 'react';
import { ScrollView, Linking } from 'react-native';
import { YStack, Text, View } from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import Constants from 'expo-constants';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

import { ListRow } from '@/components/ui/ListRow';
import { useAnalytics } from '@/lib/posthog';
import { SettingsEvents } from '@/features/settings/analytics';

const FAQ_URL = 'https://whatsforlunch.app/faq';

function buildBugEmailUrl(version: string, build: string): string {
  const subject = encodeURIComponent(`Bug Report — WhatsForLunch v${version}`);
  const body = encodeURIComponent(
    `Describe the bug:\n\n\n---\nVersion: ${version} (${build})\nOS: ${Platform.OS} ${Platform.Version}`,
  );
  return `mailto:support@whatsforlunch.app?subject=${subject}&body=${body}`;
}

export default function SupportScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { track } = useAnalytics();
  const version = Constants.expoConfig?.version ?? '—';
  const build = Constants.expoConfig?.ios?.buildNumber ?? '—';

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
        <ListRow
          title={t('settings.help.faq')}
          icon="book-open"
          subtitle={t('settings.support.faqSubtitle')}
          onPress={() => { Haptics.selectionAsync(); Linking.openURL(FAQ_URL); }}
        />
        <View height={1} backgroundColor="$border/subtle" marginHorizontal="$5" />
        <ListRow
          title={t('settings.help.contact')}
          icon="mail"
          subtitle={t('settings.support.contactSubtitle')}
          onPress={() => {
            Haptics.selectionAsync();
            Linking.openURL('mailto:support@whatsforlunch.app');
          }}
        />
        <View height={1} backgroundColor="$border/subtle" marginHorizontal="$5" />
        <ListRow
          title={t('settings.help.reportBug')}
          icon="flag"
          subtitle={t('settings.support.bugSubtitle')}
          onPress={() => {
            Haptics.selectionAsync();
            track(SettingsEvents.BUG_REPORT_SENT);
            Linking.openURL(buildBugEmailUrl(version, build));
          }}
        />
      </YStack>
      <Text fontSize="$3" color="$text/tertiary" textAlign="center" marginTop="$6" paddingHorizontal="$8">
        {t('settings.support.responseTime')}
      </Text>
    </ScrollView>
  );
}
