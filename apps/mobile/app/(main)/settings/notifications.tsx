import React, { useCallback } from 'react';
import { ScrollView, Switch } from 'react-native';
import { YStack, XStack, Text, View } from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { haptics } from '@/lib/haptics';
import * as ExpoNotifications from 'expo-notifications';

import { useUserPreferences } from '@/features/settings/useUserPreferences';
import { useAnalytics } from '@/lib/posthog';
import { SettingsEvents } from '@/features/settings/analytics';
import type { NotificationKind } from '@/features/settings/types';
import { QUIET_HOURS } from '@/features/settings/constants';
import { rescheduleAllNotifications, cancelExpiryNotification } from '@/lib/notifications';
import { useDatabase } from '@/db';
import type { Item } from '@/db/models/Item';

function ToggleRow({
  label,
  value,
  onToggle,
  disabled,
}: {
  label: string;
  value: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) {
  return (
    <XStack
      paddingHorizontal="$5"
      paddingVertical="$4"
      alignItems="center"
      justifyContent="space-between"
    >
      <Text fontSize="$4" color={disabled ? '$text/tertiary' : '$text/primary'}>
        {label}
      </Text>
      <Switch
        value={value}
        onValueChange={() => { void haptics.selection(); onToggle(); }}
        disabled={disabled}
        trackColor={{ true: '#2F7D5B' }}
        accessibilityRole="switch"
        accessibilityLabel={label}
        accessibilityState={{ checked: value, disabled: !!disabled }}
      />
    </XStack>
  );
}

function StepperRow({
  label,
  value,
  onIncrement,
  onDecrement,
}: {
  label: string;
  value: string;
  onIncrement: () => void;
  onDecrement: () => void;
}) {
  return (
    <XStack
      paddingHorizontal="$5"
      paddingVertical="$4"
      alignItems="center"
      justifyContent="space-between"
    >
      <Text fontSize="$4" color="$text/primary">{label}</Text>
      <XStack alignItems="center" gap="$3">
        <Text
          fontSize="$5"
          color="$brand/primary"
          onPress={() => { void haptics.selection(); onDecrement(); }}
          paddingHorizontal="$3"
        >
          −
        </Text>
        <Text fontSize="$4" fontWeight="600" color="$text/primary" minWidth={50} textAlign="center">
          {value}
        </Text>
        <Text
          fontSize="$5"
          color="$brand/primary"
          onPress={() => { void haptics.selection(); onIncrement(); }}
          paddingHorizontal="$3"
        >
          +
        </Text>
      </XStack>
    </XStack>
  );
}

export default function NotificationsScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const db = useDatabase();
  const { prefs, setPrefs } = useUserPreferences();
  const { track } = useAnalytics();

  const getActiveItems = useCallback(async (): Promise<Item[]> => {
    const all = await db.get<Item>('items').query().fetch();
    return all.filter((i) => i.status === 'active' || i.status === 'partial');
  }, [db]);

  const handleMasterToggle = useCallback(async (enabled: boolean) => {
    setPrefs({ notificationsEnabled: enabled });
    track(SettingsEvents.NOTIFICATIONS_TOGGLED, { master: true, enabled });
    if (enabled) {
      const { status } = await ExpoNotifications.requestPermissionsAsync();
      if (status === 'granted') {
        const items = await getActiveItems();
        await rescheduleAllNotifications(items);
      }
    } else {
      await ExpoNotifications.cancelAllScheduledNotificationsAsync();
    }
  }, [setPrefs, track, getActiveItems]);

  const toggleKind = useCallback(async (kind: NotificationKind) => {
    const current = prefs.enabledNotificationKinds;
    const enabling = !current.includes(kind);
    const next = enabling ? [...current, kind] : current.filter((k) => k !== kind);
    setPrefs({ enabledNotificationKinds: next });
    track(SettingsEvents.NOTIFICATIONS_TOGGLED, { kind, enabled: enabling });
    // Reschedule expiry_alert notifications when that kind is toggled
    if (kind === 'expiry_alert' && prefs.notificationsEnabled) {
      const items = await getActiveItems();
      if (enabling) {
        await rescheduleAllNotifications(items);
      } else {
        await Promise.all(items.map((i) => cancelExpiryNotification(i.id)));
      }
    }
  }, [prefs.enabledNotificationKinds, prefs.notificationsEnabled, setPrefs, track, getActiveItems]);

  const stepHour = useCallback((key: 'quietHoursStart' | 'quietHoursEnd', delta: 1 | -1) => {
    const current = prefs[key];
    const idx = QUIET_HOURS.indexOf(current);
    const next = QUIET_HOURS[(idx + delta + QUIET_HOURS.length) % QUIET_HOURS.length];
    setPrefs({ [key]: next });
  }, [prefs, setPrefs]);

  const on = prefs.notificationsEnabled;

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
          label={t('settings.notifications.enabled')}
          value={on}
          onToggle={() => handleMasterToggle(!on)}
        />
      </YStack>

      <YStack
        marginHorizontal="$4"
        marginTop="$4"
        backgroundColor="$surface/raised"
        borderRadius="$lg"
        overflow="hidden"
        borderWidth={1}
        borderColor="$border/subtle"
      >
        {([
          { kind: 'expiry_alert' as const, label: t('settings.notifications.expiryAlert') },
          { kind: 'daily_digest' as const, label: t('settings.notifications.dailyDigest') },
          { kind: 'household' as const, label: t('settings.notifications.householdUpdates') },
          { kind: 'system' as const, label: t('settings.notifications.systemUpdates') },
        ] as const).map(({ kind, label }, i) => (
          <React.Fragment key={kind}>
            {i > 0 && <View height={1} backgroundColor="$border/subtle" marginHorizontal="$5" />}
            <ToggleRow
              label={label}
              value={prefs.enabledNotificationKinds.includes(kind)}
              onToggle={() => toggleKind(kind)}
              disabled={!on}
            />
          </React.Fragment>
        ))}
      </YStack>

      <Text
        fontSize="$3"
        fontWeight="600"
        color="$text/tertiary"
        textTransform="uppercase"
        letterSpacing={0.5}
        paddingHorizontal="$5"
        paddingTop="$5"
        paddingBottom="$2"
      >
        {t('settings.notifications.quietHours')}
      </Text>
      <YStack
        marginHorizontal="$4"
        backgroundColor="$surface/raised"
        borderRadius="$lg"
        overflow="hidden"
        borderWidth={1}
        borderColor="$border/subtle"
      >
        <StepperRow
          label={t('settings.notifications.quietFrom')}
          value={prefs.quietHoursStart}
          onIncrement={() => stepHour('quietHoursStart', 1)}
          onDecrement={() => stepHour('quietHoursStart', -1)}
        />
        <View height={1} backgroundColor="$border/subtle" marginHorizontal="$5" />
        <StepperRow
          label={t('settings.notifications.quietTo')}
          value={prefs.quietHoursEnd}
          onIncrement={() => stepHour('quietHoursEnd', 1)}
          onDecrement={() => stepHour('quietHoursEnd', -1)}
        />
      </YStack>
    </ScrollView>
  );
}
