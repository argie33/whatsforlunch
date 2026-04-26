import { YStack, Text } from 'tamagui';

export default function SettingsScreen() {
  return (
    <YStack flex={1} justifyContent="center" alignItems="center" padding="$5">
      <Text fontSize="$6" fontWeight="bold">
        Settings
      </Text>
      <Text fontSize="$4" color="$text/secondary" marginTop="$3">
        W7 builds settings screens
      </Text>
    </YStack>
  );
}
