import React from 'react';
import { YStack, Text } from 'tamagui';
import {
  EmptyFridge,
  EmptyContainers,
  EmptyRecipes,
  EmptyStats,
  MagicLinkSent,
  Logo,
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
  | 'email-sent'
  | 'logo'
  | 'onboarding-1'
  | 'onboarding-2'
  | 'onboarding-3'
  | 'onboarding-4';

type SvgComponent = React.FC<{ width?: number; height?: number }>;

const SVG_MAP: Partial<Record<IllustrationName, SvgComponent>> = {
  'empty-fridge': EmptyFridge,
  'empty-containers': EmptyContainers,
  'empty-recipes': EmptyRecipes,
  'empty-stats': EmptyStats,
  'magic-link-sent': MagicLinkSent,
  'email-sent': MagicLinkSent,
  'logo': Logo,
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
  'email-sent': '✉️',
  'logo': '🥦',
  'onboarding-1': '🥦',
  'onboarding-2': '📷',
  'onboarding-3': '🔔',
  'onboarding-4': '✅',
};

interface IllustrationPlaceholderProps {
  name: IllustrationName;
  /** Square size shorthand — overridden by explicit width/height */
  size?: number;
  width?: number;
  height?: number;
}

export function IllustrationPlaceholder({
  name,
  size = 200,
  width,
  height,
}: IllustrationPlaceholderProps) {
  const w = width ?? size;
  const h = height ?? size;
  const SvgComponent = SVG_MAP[name];

  if (SvgComponent) {
    return <SvgComponent width={w} height={h} />;
  }

  const dim = Math.min(w, h);
  return (
    <YStack
      width={w}
      height={h}
      borderRadius={dim / 2}
      backgroundColor="$brand/primaryMuted"
      justifyContent="center"
      alignItems="center"
    >
      <Text fontSize={dim * 0.35}>{FALLBACK_ICONS[name] ?? '🖼️'}</Text>
    </YStack>
  );
}
