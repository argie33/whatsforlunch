import React, { useRef } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Text } from 'tamagui';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { haptics } from '@/lib/haptics';
import { lightTheme } from '@/theme/tokens';

const C = lightTheme;

export interface FABProps {
  onPress?: () => void;
  icon?: string;
  disabled?: boolean;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  size?: 'sm' | 'md' | 'lg';
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function FAB({
  onPress,
  icon = '+',
  disabled = false,
  position = 'bottom-right',
  size = 'md',
}: FABProps) {
  const scale = useSharedValue(1);

  const sizeMap = {
    sm: { width: 48, height: 48, fontSize: 24 },
    md: { width: 60, height: 60, fontSize: 28 },
    lg: { width: 72, height: 72, fontSize: 32 },
  };

  const sizeStyle = sizeMap[size];

  const positionMap = {
    'bottom-right': { bottom: 100, right: 22, left: undefined, top: undefined },
    'bottom-left': { bottom: 100, left: 22, right: undefined, top: undefined },
    'top-right': { top: 80, right: 22, left: undefined, bottom: undefined },
    'top-left': { top: 80, left: 22, right: undefined, bottom: undefined },
  };

  const positionStyle = positionMap[position];

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = async () => {
    scale.value = withSpring(0.92, {
      damping: 10,
      mass: 1,
      stiffness: 100,
    });
    await haptics.selection();
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, {
      damping: 10,
      mass: 1,
      stiffness: 100,
    });
  };

  const handlePress = async () => {
    onPress?.();
  };

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      style={[
        {
          position: 'absolute',
          ...positionStyle,
          width: sizeStyle.width,
          height: sizeStyle.height,
          borderRadius: sizeStyle.width / 2,
          zIndex: 25,
          opacity: disabled ? 0.6 : 1,
        },
        animatedStyle,
      ]}
      accessibilityRole="button"
      accessibilityLabel="Add item"
      accessibilityHint="Double tap to add a new item"
      accessibilityState={{ disabled }}
    >
      <LinearGradient
        colors={[C['brand/primary'], C['brand/primaryLight']]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Shadows using absolute positioning */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            borderRadius: sizeStyle.width / 2,
            shadowColor: C['brand/primary'],
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.25,
            shadowRadius: 32,
            elevation: 12,
          },
        ]}
      />

      {/* Icon */}
      <Text
        fontSize={sizeStyle.fontSize}
        fontWeight="300"
        color="white"
        style={{
          textAlign: 'center',
          width: '100%',
          height: '100%',
          lineHeight: sizeStyle.height,
        }}
      >
        {icon}
      </Text>
    </AnimatedPressable>
  );
}
