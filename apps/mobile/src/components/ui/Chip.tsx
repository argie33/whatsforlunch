import React, { useCallback } from 'react';
import { Pressable } from 'react-native';
import { Text, XStack } from 'tamagui';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { X } from 'lucide-react-native';
import { haptics } from '@/lib/haptics';
import { lightTheme } from '@/theme/tokens';

const C = lightTheme;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface ChipProps {
  label: string;
  icon?: string;
  onPress?: (label: string) => void;
  onClose?: (label: string) => void;
  active?: boolean;
  disabled?: boolean;
  closeable?: boolean;
  badge?: number;
}

export function Chip({
  label,
  icon,
  onPress,
  onClose,
  active = false,
  disabled = false,
  closeable = false,
  badge,
}: ChipProps) {
  const scale = useSharedValue(1);

  const handlePressIn = useCallback(async () => {
    scale.value = withTiming(0.95, { duration: 100 });
    await haptics.selection();
  }, []);

  const handlePressOut = useCallback(() => {
    scale.value = withTiming(1, { duration: 100 });
  }, []);

  const handlePress = useCallback(() => {
    if (!disabled) {
      onPress?.(label);
    }
  }, [label, onPress, disabled]);

  const handleClose = useCallback(
    (e: any) => {
      e.stopPropagation();
      onClose?.(label);
    },
    [label, onClose],
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      style={[
        {
          paddingVertical: 9,
          paddingHorizontal: 16,
          borderRadius: 9999,
          backgroundColor: active ? C['brand/primary'] : C['surface/raised'],
          borderWidth: 1.5,
          borderColor: active ? C['brand/primary'] : C['border/subtle'],
          flexDirection: 'row',
          alignItems: 'center',
          gap: 5,
          opacity: disabled ? 0.5 : 1,
          ...(active && {
            shadowColor: C['brand/primary'],
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.25,
            shadowRadius: 10,
            elevation: 4,
          }),
        },
        animatedStyle,
      ]}
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ selected: active, disabled }}
    >
      {icon && (
        <Text fontSize={14} color={active ? 'white' : C['text/secondary']}>
          {icon}
        </Text>
      )}

      <Text
        fontSize={13}
        fontWeight="700"
        color={active ? 'white' : C['text/secondary']}
        letterSpacing={-0.1}
      >
        {label}
      </Text>

      {badge !== undefined && (
        <Text
          fontSize={11}
          fontWeight="700"
          color={active ? C['brand/soft'] : C['text/tertiary']}
          marginLeft={4}
        >
          {badge}
        </Text>
      )}

      {closeable && !disabled && (
        <Pressable
          onPress={handleClose}
          hitSlop={8}
          accessible
          accessibilityRole="button"
          accessibilityLabel={`Remove ${label}`}
          accessibilityHint="Double tap to remove this filter"
        >
          <X size={14} color={active ? 'white' : C['text/secondary']} strokeWidth={3} />
        </Pressable>
      )}
    </AnimatedPressable>
  );
}
