import React from 'react';
import { Button as TButton, Text, useTheme } from 'tamagui';
import { useCallback } from 'react';
import * as Haptics from 'expo-haptics';

export type ButtonVariant = 'filled' | 'tinted' | 'plain' | 'destructive';
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
  destructive: {
    light: { bg: '$status/urgent', color: '$text/inverse' },
    dark: { bg: '$status/urgent', color: '$text/inverse' },
  },
};

export function Button({
  variant = 'filled',
  size = 'md',
  onPress,
  disabled = false,
  loading = false,
  children,
}: ButtonProps) {
  const sizeStyle = sizeMap[size];
  const variantStyle = variantStyles[variant];
  const theme = useTheme();

  const handlePress = useCallback(async () => {
    await Haptics.selectionAsync();
    onPress?.();
  }, [onPress]);

  return (
    <TButton
      {...sizeStyle}
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
    >
      <Text
        color={variantStyle.light.color}
        fontSize={sizeStyle.fontSize}
        fontWeight="600"
      >
        {loading ? '...' : children}
      </Text>
    </TButton>
  );
}
