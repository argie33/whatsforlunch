import React, { useCallback } from 'react';
import { View, Pressable } from 'react-native';
import { Text, XStack, YStack } from 'tamagui';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type Animated as AnimatedType,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { haptics } from '@/lib/haptics';
import { lightTheme } from '@/theme/tokens';

const C = lightTheme;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface TabBarItem {
  key: string;
  icon: string;
  label: string;
  badge?: number;
}

export interface TabBarProps {
  items: TabBarItem[];
  activeTab: string;
  onTabPress: (key: string) => void;
  disabled?: boolean;
}

export function TabBar({ items, activeTab, onTabPress, disabled = false }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const scaleValues = items.reduce(
    (acc, item) => {
      acc[item.key] = useSharedValue(1);
      return acc;
    },
    {} as Record<string, ReturnType<typeof useSharedValue>>,
  );

  const handleTabPress = useCallback(
    (key: string) => {
      if (!disabled) {
        haptics.selection();
        onTabPress(key);
      }
    },
    [disabled, onTabPress],
  );

  const handlePressIn = useCallback((key: string) => {
    if (scaleValues[key]) {
      scaleValues[key].value = withTiming(0.85, { duration: 100 });
    }
  }, []);

  const handlePressOut = useCallback((key: string) => {
    if (scaleValues[key]) {
      scaleValues[key].value = withTiming(1, { duration: 100 });
    }
  }, []);

  return (
    <View
      style={{
        backgroundColor: C['surface/raised'],
        borderTopWidth: 1,
        borderTopColor: C['border/subtle'],
        paddingBottom: insets.bottom,
        paddingHorizontal: 8,
        paddingVertical: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
      }}
    >
      <XStack gap={4} justifyContent="space-around">
        {items.map((item) => {
          const isActive = activeTab === item.key;
          const scale = scaleValues[item.key];
          const animatedStyle = useAnimatedStyle(() => ({
            transform: [{ scale: scale?.value || 1 }],
          }));

          return (
            <AnimatedPressable
              key={item.key}
              onPress={() => handleTabPress(item.key)}
              onPressIn={() => handlePressIn(item.key)}
              onPressOut={() => handlePressOut(item.key)}
              disabled={disabled}
              style={[
                {
                  flex: 1,
                  paddingVertical: 12,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 12,
                  opacity: disabled ? 0.5 : 1,
                  backgroundColor: isActive ? C['brand/soft'] : 'transparent',
                },
                animatedStyle,
              ]}
              accessibilityRole="tab"
              accessibilityLabel={item.label}
              accessibilityState={{ selected: isActive }}
            >
              <YStack alignItems="center" gap={4}>
                <Text fontSize={24} color={isActive ? C['brand/primary'] : C['text/secondary']}>
                  {item.icon}
                </Text>
                <Text
                  fontSize={11}
                  fontWeight={isActive ? '700' : '600'}
                  color={isActive ? C['brand/primary'] : C['text/secondary']}
                  textAlign="center"
                >
                  {item.label}
                </Text>

                {item.badge !== undefined && item.badge > 0 && (
                  <View
                    style={{
                      position: 'absolute',
                      top: 0,
                      right: 4,
                      backgroundColor: C['status/urgent'],
                      borderRadius: 10,
                      minWidth: 20,
                      height: 20,
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <Text fontSize={10} fontWeight="700" color="white">
                      {item.badge > 9 ? '9+' : item.badge}
                    </Text>
                  </View>
                )}
              </YStack>
            </AnimatedPressable>
          );
        })}
      </XStack>

      {/* Active indicator line */}
      <View
        style={{
          height: 2,
          backgroundColor: C['brand/primary'],
          borderRadius: 1,
          marginTop: 8,
          width: `${100 / items.length}%`,
          marginLeft: `${(items.findIndex((i) => i.key === activeTab) * 100) / items.length}%`,
        }}
      />
    </View>
  );
}
