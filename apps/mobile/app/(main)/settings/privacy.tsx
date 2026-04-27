import { ScrollView, Switch, Alert } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { Button } from '@/components/ui';
import { useUserPreferences, SettingsEvents } from '@/features/settings';
import { trackExportDataRequested } from '@/features/settings/analytics';
import { useAnalytics } from '@/lib/posthog';

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
}: {
  label: string;
  subtitle?: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  isFirst?: boolean;
  isLast?: boolean;
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
      >
        <YStack flex={1}>
          <Text fontSize={17} color="$text/primary">{label}</Text>
          {subtitle && (
            <Text fontSize={13} color="$text/tertiary" marginTop="$1">{subtitle}</Text>
          )}
        </YStack>
        <Switch
          value={value}
          onValueChange={onValueChange}
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

export default function PrivacyScreen() {
  const { prefs, setPrefs } = useUserPreferences();
  const { track } = useAnalytics();

  function handleExport() {
    Alert.alert(
      'Export My Data',
      'We\'ll prepare a CSV of all your food data and send it to your email. This may take a few minutes.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Export',
          onPress: () => {
            trackExportDataRequested();
            track(SettingsEvents.EXPORT_DATA_REQUESTED);
            // TODO: call W2 exportData mutation when AppSync is live
            Alert.alert('Export Started', 'You\'ll receive an email when your data is ready.');
          },
        },
      ]
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#FBFAF7' }}
      contentInsetAdjustmentBehavior="automatic"
    >
      <YStack paddingBottom="$10">

        <SectionHeader title="AI & Photos" />
        <YStack marginHorizontal="$5" borderRadius="$md" overflow="hidden">
          <ToggleRow
            label="Delete photos after AI scan"
            subtitle="Photos are used only to identify food, then deleted immediately."
            value={prefs.deletePhotosAfterAI}
            onValueChange={(v) => setPrefs({ deletePhotosAfterAI: v })}
            isFirst
            isLast
          />
        </YStack>

        <SectionHeader title="Analytics" />
        <YStack marginHorizontal="$5" borderRadius="$md" overflow="hidden">
          <ToggleRow
            label="Share crash reports"
            subtitle="Helps us fix bugs. No personal data included."
            value={prefs.shareAnalytics}
            onValueChange={(v) => setPrefs({ shareAnalytics: v })}
            isFirst
            isLast
          />
        </YStack>

        <SectionHeader title="Your Data" />
        <YStack marginHorizontal="$5" gap="$3">
          <Text fontSize={15} color="$text/secondary" lineHeight={22}>
            You own your data. Export a complete copy at any time, or delete your account to remove everything permanently.
          </Text>
          <Button
            variant="tinted"
            size="lg"
            onPress={handleExport}
            accessibilityLabel="Export my data"
          >
            Export my data
          </Button>
        </YStack>

      </YStack>
    </ScrollView>
  );
}
