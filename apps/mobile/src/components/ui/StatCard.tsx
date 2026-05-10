import React, { useCallback } from 'react';
import { Pressable, View } from 'react-native';
import { YStack, Text } from 'tamagui';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { lightTheme } from '@/theme/tokens';

const C = lightTheme;

export type StatType = 'fresh' | 'soon' | 'urgent';

interface StatCardProps {
  type: StatType;
  number: number;
  label: string;
  onPress?: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

const statColors = {
  fresh: C['status/fresh'],
  soon: C['status/soon'],
  urgent: C['status/urgent'],
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function StatCard({
  type,
  number,
  label,
  onPress,
  accessibilityLabel,
  accessibilityHint,
}: StatCardProps) {
  const scale = useSharedValue(1);

  const handlePressIn = useCallback(() => {
    scale.value = withTiming(0.95, { duration: 150 });
  }, []);

  const handlePressOut = useCallback(() => {
    scale.value = withTiming(1, { duration: 150 });
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        {
          borderRadius: 22,
          overflow: 'hidden',
          flex: 1,
        },
        animatedStyle,
      ]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || label}
      accessibilityHint={accessibilityHint || `${number}`}
      accessible={!!onPress}
    >
      <View
        style={{
          backgroundColor: C['surface/raised'],
          borderRadius: 22,
          paddingHorizontal: 14,
          paddingVertical: 16,
          borderWidth: 1,
          borderColor: C['border/subtle'],
          shadowColor: C['text/primary'],
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.04,
          shadowRadius: 6,
          elevation: 1,
          justifyContent: 'flex-start',
          alignItems: 'flex-start',
        }}
      >
        <YStack gap={4}>
          <Text
            fontSize={32}
            fontWeight="800"
            letterSpacing={-1.5}
            lineHeight={35}
            color={statColors[type]}
            fontFamily="$serif"
          >
            {number}
          </Text>
          <Text fontSize={12} fontWeight="600" color={C['text/secondary']}>
            {label}
          </Text>
        </YStack>
      </View>
    </AnimatedPressable>
  );
}
