import React from 'react';
import { YStack, XStack, View } from 'tamagui';
import { Animated, Pressable } from 'react-native';

export type CardVariant = 'default' | 'interactive' | 'statusStripe';

interface CardProps {
  variant?: CardVariant;
  status?: 'fresh' | 'soon' | 'urgent' | 'expired';
  onPress?: () => void;
  children: React.ReactNode;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

const statusStripeColor = {
  fresh: '$status/fresh',
  soon: '$status/soon',
  urgent: '$status/urgent',
  expired: '$status/expired',
};

export function Card({
  variant = 'default',
  status,
  onPress,
  children,
  accessibilityLabel,
  accessibilityHint,
}: CardProps) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        borderRadius: 20,
        overflow: 'hidden',
      }}
      {...(onPress
        ? {
            accessibilityRole: 'button',
            accessibilityLabel: accessibilityLabel,
            accessibilityHint: accessibilityHint,
          }
        : { accessible: false })}
    >
      <XStack
        backgroundColor="$surface/raised"
        borderRadius="$lg"
        overflow="hidden"
        borderWidth={1}
        borderColor="$border/subtle"
        {...(variant === 'interactive' && {
          pressStyle: {
            scale: 0.98,
            opacity: 0.9,
          },
        })}
      >
        {variant === 'statusStripe' && status && (
          <View width={4} backgroundColor={statusStripeColor[status]} />
        )}
        <YStack flex={1} padding="$4">
          {children}
        </YStack>
      </XStack>
    </Pressable>
  );
}
