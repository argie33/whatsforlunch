import React from 'react';
import { YStack, Text } from 'tamagui';
import {
  EmptyFridge,
  EmptyContainers,
  EmptyRecipes,
  MagicLinkSent,
  Onboarding1,
  Onboarding2,
  Onboarding3,
  Onboarding4,
} from '../../../assets/illustrations';

export type IllustrationName =
  | 'empty-fridge'
  | 'empty-containers'
  | 'empty-recipes'
  | 'empty-stats'
  | 'empty-search'
  | 'magic-link-sent'
  | 'onboarding-1'
  | 'onboarding-2'
  | 'onboarding-3'
  | 'onboarding-4';

const SVG_MAP: Partial<Record<IllustrationName, React.FC<{ width?: number; height?: number }>>> = {
  'empty-fridge': EmptyFridge,
  'empty-containers': EmptyContainers,
  'empty-recipes': EmptyRecipes,
  'magic-link-sent': MagicLinkSent,
  'onboarding-1': Onboarding1,
  'onboarding-2': Onboarding2,
  'onboarding-3': Onboarding3,
  'onboarding-4': Onboarding4,
};

const FALLBACK_ICONS: Record<IllustrationName, string> = {
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
  name: IllustrationName;
  size?: number;
}

export function IllustrationPlaceholder({ name, size = 200 }: IllustrationPlaceholderProps) {
  const SvgComponent = SVG_MAP[name];

  if (SvgComponent) {
    return <SvgComponent width={size} height={size} />;
  }

  return (
    <YStack
      width={size}
      height={size}
      borderRadius={size / 2}
      backgroundColor="$brand/primaryMuted"
      justifyContent="center"
      alignItems="center"
    >
      <Text fontSize={size * 0.35}>{FALLBACK_ICONS[name] ?? '🖼️'}</Text>
    </YStack>
  );
}
