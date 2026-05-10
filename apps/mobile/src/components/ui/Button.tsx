import React, { useCallback } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Text, XStack } from 'tamagui';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { haptics } from '@/lib/haptics';
import { lightTheme } from '@/theme/tokens';

const C = lightTheme;

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'destructive'
  | 'coral'
  | 'filled'
  | 'tinted'
  | 'plain';
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
  sm: { height: 32, paddingHorizontal: 12, fontSize: 13, paddingVertical: 0 },
  md: { height: 48, paddingHorizontal: 24, fontSize: 16, paddingVertical: 16 },
  lg: { height: 56, paddingHorizontal: 28, fontSize: 17, paddingVertical: 18 },
};

const variantStyles: Record<ButtonVariant, any> = {
  primary: {
    bg: C['brand/primary'],
    bgActive: C['brand/primaryDark'],
    color: C['text/inverse'],
    border: null,
    shadow: {
      shadowColor: C['brand/primary'],
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.25,
      shadowRadius: 32,
      elevation: 8,
    },
  },
  secondary: {
    bg: C['surface/raised'],
    bgActive: C['surface/sunken'],
    color: C['text/primary'],
    border: { width: 1.5, color: C['border/subtle'] },
    shadow: {},
  },
  ghost: {
    bg: 'transparent',
    bgActive: C['brand/soft'],
    color: C['brand/primary'],
    border: null,
    shadow: {},
  },
  coral: {
    bg: C['accent/coral'],
    bgActive: C['accent/coral'],
    color: C['text/inverse'],
    border: null,
    shadow: {
      shadowColor: C['accent/coral'],
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.3,
      shadowRadius: 24,
      elevation: 8,
    },
  },
  destructive: {
    bg: C['status/urgent'],
    bgActive: C['status/urgent'],
    color: C['text/inverse'],
    border: null,
    shadow: {
      shadowColor: C['status/urgent'],
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.25,
      shadowRadius: 16,
      elevation: 6,
    },
  },
  filled: {
    bg: C['brand/primary'],
    bgActive: C['brand/primaryDark'],
    color: C['text/inverse'],
    border: null,
    shadow: {
      shadowColor: C['brand/primary'],
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.25,
      shadowRadius: 32,
      elevation: 8,
    },
  },
  tinted: {
    bg: C['surface/raised'],
    bgActive: C['surface/sunken'],
    color: C['text/primary'],
    border: { width: 1.5, color: C['border/subtle'] },
    shadow: {},
  },
  plain: {
    bg: 'transparent',
    bgActive: C['brand/soft'],
    color: C['brand/primary'],
    border: null,
    shadow: {},
  },
};

interface ButtonPropsWithA11y extends ButtonProps {
  accessibilityLabel?: string;
  accessibilityHint?: string;
  flex?: number;
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
  flex,
  full = false,
}: ButtonPropsWithA11y) {
  const scale = useSharedValue(1);
  const sizeStyle = sizeMap[size];

  // Map old variant names to new ones for backward compatibility
  let mappedVariant: keyof typeof variantStyles = variant as any;
  if (variant === 'filled') mappedVariant = 'primary';
  if (variant === 'tinted') mappedVariant = 'secondary';
  if (variant === 'plain') mappedVariant = 'ghost';

  const variantStyle = variantStyles[mappedVariant];

  const handlePressIn = useCallback(async () => {
    scale.value = withTiming(0.97, { duration: 100 });
    await haptics.selection();
  }, []);

  const handlePressOut = useCallback(() => {
    scale.value = withTiming(1, { duration: 100 });
  }, []);

  const handlePress = useCallback(() => {
    onPress?.();
  }, [onPress]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      style={[
        {
          height: sizeStyle.height,
          paddingHorizontal: sizeStyle.paddingHorizontal,
          borderRadius: 12,
          backgroundColor: disabled ? `${variantStyle.bg}80` : variantStyle.bg,
          justifyContent: 'center',
          alignItems: 'center',
          flexDirection: 'row',
          gap: 10,
          ...(variantStyle.shadow as any),
          ...(variantStyle.border
            ? { borderWidth: variantStyle.border.width, borderColor: variantStyle.border.color }
            : {}),
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
      <Text
        fontSize={sizeStyle.fontSize}
        fontWeight="700"
        color={variantStyle.color}
        letterSpacing={-0.1}
      >
        {loading ? '…' : children}
      </Text>
    </AnimatedPressable>
  );
}
