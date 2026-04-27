import { ScrollView, Linking, Alert } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import Constants from 'expo-constants';

const version = Constants.expoConfig?.version ?? '1.0.0';
const buildNumber =
  (Constants.expoConfig?.ios?.buildNumber ?? Constants.expoConfig?.android?.versionCode?.toString()) ?? '1';

type ActionRowProps = {
  label: string;
  onPress: () => void;
  isFirst?: boolean;
  isLast?: boolean;
};

function ActionRow({ label, onPress, isFirst, isLast }: ActionRowProps) {
  return (
    <>
      <XStack
        backgroundColor="$surface/raised"
        paddingHorizontal="$4"
        paddingVertical="$3"
        alignItems="center"
        minHeight={44}
        onPress={onPress}
        pressStyle={{ opacity: 0.65 }}
        borderTopLeftRadius={isFirst ? '$md' : 0}
        borderTopRightRadius={isFirst ? '$md' : 0}
        borderBottomLeftRadius={isLast ? '$md' : 0}
        borderBottomRightRadius={isLast ? '$md' : 0}
      >
        <Text flex={1} fontSize={17} color="$text/primary">{label}</Text>
        <Text fontSize={22} color="$text/tertiary" lineHeight={22}>›</Text>
      </XStack>
      {!isLast && (
        <YStack height={0.5} backgroundColor="$border/subtle" marginLeft="$4" />
      )}
    </>
  );
}

function InfoRow({ label, value, isFirst, isLast }: { label: string; value: string; isFirst?: boolean; isLast?: boolean }) {
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
        <Text fontSize={17} color="$text/tertiary">{value}</Text>
      </XStack>
      {!isLast && (
        <YStack height={0.5} backgroundColor="$border/subtle" marginLeft="$4" />
      )}
    </>
  );
}

function openURL(url: string) {
  Linking.canOpenURL(url)
    .then(can => {
      if (can) Linking.openURL(url);
      else Alert.alert('Error', 'Cannot open this link.');
    })
    .catch(() => Alert.alert('Error', 'Cannot open this link.'));
}

export default function AboutScreen() {
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#FBFAF7' }}
      contentInsetAdjustmentBehavior="automatic"
    >
      <YStack paddingBottom="$10">

        {/* App identity */}
        <YStack alignItems="center" paddingTop="$8" paddingBottom="$6" gap="$2">
          <YStack
            width={72}
            height={72}
            borderRadius="$lg"
            backgroundColor="$brand/primaryMuted"
            alignItems="center"
            justifyContent="center"
          >
            <Text fontSize={36}>🥗</Text>
          </YStack>
          <Text fontSize={22} fontWeight="700" color="$text/primary" marginTop="$3">
            WhatsForLunch
          </Text>
          <Text fontSize={15} color="$text/tertiary">
            Version {version} ({buildNumber})
          </Text>
        </YStack>

        {/* Version info */}
        <YStack marginHorizontal="$5" borderRadius="$md" overflow="hidden">
          <InfoRow label="Version" value={version} isFirst />
          <InfoRow label="Build" value={buildNumber} isLast />
        </YStack>

        {/* Legal */}
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
          Legal
        </Text>
        <YStack marginHorizontal="$5" borderRadius="$md" overflow="hidden">
          <ActionRow
            label="Terms of Service"
            onPress={() => openURL('https://whatsforlunch.app/terms')}
            isFirst
          />
          <ActionRow
            label="Privacy Policy"
            onPress={() => openURL('https://whatsforlunch.app/privacy')}
            isLast
          />
        </YStack>

        {/* Acknowledgements */}
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
          Open Source
        </Text>
        <YStack marginHorizontal="$5" borderRadius="$md" overflow="hidden">
          <ActionRow
            label="Acknowledgements"
            onPress={() => Alert.alert('Open Source', 'Built with Expo, Tamagui, AWS Amplify, and many other amazing open source libraries.')}
            isFirst
            isLast
          />
        </YStack>

        <Text
          fontSize={13}
          color="$text/tertiary"
          textAlign="center"
          paddingTop="$8"
          paddingHorizontal="$5"
        >
          Made with care to reduce food waste.{'\n'}
          © {new Date().getFullYear()} WhatsForLunch
        </Text>

      </YStack>
    </ScrollView>
  );
}
