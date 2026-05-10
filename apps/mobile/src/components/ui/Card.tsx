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

const statusStripeGradient = {
  fresh: ['#1F9956', '#34B86C'],
  soon: ['#E08F1B', '#F4B942'],
  urgent: ['#E0392B', '#FF6B47'],
  expired: '#6B6B6B',
};

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
    if (variant === 'interactive') {
      scale.value = withTiming(0.98, { duration: 150 });
    }
  }, [variant]);

  const handlePressOut = useCallback(() => {
    if (variant === 'interactive') {
      scale.value = withTiming(1, { duration: 150 });
    }
  }, [variant]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        {
          borderRadius: 22,
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
        borderRadius={22}
        overflow="hidden"
        borderWidth={1}
        borderColor={C['border/subtle']}
        shadowColor={C['text/primary']}
        shadowOffset={{ width: 0, height: 2 }}
        shadowOpacity={0.04}
        shadowRadius={6}
        elevation={1}
      >
        {variant === 'statusStripe' && status && (
          <View
            style={{
              width: 4,
              backgroundColor:
                typeof statusStripeGradient[status] === 'string'
                  ? statusStripeGradient[status]
                  : statusStripeGradient[status][0],
            }}
          />
        )}
        <YStack flex={1} padding={16}>
          {children}
        </YStack>
      </XStack>
    </AnimatedPressable>
  );
}
