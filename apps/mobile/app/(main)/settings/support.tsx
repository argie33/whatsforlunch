import { YStack, Text } from 'tamagui';

export default function SupportScreen() {
  return (
    <YStack flex={1} backgroundColor="$surface/base" justifyContent="center" alignItems="center" gap="$3" padding="$8">
      <Text fontSize={48}>💬</Text>
      <Text fontSize={20} fontWeight="600" color="$text/primary">Help & Support</Text>
      <Text fontSize={15} color="$text/tertiary" textAlign="center">
        FAQ, contact form, and bug reporter with auto-attached device info — Phase C
      </Text>
    </YStack>
  );
}
