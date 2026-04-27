import React, { useEffect, useRef } from 'react';
import { XStack, Text, YStack, useTheme } from 'tamagui';
import { Animated } from 'react-native';
import * as Haptics from 'expo-haptics';
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
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.delay(duration),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => onClose?.());

    Haptics.selectionAsync();
  }, [fadeAnim, duration, onClose]);

  return (
    <Animated.View style={{ opacity: fadeAnim }}>
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
