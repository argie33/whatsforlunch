import * as Haptics from 'expo-haptics';
import { AccessibilityInfo } from 'react-native';

let _reduceMotionEnabled: boolean | null = null;

async function isReduceMotionEnabled(): Promise<boolean> {
  if (_reduceMotionEnabled !== null) return _reduceMotionEnabled;
  try {
    _reduceMotionEnabled = await AccessibilityInfo.isReduceMotionEnabled();
  } catch {
    _reduceMotionEnabled = false;
  }
  return _reduceMotionEnabled;
}

AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
  _reduceMotionEnabled = enabled;
});

/**
 * Semantic haptic actions — use these instead of calling expo-haptics directly.
 * All methods respect the user's Reduce Motion accessibility setting.
 */
export const haptics = {
  /** Light tap feedback: filter chips, tab selection, minor toggles */
  selection: async () => {
    if (await isReduceMotionEnabled()) return;
    await Haptics.selectionAsync();
  },

  /** Card tap, button press, any navigation interaction */
  tap: async () => {
    if (await isReduceMotionEnabled()) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  },

  /** FAB open, bottom sheet expand, significant action */
  medium: async () => {
    if (await isReduceMotionEnabled()) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  },

  /** Shutter press, destructive confirm, strong commit */
  heavy: async () => {
    if (await isReduceMotionEnabled()) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  },

  /** Scan success, item saved, streak milestone */
  success: async () => {
    if (await isReduceMotionEnabled()) return;
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  },

  /** Sync failure, error toast, failed action */
  error: async () => {
    if (await isReduceMotionEnabled()) return;
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  },

  /** Mark tossed, destructive swipe threshold reached */
  warning: async () => {
    if (await isReduceMotionEnabled()) return;
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  },
};
