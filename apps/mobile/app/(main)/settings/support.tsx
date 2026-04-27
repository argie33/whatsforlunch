import { ScrollView, Linking, Alert, Platform } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import Constants from 'expo-constants';

type ActionRowProps = {
  label: string;
  subtitle?: string;
  onPress: () => void;
  isFirst?: boolean;
  isLast?: boolean;
};

function ActionRow({ label, subtitle, onPress, isFirst, isLast }: ActionRowProps) {
  return (
    <>
      <XStack
        backgroundColor="$surface/raised"
        paddingHorizontal="$4"
        paddingVertical="$3"
        alignItems="center"
        minHeight={subtitle ? 56 : 44}
        gap="$3"
        onPress={onPress}
        pressStyle={{ opacity: 0.65 }}
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
        <Text fontSize={22} color="$text/tertiary" lineHeight={22}>›</Text>
      </XStack>
      {!isLast && (
        <YStack height={0.5} backgroundColor="$border/subtle" marginLeft="$4" />
      )}
    </>
  );
}

function composeEmail(subject: string, body: string) {
  const version = Constants.expoConfig?.version ?? '1.0.0';
  const os = Platform.OS === 'ios' ? 'iOS' : 'Android';
  const osVersion = Platform.Version;
  const fullBody = `${body}\n\n---\nApp: WhatsForLunch ${version}\nOS: ${os} ${osVersion}`;
  const url = `mailto:support@whatsforlunch.app?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(fullBody)}`;
  Linking.openURL(url).catch(() =>
    Alert.alert('Error', 'Could not open email app.')
  );
}

export default function SupportScreen() {
  function handleFAQ() {
    Linking.openURL('https://whatsforlunch.app/faq').catch(() =>
      Alert.alert('Error', 'Could not open FAQ.')
    );
  }

  function handleContact() {
    composeEmail('WhatsForLunch Support', 'Hi, I need help with...');
  }

  function handleBugReport() {
    composeEmail(
      'Bug Report — WhatsForLunch',
      'Steps to reproduce:\n1. \n2. \n3. \n\nExpected behaviour:\n\nActual behaviour:\n'
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#FBFAF7' }}
      contentInsetAdjustmentBehavior="automatic"
    >
      <YStack paddingBottom="$10">

        <YStack height="$6" />

        {/* Resources */}
        <YStack marginHorizontal="$5" borderRadius="$md" overflow="hidden">
          <ActionRow
            label="Browse FAQ"
            subtitle="Answers to common questions"
            onPress={handleFAQ}
            isFirst
          />
          <ActionRow
            label="Email us"
            subtitle="support@whatsforlunch.app"
            onPress={handleContact}
          />
          <ActionRow
            label="Report a bug"
            subtitle="Opens your email with device info attached"
            onPress={handleBugReport}
            isLast
          />
        </YStack>

        {/* Response time note */}
        <Text
          fontSize={13}
          color="$text/tertiary"
          paddingHorizontal="$5"
          paddingTop="$4"
          lineHeight={18}
        >
          We typically respond within 1–2 business days. For urgent issues, include "URGENT" in the subject line.
        </Text>

      </YStack>
    </ScrollView>
  );
}
