import { YStack, Text } from 'tamagui';

export default function SignInScreen() {
  return (
    <YStack flex={1} justifyContent="center" alignItems="center" padding="$5">
      <Text fontSize="$8" fontWeight="bold" marginBottom="$4">
        What's For Lunch
      </Text>
      <Text fontSize="$5" color="$text/secondary">
        Sign in coming soon (W6 builds this)
      </Text>
    </YStack>
  );
}
