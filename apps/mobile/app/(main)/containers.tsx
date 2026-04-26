import { YStack, Text } from 'tamagui';

export default function ContainersScreen() {
  return (
    <YStack flex={1} justifyContent="center" alignItems="center" padding="$5">
      <Text fontSize="$6" fontWeight="bold">
        Containers
      </Text>
      <Text fontSize="$4" color="$text/secondary" marginTop="$3">
        W6 builds container management
      </Text>
    </YStack>
  );
}
