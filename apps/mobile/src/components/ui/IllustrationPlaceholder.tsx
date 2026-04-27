import React from 'react';
import { YStack, Text } from 'tamagui';

const ILLUSTRATION_ICONS: Record<string, string> = {
  'empty-fridge': '🧊',
  'empty-containers': '📦',
  'empty-recipes': '📖',
  'empty-stats': '📊',
  'empty-search': '🔍',
  'magic-link-sent': '✉️',
  'onboarding-1': '🥦',
  'onboarding-2': '📷',
  'onboarding-3': '🔔',
  'onboarding-4': '✅',
};

interface IllustrationPlaceholderProps {
  name: keyof typeof ILLUSTRATION_ICONS;
  size?: number;
}

/**
 * Placeholder until commissioned SVG/Lottie assets arrive in Phase B.
 * See apps/mobile/assets/illustrations/README.md for the real asset spec.
 */
export function IllustrationPlaceholder({ name, size = 120 }: IllustrationPlaceholderProps) {
  const icon = ILLUSTRATION_ICONS[name] ?? '🖼️';
  return (
    <YStack
      width={size}
      height={size}
      borderRadius={size / 2}
      backgroundColor="$brand/primaryMuted"
      justifyContent="center"
      alignItems="center"
    >
      <Text fontSize={size * 0.4}>{icon}</Text>
    </YStack>
  );
}
