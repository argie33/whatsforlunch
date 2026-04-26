import { YStack, Text } from 'tamagui';

export default function DashboardScreen() {
  return (
    <YStack flex={1} justifyContent="center" alignItems="center" padding="$5">
      <Text fontSize="$6" fontWeight="bold">
        Dashboard
      </Text>
      <Text fontSize="$4" color="$text/secondary" marginTop="$3">
        W6 builds this
      </Text>
    </YStack>
  );
}
