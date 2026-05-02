import React from 'react';
import { ScrollView, Linking } from 'react-native';
import { YStack, XStack, Text, View } from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import Constants from 'expo-constants';
import { haptics } from '@/lib/haptics';

import { ListRow } from '@/components/ui/ListRow';

const TERMS_URL = 'https://whatsfresh.app/terms';
const PRIVACY_URL = 'https://whatsfresh.app/privacy';

export default function AboutScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const version = Constants.expoConfig?.version ?? '—';
  const buildNumber =
    Constants.expoConfig?.ios?.buildNumber ??
    Constants.expoConfig?.android?.versionCode?.toString() ??
    '—';

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#FBFAF7' }}
      contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
      showsVerticalScrollIndicator={false}
    >
      <YStack alignItems="center" paddingVertical="$8" gap="$2">
        <YStack
          width={80}
          height={80}
          borderRadius={20}
          backgroundColor="$brand/primary"
          justifyContent="center"
          alignItems="center"
        >
          <Text fontSize={40}>🥗</Text>
        </YStack>
        <Text fontSize="$6" fontWeight="700" color="$text/primary">WhatsFresh</Text>
        <Text fontSize="$3" color="$text/tertiary">v{version} ({buildNumber})</Text>
      </YStack>

      <YStack
        marginHorizontal="$4"
        backgroundColor="$surface/raised"
        borderRadius="$lg"
        overflow="hidden"
        borderWidth={1}
        borderColor="$border/subtle"
      >
        <ListRow
          title={t('settings.termsOfService')}
          onPress={() => { void haptics.selection(); Linking.openURL(TERMS_URL); }}
        />
        <View height={1} backgroundColor="$border/subtle" marginHorizontal="$5" />
        <ListRow
          title={t('settings.privacyPolicy')}
          onPress={() => { void haptics.selection(); Linking.openURL(PRIVACY_URL); }}
        />
      </YStack>

      <Text
        fontSize="$2"
        color="$text/tertiary"
        textAlign="center"
        marginTop="$8"
      >
        {t('settings.aboutTagline')}
      </Text>
    </ScrollView>
  );
}
