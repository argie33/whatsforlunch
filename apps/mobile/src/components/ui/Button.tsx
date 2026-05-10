import React, { useCallback } from 'react';
import { Pressable } from 'react-native';
import { Text } from 'tamagui';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { haptics } from '@/lib/haptics';
import { lightTheme } from '@/theme/tokens';

const C = lightTheme;

export type ButtonVariant = 'primary' | 'secondary' | 'destructive';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  children: React.ReactNode;
  full?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const sizeMap = {
  sm: { height: 32, paddingHorizontal: 12, fontSize: 13 },
  md: { height: 48, paddingHorizontal: 24, fontSize: 16 },
  lg: { height: 56, paddingHorizontal: 28, fontSize: 16 },
};

const variantStyles = {
  primary: {
    bg: C['brand/primary'],
    bgActive: C['brand/primaryDark'],
    color: C['text/inverse'],
  },
  secondary: {
    bg: C['surface/raised'],
    bgActive: C['surface/base2'],
    color: C['text/primary'],
  },
  destructive: {
    bg: C['status/urgent'],
    bgActive: '#B32C2C',
    color: C['text/inverse'],
  },
};

interface ButtonPropsWithA11y extends ButtonProps {
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export function Button({
  variant = 'primary',
  size = 'md',
  onPress,
  disabled = false,
  loading = false,
  children,
  accessibilityLabel,
  accessibilityHint,
  full = false,
}: ButtonPropsWithA11y) {
  const scale = useSharedValue(1);
  const sizeStyle = sizeMap[size];
  const variantStyle = variantStyles[variant];

  const handlePressIn = useCallback(async () => {
    scale.value = withTiming(0.97, { duration: 100 });
    await haptics.selection();
  }, []);

  const handlePressOut = useCallback(() => {
    scale.value = withTiming(1, { duration: 100 });
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      style={[
        {
          height: sizeStyle.height,
          paddingHorizontal: sizeStyle.paddingHorizontal,
          borderRadius: 8,
          backgroundColor: disabled ? `${variantStyle.bg}80` : variantStyle.bg,
          justifyContent: 'center',
          alignItems: 'center',
          flexDirection: 'row',
          width: full ? '100%' : 'auto',
        },
        animatedStyle,
      ]}
      accessibilityRole="button"
      accessibilityLabel={
        accessibilityLabel || (typeof children === 'string' ? children : 'Button')
      }
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: disabled || loading }}
    >
      <Text fontSize={sizeStyle.fontSize} fontWeight="600" color={variantStyle.color}>
        {loading ? '…' : children}
      </Text>
    </AnimatedPressable>
  );
}
