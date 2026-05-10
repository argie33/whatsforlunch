import React from 'react';
import { XStack, YStack, Text, View } from 'tamagui';
import { LinearGradient } from 'expo-linear-gradient';
import { lightTheme } from '@/theme/tokens';
import { Gradients, Shadows } from '@/theme/gradients';

const C = lightTheme;

interface InsightCardProps {
  eyebrow: string;
  title: string;
  text: string;
  icon: string;
  gradient?: typeof Gradients.brand;
}

export function InsightCard({
  eyebrow,
  title,
  text,
  icon,
  gradient = Gradients.brand,
}: InsightCardProps) {
  return (
    <LinearGradient
      colors={gradient.colors}
      start={gradient.start}
      end={gradient.end}
      style={{
        borderRadius: 32,
        padding: 22,
        marginHorizontal: 22,
        marginBottom: 16,
        overflow: 'hidden',
        ...(Shadows.sGlow as any),
      }}
    >
      {/* Decorative background elements */}
      <View
        style={{
          position: 'absolute',
          top: -60,
          right: -60,
          width: 180,
          height: 180,
          borderRadius: 90,
          backgroundColor: 'rgba(255,255,255,0.15)',
        }}
      />
      <View
        style={{
          position: 'absolute',
          bottom: -40,
          left: -40,
          width: 140,
          height: 140,
          borderRadius: 70,
          backgroundColor: 'rgba(255,255,255,0.08)',
        }}
      />

      {/* Content */}
      <XStack justifyContent="space-between" alignItems="flex-end" gap={14} zIndex={1}>
        <YStack flex={1} gap={6}>
          <Text
            fontSize={11}
            fontWeight="800"
            letterSpacing={2}
            textTransform="uppercase"
            color="rgba(255,255,255,0.85)"
          >
            {eyebrow}
          </Text>
          <Text
            fontSize={26}
            fontWeight="800"
            letterSpacing={-0.6}
            lineHeight={29}
            color="white"
            fontFamily="$serif"
          >
            {title}
          </Text>
          <Text fontSize={14} lineHeight={20} color="rgba(255,255,255,0.92)">
            {text}
          </Text>
        </YStack>

        {/* Icon */}
        <View
          width={56}
          height={56}
          borderRadius={28}
          backgroundColor="rgba(255,255,255,0.18)"
          justifyContent="center"
          alignItems="center"
          flexShrink={0}
        >
          <Text fontSize={28}>{icon}</Text>
        </View>
      </XStack>
    </LinearGradient>
  );
}
