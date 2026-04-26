import React from 'react';
import { Pressable, YStack } from 'tamagui';
import * as Haptics from 'expo-haptics';
import { Icon } from './Icon';

interface IconButtonProps {
  icon: string;
  onPress?: () => void;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'round' | 'square';
  color?: string;
  disabled?: boolean;
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
}: IconButtonProps) {
  const dimension = sizeMap[size];
  const isRound = variant === 'round';

  const handlePress = async () => {
    await Haptics.selectionAsync();
    onPress?.();
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
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
      >
        <Icon name={icon} size={Math.floor(dimension / 2.2)} color={color} />
      </YStack>
    </Pressable>
  );
}
