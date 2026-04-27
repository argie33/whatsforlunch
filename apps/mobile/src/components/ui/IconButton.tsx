import React from 'react';
import { Pressable, YStack } from 'tamagui';
import { haptics } from '@/lib/haptics';
import { Icon } from './Icon';

interface IconButtonProps {
  icon: string;
  onPress?: () => void;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'round' | 'square';
  color?: string;
  disabled?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

const sizeMap = {
  sm: 36,
  md: 44,
  lg: 56,
};

export function IconButton({
  icon,
  onPress,
  size = 'md',
  variant = 'round',
  color = '$text/primary',
  disabled = false,
  accessibilityLabel,
  accessibilityHint,
}: IconButtonProps) {
  const dimension = sizeMap[size];
  const isRound = variant === 'round';

  const handlePress = async () => {
    await haptics.selection();
    onPress?.();
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || icon}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
    >
      <YStack
        width={dimension}
        height={dimension}
        borderRadius={isRound ? dimension / 2 : '$md'}
        backgroundColor="$surface/sunken"
        justifyContent="center"
        alignItems="center"
        opacity={disabled ? 0.5 : 1}
        pressStyle={{
          backgroundColor: '$border/subtle',
          scale: 0.95,
        }}
        accessible={false}
      >
        <Icon
          name={icon}
          size={Math.floor(dimension / 2.2)}
          color={color}
          accessible={false}
        />
      </YStack>
    </Pressable>
  );
}
