import React, { useCallback } from 'react';
import { Pressable, View } from 'react-native';
import { Text, XStack, YStack } from 'tamagui';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { haptics } from '@/lib/haptics';
import { lightTheme } from '@/theme/tokens';

const C = lightTheme;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type CardStripeType = 'fresh' | 'soon' | 'urgent' | 'expired' | 'none';
export type CardVariant = 'default' | 'flat' | 'pressable' | 'stripe';

export interface CardProps {
  children: React.ReactNode;
  variant?: CardVariant;
  stripe?: CardStripeType;
  onPress?: () => void;
  disabled?: boolean;
  padding?: number;
  gap?: number;
}

const stripeGradients = {
  fresh: { colors: [C['status/fresh'], '#34B86C'] },
  soon: { colors: [C['status/soon'], C['accent/honey']] },
  urgent: { colors: [C['status/urgent'], C['accent/coral']] },
  expired: { colors: [C['status/expired'], C['status/expired']] },
};

export function Card({
  children,
  variant = 'default',
  stripe = 'none',
  onPress,
  disabled = false,
  padding = 18,
  gap,
}: CardProps) {
  const scale = useSharedValue(1);

  const handlePressIn = useCallback(async () => {
    if (variant === 'pressable' || variant === 'stripe') {
      scale.value = withTiming(0.98, { duration: 100 });
      await haptics.selection();
    }
  }, [variant]);

  const handlePressOut = useCallback(() => {
    if (variant === 'pressable' || variant === 'stripe') {
      scale.value = withTiming(1, { duration: 100 });
    }
  }, [variant]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const baseStyle = {
    borderRadius: 22,
    overflow: 'hidden' as const,
    ...(variant !== 'flat' && {
      backgroundColor: C['surface/raised'],
      borderWidth: 1,
      borderColor: C['border/subtle'],
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 2,
      elevation: 1,
    }),
    ...(variant === 'stripe' &&
      stripe !== 'none' && {
        flexDirection: 'row' as const,
      }),
  };

  const cardContent = (
    <>
      {variant === 'stripe' && stripe !== 'none' && (
        <LinearGradient
          colors={stripeGradients[stripe].colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={{
            width: 4,
            flexGrow: 1,
          }}
        />
      )}
      <View
        style={{
          flex: 1,
          padding,
          ...(gap && { gap }),
        }}
      >
        {children}
      </View>
    </>
  );

  if (variant === 'pressable' || (variant === 'stripe' && onPress)) {
    return (
      <AnimatedPressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        style={[baseStyle, animatedStyle]}
        accessibilityRole="button"
        accessibilityState={{ disabled }}
      >
        {cardContent}
      </AnimatedPressable>
    );
  }

  return <View style={baseStyle}>{cardContent}</View>;
}
