import { YStack, Text } from 'tamagui';

export default function NotificationsScreen() {
  return (
    <YStack flex={1} backgroundColor="$surface/base" justifyContent="center" alignItems="center" gap="$3" padding="$8">
      <Text fontSize={48}>🔔</Text>
      <Text fontSize={20} fontWeight="600" color="$text/primary">Notifications</Text>
      <Text fontSize={15} color="$text/tertiary" textAlign="center">
        Notification kinds, quiet hours, and sound settings — Phase B
      </Text>
    </YStack>
  );
}
