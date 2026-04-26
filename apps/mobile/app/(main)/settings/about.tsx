import { YStack, Text } from 'tamagui';

export default function AboutScreen() {
  return (
    <YStack flex={1} backgroundColor="$surface/base" justifyContent="center" alignItems="center" gap="$3" padding="$8">
      <Text fontSize={48}>🥗</Text>
      <Text fontSize={20} fontWeight="600" color="$text/primary">WhatsForLunch</Text>
      <Text fontSize={15} color="$text/secondary">Version 1.0.0</Text>
      <Text fontSize={15} color="$text/tertiary" textAlign="center" marginTop="$3">
        Terms of Service and Privacy Policy links — Phase B
      </Text>
    </YStack>
  );
}
