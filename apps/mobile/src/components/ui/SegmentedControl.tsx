import React from 'react';
import { XStack, YStack, Text, Pressable } from 'tamagui';
import Animated, {
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';

interface Segment {
  label: string;
  value: string;
}

interface SegmentedControlProps {
  segments: Segment[];
  value: string;
  onValueChange: (value: string) => void;
}

export function SegmentedControl({
  segments,
  value,
  onValueChange,
}: SegmentedControlProps) {
  const selectedIndex = segments.findIndex((s) => s.value === value);

  return (
    <XStack
      backgroundColor="$surface/sunken"
      borderRadius="$md"
      padding="$1"
      gap="$1"
      flex={1}
    >
      {segments.map((segment, index) => (
        <Pressable
          key={segment.value}
          flex={1}
          onPress={() => onValueChange(segment.value)}
        >
          <YStack
            flex={1}
            paddingVertical="$2"
            paddingHorizontal="$3"
            borderRadius="$sm"
            backgroundColor={
              selectedIndex === index ? '$surface/raised' : 'transparent'
            }
            justifyContent="center"
            alignItems="center"
          >
            <Text
              fontSize="$3"
              fontWeight={selectedIndex === index ? '600' : '400'}
              color={
                selectedIndex === index ? '$text/primary' : '$text/secondary'
              }
            >
              {segment.label}
            </Text>
          </YStack>
        </Pressable>
      ))}
    </XStack>
  );
}
