import { Alert, Linking, Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Haptics from 'expo-haptics';
import { useShakeDetection } from './useShakeDetection';

function composeEmail() {
  const version = Constants.expoConfig?.version ?? '1.0.0';
  const os = Platform.OS === 'ios' ? 'iOS' : 'Android';
  const osVersion = Platform.Version;
  const subject = encodeURIComponent('[Bug] WhatsForLunch Report');
  const body = encodeURIComponent(
    `What happened:\n\n\nSteps to reproduce:\n1. \n2. \n\n---\nApp: ${version}  |  OS: ${os} ${osVersion}`
  );
  Linking.openURL(`mailto:support@whatsforlunch.app?subject=${subject}&body=${body}`);
}

/**
 * Mount this component once in the root layout (or the (main) layout) to
 * enable shake-to-report app-wide.
 *
 * In the iOS Simulator use Cmd+Ctrl+Z (Device ▸ Shake) to trigger it.
 */
export function ShakeReporter() {
  useShakeDetection(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    Alert.alert(
      'Report a Bug?',
      'Shake detected. Want to report what just happened?',
      [
        { text: 'Not now', style: 'cancel' },
        { text: 'Report', onPress: composeEmail },
      ]
    );
  });

  return null;
}
