import { useEffect, useState } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';

/** Returns true while VoiceOver (iOS) or TalkBack (Android) is running. */
export function useScreenReaderEnabled(): boolean {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isScreenReaderEnabled().then(setEnabled).catch(() => {});
    const sub = AccessibilityInfo.addEventListener('screenReaderChanged', setEnabled);
    return () => sub.remove();
  }, []);
  return enabled;
}

/** Returns true when the user has Reduce Motion enabled. */
export function useReduceMotion(): boolean {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setEnabled).catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setEnabled);
    return () => sub.remove();
  }, []);
  return enabled;
}

/** Returns true when high-contrast text is preferred (iOS only). */
export function useHighContrast(): boolean {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    AccessibilityInfo.isHighTextContrastEnabled().then(setEnabled).catch(() => {});
    const sub = AccessibilityInfo.addEventListener('highTextContrastChanged', setEnabled);
    return () => sub.remove();
  }, []);
  return enabled;
}

/**
 * Returns translated accessibility labels for item status stripes.
 * Use as `accessibilityLabel` on the colored status stripe View.
 */
export function useStatusLabel(status: 'fresh' | 'soon' | 'urgent' | 'expired' | 'frozen', daysLeft?: number) {
  const { t } = useTranslation();
  if (status === 'fresh') return t('accessibility.statusFresh', { days: daysLeft ?? '' });
  if (status === 'soon') return t('accessibility.statusSoon', { days: daysLeft ?? '' });
  if (status === 'urgent') return t('accessibility.statusUrgent');
  if (status === 'expired') return t('accessibility.statusExpired', { days: Math.abs(daysLeft ?? 0) });
  return t('items.statusFrozen');
}

/**
 * Announce a message to the screen reader (post-action feedback).
 * Prefer haptics + this over alert dialogs when possible.
 */
export function announce(message: string): void {
  AccessibilityInfo.announceForAccessibility(message);
}
