import React, { useState } from 'react';
import { View, Pressable, Platform, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { XStack, YStack, Text } from 'tamagui';
import { lightTheme } from '@/theme/tokens';

const C = lightTheme;

// Conditional import for BlurView (doesn't work well on web)
let BlurView: any = null;
let BlurViewAvailable = false;

try {
  if (Platform.OS !== 'web') {
    const blur = require('expo-blur');
    BlurView = blur.BlurView;
    BlurViewAvailable = true;
  }
} catch {
  BlurViewAvailable = false;
}

interface TopBarAction {
  icon: string;
  onPress: () => void;
  accessibilityLabel?: string;
}

export interface TopBarProps {
  title?: string;
  subtitle?: string;
  onScroll?: (scrollOffset: number) => void;
  actions?: TopBarAction[];
  scrollY?: number;
}

export function TopBar({ title, subtitle, onScroll, actions = [], scrollY = 0 }: TopBarProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  // Apply border and increase opacity based on scroll
  const borderOpacity = Math.min(scrollY / 50, 1);
  const blurOpacity = Math.min(0.85 + scrollY / 200, 0.95);

  const topBarView = (
    <View
      style={{
        paddingTop: Math.max(insets.top, 12),
        paddingBottom: 18,
        paddingHorizontal: 22,
        paddingLeft: Math.max(22, insets.left),
        paddingRight: Math.max(22, insets.right),
        backgroundColor: `rgba(250, 246, 238, ${blurOpacity})`,
        borderBottomWidth: 0.5,
        borderBottomColor: `rgba(232, 224, 204, ${borderOpacity})`,
        zIndex: 5,
      }}
    >
      <XStack justifyContent="space-between" alignItems="flex-end" gap={12}>
        {/* Left: Title + Subtitle */}
        <YStack flex={1} gap={2}>
          {title && (
            <Text
              fontSize={20}
              fontWeight="700"
              letterSpacing={-0.3}
              color={C['text/primary']}
              numberOfLines={1}
            >
              {title}
            </Text>
          )}
          {subtitle && (
            <Text fontSize={13} color={C['text/secondary']} numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </YStack>

        {/* Right: Actions */}
        {actions.length > 0 && (
          <XStack gap={8} alignItems="center">
            {actions.map((action, idx) => (
              <Pressable
                key={idx}
                onPress={action.onPress}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel={action.accessibilityLabel || 'Action button'}
              >
                <Text fontSize={20}>{action.icon}</Text>
              </Pressable>
            ))}
          </XStack>
        )}
      </XStack>
    </View>
  );

  // Use BlurView on mobile with backdrop filter effect
  if (BlurViewAvailable && BlurView) {
    return (
      <BlurView intensity={Math.floor(20 + scrollY / 10)} style={{ overflow: 'hidden' }}>
        {topBarView}
      </BlurView>
    );
  }

  return topBarView;
}
