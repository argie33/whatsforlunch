import { useCallback } from 'react';
import { Alert, Linking } from 'react-native';
import * as Haptics from 'expo-haptics';
import Constants from 'expo-constants';
import { useShakeDetection } from './useShakeDetection';

// W5: also mount <ShakeReporter /> in app/(main)/_layout.tsx for global coverage
export function ShakeReporter() {
  const handleShake = useCallback(async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      'Report a Bug?',
      'Shake detected. Want to report what just happened?',
      [
        { text: 'Not now', style: 'cancel' },
        {
          text: 'Report',
          onPress: () => {
            const version = Constants.expoConfig?.version ?? 'unknown';
            const build = Constants.expoConfig?.ios?.buildNumber ?? 'unknown';
            const subject = encodeURIComponent(`Bug Report — WhatsForLunch v${version}`);
            const body = encodeURIComponent(
              `Describe what happened:\n\n\n---\nVersion: ${version} (${build})\nPlatform: iOS`,
            );
            Linking.openURL(`mailto:support@whatsforlunch.app?subject=${subject}&body=${body}`);
          },
        },
      ],
    );
  }, []);

  useShakeDetection(handleShake);
  return null;
}
