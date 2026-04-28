import React from 'react';
import { Button as TButton, Text, useTheme } from 'tamagui';
import { useCallback } from 'react';
import { haptics } from '@/lib/haptics';

export type ButtonVariant = 'filled' | 'tinted' | 'plain' | 'ghost' | 'destructive';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  children: React.ReactNode;
}

const sizeMap = {
  sm: { height: 32, paddingHorizontal: 12, fontSize: 14 },
  md: { height: 40, paddingHorizontal: 16, fontSize: 16 },
  lg: { height: 48, paddingHorizontal: 20, fontSize: 17 },
};

const variantStyles = {
  filled: {
    light: { bg: '$brand/primary', color: '$text/inverse' },
    dark: { bg: '$brand/primary', color: '$text/inverse' },
  },
  tinted: {
    light: { bg: '$brand/primaryMuted', color: '$brand/primary' },
    dark: { bg: '$brand/primaryMuted', color: '$brand/primary' },
  },
  plain: {
    light: { bg: 'transparent', color: '$brand/primary' },
    dark: { bg: 'transparent', color: '$brand/primary' },
  },
  ghost: {
    light: { bg: 'transparent', color: '$text/secondary' },
    dark: { bg: 'transparent', color: '$text/secondary' },
  },
  destructive: {
    light: { bg: '$status/urgent', color: '$text/inverse' },
    dark: { bg: '$status/urgent', color: '$text/inverse' },
  },
};

interface ButtonPropsWithA11y extends ButtonProps {
  accessibilityLabel?: string;
  accessibilityHint?: string;
  flex?: number;
}

export function Button({
  variant = 'filled',
  size = 'md',
  onPress,
  disabled = false,
  loading = false,
  children,
  accessibilityLabel,
  accessibilityHint,
  flex,
}: ButtonPropsWithA11y) {
  const sizeStyle = sizeMap[size];
  const variantStyle = variantStyles[variant];
  const theme = useTheme();

  const handlePress = useCallback(async () => {
    await haptics.selection();
    onPress?.();
  }, [onPress]);

  return (
    <TButton
      {...sizeStyle}
      flex={flex}
      paddingHorizontal={sizeStyle.paddingHorizontal}
      borderRadius="$md"
      backgroundColor={variantStyle.light.bg}
      onPress={handlePress}
      disabled={disabled || loading}
      opacity={disabled ? 0.5 : 1}
      pressStyle={{
        scale: 0.98,
        opacity: 0.85,
      }}
      accessibilityRole="button"
      accessibilityLabel={
        accessibilityLabel || (typeof children === 'string' ? children : 'Button')
      }
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: disabled || loading }}
    >
      <Text color={variantStyle.light.color} fontSize={sizeStyle.fontSize} fontWeight="600">
        {loading ? '…' : children}
      </Text>
    </TButton>
  );
}
