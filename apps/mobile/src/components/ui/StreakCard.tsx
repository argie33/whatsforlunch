import React from 'react';
import { XStack, YStack, Text, View } from 'tamagui';
import { LinearGradient } from 'expo-linear-gradient';
import { lightTheme } from '@/theme/tokens';
import { Gradients, Shadows } from '@/theme/gradients';

const C = lightTheme;

interface StreakCardProps {
  count: number;
  label?: string;
  icon?: string;
}

export function StreakCard({ count, label = 'Day Streak', icon = '🔥' }: StreakCardProps) {
  return (
    <LinearGradient
      colors={Gradients.coralHoney.colors}
      start={Gradients.coralHoney.start}
      end={Gradients.coralHoney.end}
      style={{
        borderRadius: 32,
        paddingHorizontal: 22,
        paddingVertical: 18,
        marginHorizontal: 22,
        marginBottom: 16,
        overflow: 'hidden',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        ...(Shadows.sCoral as any),
      }}
    >
      {/* Decorative background emoji */}
      <Text position="absolute" top={-10} right={-10} fontSize={100} opacity={0.15}>
        {icon}
      </Text>

      {/* Content */}
      <YStack gap={0}>
        <Text
          fontSize={40}
          fontWeight="900"
          letterSpacing={-2}
          lineHeight={44}
          color="white"
          fontFamily="$serif"
        >
          {count}
        </Text>
      </YStack>

      <YStack gap={2}>
        <Text fontSize={13} fontWeight="600" opacity={0.95} color="white">
          {label}
        </Text>
      </YStack>
    </LinearGradient>
  );
}
