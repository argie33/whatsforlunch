import React, { useCallback } from 'react';
import { YStack, XStack, View } from 'tamagui';
import { Pressable } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { lightTheme } from '@/theme/tokens';

const C = lightTheme;

export type CardVariant = 'default' | 'interactive' | 'statusStripe';

interface CardProps {
  variant?: CardVariant;
  status?: 'fresh' | 'soon' | 'urgent' | 'expired';
  onPress?: () => void;
  children: React.ReactNode;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Card({
  variant = 'default',
  status,
  onPress,
  children,
  accessibilityLabel,
  accessibilityHint,
}: CardProps) {
  const scale = useSharedValue(1);

  const handlePressIn = useCallback(() => {
    if (variant === 'interactive' && onPress) {
      scale.value = withTiming(0.98, { duration: 150 });
    }
  }, [variant, onPress]);

  const handlePressOut = useCallback(() => {
    if (variant === 'interactive') {
      scale.value = withTiming(1, { duration: 150 });
    }
  }, [variant]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const statusColor = status
    ? {
        fresh: C['status/fresh'],
        soon: C['status/soon'],
        urgent: C['status/urgent'],
        expired: C['status/expired'],
      }[status]
    : undefined;

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        {
          borderRadius: 8,
          overflow: 'hidden',
        },
        animatedStyle,
      ]}
      {...(onPress
        ? {
            accessibilityRole: 'button',
            accessibilityLabel: accessibilityLabel,
            accessibilityHint: accessibilityHint,
          }
        : { accessible: false })}
    >
      <XStack
        backgroundColor={C['surface/raised']}
        borderRadius={8}
        overflow="hidden"
        shadowColor={C['text/primary']}
        shadowOffset={{ width: 0, height: 1 }}
        shadowOpacity={0.08}
        shadowRadius={2}
        elevation={1}
      >
        {variant === 'statusStripe' && statusColor && (
          <View style={{ width: 4, backgroundColor: statusColor }} />
        )}
        <YStack flex={1} padding={12}>
          {children}
        </YStack>
      </XStack>
    </AnimatedPressable>
  );
}
