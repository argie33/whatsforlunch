import { ScrollView, Alert } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { Button } from '@/components/ui';

const PREMIUM_FEATURES = [
  { icon: '🤖', title: 'AI Recipe Suggestions', body: 'Get personalised recipes based on what\'s in your fridge.' },
  { icon: '🍽️', title: 'Restaurant Suggestions', body: 'AI-powered dining picks based on your taste profile.' },
  { icon: '👨‍👩‍👧', title: 'Shared Households', body: 'Sync with family or roommates in real time.' },
  { icon: '📊', title: 'Advanced Stats', body: 'Track waste trends, savings, and streaks over time.' },
];

export default function SubscriptionScreen() {
  function handleUpgrade() {
    // RevenueCat integration — Wave 2
    Alert.alert(
      'Coming Soon',
      'Premium subscriptions launch with Wave 2. Join our beta to be first to know!'
    );
  }

  function handleRestore() {
    Alert.alert('Restore Purchases', 'No purchases to restore on the free plan.');
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#FBFAF7' }}
      contentInsetAdjustmentBehavior="automatic"
    >
      <YStack paddingHorizontal="$5" paddingBottom="$10">

        {/* Current plan badge */}
        <YStack
          backgroundColor="$surface/raised"
          borderRadius="$lg"
          padding="$5"
          marginTop="$6"
          alignItems="center"
          gap="$2"
        >
          <Text fontSize={13} color="$text/tertiary" textTransform="uppercase" letterSpacing={0.4}>
            Current Plan
          </Text>
          <Text fontSize={28} fontWeight="700" color="$text/primary">Free</Text>
          <Text fontSize={15} color="$text/secondary">Unlimited food tracking, forever free.</Text>
        </YStack>

        {/* Premium features */}
        <Text
          fontSize={13}
          fontWeight="500"
          color="$text/tertiary"
          textTransform="uppercase"
          letterSpacing={0.4}
          paddingTop="$7"
          paddingBottom="$3"
        >
          Unlock with Premium
        </Text>
        <YStack gap="$3">
          {PREMIUM_FEATURES.map(f => (
            <XStack
              key={f.title}
              backgroundColor="$surface/raised"
              borderRadius="$md"
              padding="$4"
              gap="$3"
              alignItems="flex-start"
            >
              <Text fontSize={24}>{f.icon}</Text>
              <YStack flex={1} gap="$1">
                <Text fontSize={15} fontWeight="600" color="$text/primary">{f.title}</Text>
                <Text fontSize={13} color="$text/secondary">{f.body}</Text>
              </YStack>
            </XStack>
          ))}
        </YStack>

        {/* CTA */}
        <YStack paddingTop="$7" gap="$3">
          <Button
            variant="filled"
            size="lg"
            onPress={handleUpgrade}
            accessibilityLabel="Upgrade to Premium"
          >
            Upgrade to Premium
          </Button>
          <Button
            variant="plain"
            size="md"
            onPress={handleRestore}
            accessibilityLabel="Restore purchases"
          >
            Restore purchases
          </Button>
        </YStack>

        <Text
          fontSize={12}
          color="$text/tertiary"
          textAlign="center"
          paddingTop="$4"
          lineHeight={16}
        >
          Pricing shown at purchase. Subscription auto-renews. Cancel anytime.
        </Text>

      </YStack>
    </ScrollView>
  );
}
