import React, { useEffect } from 'react';
import { XStack, Text } from 'tamagui';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  runOnJS,
} from 'react-native-reanimated';
import { haptics } from '@/lib/haptics';
import { Icon } from './Icon';

export type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
  message: string;
  type?: ToastType;
  duration?: number;
  onClose?: () => void;
}

const typeConfig = {
  success: { bg: '$status/freshBg', text: '$status/fresh', icon: 'check' },
  error: { bg: '$status/urgentBg', text: '$status/urgent', icon: 'alert-circle' },
  info: { bg: '$brand/primaryMuted', text: '$brand/primary', icon: 'info' },
};

export function Toast({
  message,
  type = 'info',
  duration = 3000,
  onClose,
}: ToastProps) {
  const config = typeConfig[type];
  const opacity = useSharedValue(0);

  useEffect(() => {
    haptics.selection().catch(() => {});

    opacity.value = withSequence(
      withTiming(1, { duration: 200 }),
      withDelay(duration, withTiming(0, { duration: 200 })),
    );

    const timer = setTimeout(() => {
      onClose?.();
    }, duration + 400);

    return () => clearTimeout(timer);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View style={animatedStyle}>
      <XStack
        backgroundColor={config.bg}
        borderRadius="$md"
        paddingHorizontal="$4"
        paddingVertical="$3"
        gap="$3"
        alignItems="center"
        marginHorizontal="$4"
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
        accessible
      >
        <Icon name={config.icon} size={20} color={config.text} />
        <Text fontSize="$4" color={config.text} flex={1}>
          {message}
        </Text>
      </XStack>
    </Animated.View>
  );
}
