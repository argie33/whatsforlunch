import { ScrollView, Switch } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { useUserPreferences } from '@/features/settings';
import type { NotificationKind } from '@/features/settings';

function SectionHeader({ title }: { title: string }) {
  return (
    <Text
      fontSize={13}
      fontWeight="500"
      color="$text/tertiary"
      textTransform="uppercase"
      letterSpacing={0.4}
      paddingHorizontal="$5"
      paddingTop="$6"
      paddingBottom="$2"
    >
      {title}
    </Text>
  );
}

function ToggleRow({
  label,
  subtitle,
  value,
  onValueChange,
  isFirst,
  isLast,
  disabled,
}: {
  label: string;
  subtitle?: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  isFirst?: boolean;
  isLast?: boolean;
  disabled?: boolean;
}) {
  return (
    <>
      <XStack
        backgroundColor="$surface/raised"
        paddingHorizontal="$4"
        paddingVertical="$3"
        alignItems="center"
        minHeight={52}
        gap="$3"
        borderTopLeftRadius={isFirst ? '$md' : 0}
        borderTopRightRadius={isFirst ? '$md' : 0}
        borderBottomLeftRadius={isLast ? '$md' : 0}
        borderBottomRightRadius={isLast ? '$md' : 0}
        opacity={disabled ? 0.4 : 1}
      >
        <YStack flex={1}>
          <Text fontSize={17} color="$text/primary">{label}</Text>
          {subtitle && (
            <Text fontSize={13} color="$text/tertiary" marginTop="$1">{subtitle}</Text>
          )}
        </YStack>
        <Switch
          value={value}
          onValueChange={disabled ? undefined : onValueChange}
          trackColor={{ false: '#D2CFC7', true: '#2F7D5B' }}
          thumbColor="#FFFFFF"
        />
      </XStack>
      {!isLast && (
        <YStack height={0.5} backgroundColor="$border/subtle" marginLeft="$4" />
      )}
    </>
  );
}

const KIND_LABELS: Record<NotificationKind, { label: string; subtitle: string }> = {
  expiry_alert: { label: 'Expiry alerts', subtitle: 'When items are about to expire' },
  daily_digest: { label: 'Daily digest', subtitle: 'Morning summary of your kitchen' },
  household: { label: 'Household activity', subtitle: 'When members add or update items' },
  system: { label: 'App updates', subtitle: 'Important account and billing notices' },
};

const ALL_KINDS: NotificationKind[] = ['expiry_alert', 'daily_digest', 'household', 'system'];

export default function NotificationsScreen() {
  const { prefs, setPrefs } = useUserPreferences();

  function toggleKind(kind: NotificationKind, enabled: boolean) {
    const next = enabled
      ? [...prefs.enabledNotificationKinds, kind]
      : prefs.enabledNotificationKinds.filter(k => k !== kind);
    setPrefs({ enabledNotificationKinds: next });
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#FBFAF7' }}
      contentInsetAdjustmentBehavior="automatic"
    >
      <YStack paddingBottom="$10">

        <YStack height="$6" />
        <YStack marginHorizontal="$5" borderRadius="$md" overflow="hidden">
          <ToggleRow
            label="Notifications"
            subtitle="Allow WhatsForLunch to send notifications"
            value={prefs.notificationsEnabled}
            onValueChange={(v) => setPrefs({ notificationsEnabled: v })}
            isFirst
            isLast
          />
        </YStack>

        <SectionHeader title="Alert Types" />
        <YStack marginHorizontal="$5" borderRadius="$md" overflow="hidden">
          {ALL_KINDS.map((kind, i) => (
            <ToggleRow
              key={kind}
              label={KIND_LABELS[kind].label}
              subtitle={KIND_LABELS[kind].subtitle}
              value={prefs.enabledNotificationKinds.includes(kind)}
              onValueChange={(v) => toggleKind(kind, v)}
              isFirst={i === 0}
              isLast={i === ALL_KINDS.length - 1}
              disabled={!prefs.notificationsEnabled}
            />
          ))}
        </YStack>

        <SectionHeader title="Quiet Hours" />
        <Text fontSize={13} color="$text/tertiary" paddingHorizontal="$5" paddingBottom="$2">
          No notifications will be sent during these hours.
        </Text>
        <YStack marginHorizontal="$5" borderRadius="$md" overflow="hidden">
          <QuietHourRow
            label="From"
            value={prefs.quietHoursStart}
            onChange={(v) => setPrefs({ quietHoursStart: v })}
            isFirst
          />
          <QuietHourRow
            label="To"
            value={prefs.quietHoursEnd}
            onChange={(v) => setPrefs({ quietHoursEnd: v })}
            isLast
          />
        </YStack>

      </YStack>
    </ScrollView>
  );
}

function QuietHourRow({
  label,
  value,
  onChange,
  isFirst,
  isLast,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  isFirst?: boolean;
  isLast?: boolean;
}) {
  const hours = Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, '0')}:00`);
  const currentIndex = hours.indexOf(value);

  function cycle(direction: 1 | -1) {
    const next = (currentIndex + direction + 24) % 24;
    onChange(hours[next]);
  }

  return (
    <>
      <XStack
        backgroundColor="$surface/raised"
        paddingHorizontal="$4"
        paddingVertical="$3"
        alignItems="center"
        minHeight={44}
        borderTopLeftRadius={isFirst ? '$md' : 0}
        borderTopRightRadius={isFirst ? '$md' : 0}
        borderBottomLeftRadius={isLast ? '$md' : 0}
        borderBottomRightRadius={isLast ? '$md' : 0}
      >
        <Text flex={1} fontSize={17} color="$text/primary">{label}</Text>
        <XStack alignItems="center" gap="$3">
          <YStack onPress={() => cycle(-1)} pressStyle={{ opacity: 0.5 }} padding="$1">
            <Text fontSize={20} color="$text/tertiary">‹</Text>
          </YStack>
          <Text fontSize={17} fontWeight="500" color="$text/primary" minWidth={52} textAlign="center">
            {value}
          </Text>
          <YStack onPress={() => cycle(1)} pressStyle={{ opacity: 0.5 }} padding="$1">
            <Text fontSize={20} color="$text/tertiary">›</Text>
          </YStack>
        </XStack>
      </XStack>
      {!isLast && (
        <YStack height={0.5} backgroundColor="$border/subtle" marginLeft="$4" />
      )}
    </>
  );
}
