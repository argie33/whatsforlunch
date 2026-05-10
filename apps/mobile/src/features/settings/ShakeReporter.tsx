import { useCallback } from 'react';
import { Alert, Linking, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import Constants from 'expo-constants';
import { haptics } from '@/lib/haptics';
import { useShakeDetection } from './useShakeDetection';

// W5: also mount <ShakeReporter /> in app/(main)/_layout.tsx for global coverage
export function ShakeReporter() {
  const { t } = useTranslation();

  const handleShake = useCallback(async () => {
    await haptics.warning();
    Alert.alert(
      t('settings.shakeReport.title'),
      t('settings.shakeReport.body'),
      [
        { text: t('settings.shakeReport.notNow'), style: 'cancel' },
        {
          text: t('settings.shakeReport.report'),
          onPress: () => {
            const version = Constants.expoConfig?.version ?? 'unknown';
            const build = Constants.expoConfig?.ios?.buildNumber ?? 'unknown';
            const subject = encodeURIComponent(`Bug Report — WhatsFresh v${version}`);
            const body = encodeURIComponent(
              `Describe what happened:\n\n\n---\nVersion: ${version} (${build})\nPlatform: ${Platform.OS}`,
            );
            Linking.openURL(`mailto:support@whatsfresh.app?subject=${subject}&body=${body}`);
          },
        },
      ],
    );
  }, [t]);

  useShakeDetection(handleShake);
  return null;
}
