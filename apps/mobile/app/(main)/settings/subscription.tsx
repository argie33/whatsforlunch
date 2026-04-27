import React from 'react';
import { ScrollView } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';

const PREMIUM_FEATURES = [
  { title: 'Unlimited containers', icon: '📦' },
  { title: 'AI recipe suggestions', icon: '🤖' },
  { title: 'Household sync (up to 6)', icon: '👨‍👩‍👧‍👦' },
  { title: 'Export & backup', icon: '☁️' },
];

export default function SubscriptionScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#FBFAF7' }}
      contentContainerStyle={{ paddingBottom: insets.bottom + 32, paddingHorizontal: 20, paddingTop: 24 }}
      showsVerticalScrollIndicator={false}
    >
      <YStack
        backgroundColor="$surface/raised"
        borderRadius="$lg"
        padding="$5"
        borderWidth={1}
        borderColor="$border/subtle"
        marginBottom="$5"
        gap="$3"
      >
        <Text fontSize="$3" color="$text/secondary" fontWeight="500">
          {t('settings.subscription.currentPlan')}
        </Text>
        <XStack alignItems="center" gap="$3">
          <Text fontSize="$6" fontWeight="700" color="$text/primary">
            {t('settings.subscription.free')}
          </Text>
          <StatusBadge status="fresh" label="Active" />
        </XStack>
      </YStack>

      <YStack
        backgroundColor="$surface/raised"
        borderRadius="$lg"
        padding="$5"
        borderWidth={1}
        borderColor="$brand/primaryMuted"
        gap="$4"
        marginBottom="$5"
      >
        <Text fontSize="$5" fontWeight="700" color="$brand/primary">
          Premium
        </Text>
        <YStack gap="$3">
          {PREMIUM_FEATURES.map((f) => (
            <XStack key={f.title} alignItems="center" gap="$3">
              <Text fontSize={20}>{f.icon}</Text>
              <Text fontSize="$4" color="$text/primary">{f.title}</Text>
            </XStack>
          ))}
        </YStack>
        <Button variant="filled" size="lg" disabled>
          {t('settings.subscription.upgrade')} — Wave 2
        </Button>
      </YStack>

      <Text fontSize="$3" color="$text/tertiary" textAlign="center">
        {t('settings.subscription.restore')}
      </Text>
    </ScrollView>
  );
}
