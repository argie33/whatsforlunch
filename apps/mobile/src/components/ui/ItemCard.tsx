import React, { useCallback } from 'react';
import { Pressable, View } from 'react-native';
import { Text, XStack, YStack } from 'tamagui';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { lightTheme } from '@/theme/tokens';

const C = lightTheme;

export type ItemStatus = 'fresh' | 'soon' | 'urgent' | 'expired';

interface ItemCardProps {
  emoji: string;
  name: string;
  status: ItemStatus;
  days?: number;
  container?: string;
  onPress?: () => void;
  accessibilityLabel?: string;
}

const statusStripeGradients = {
  fresh: ['#1F9956', '#34B86C'],
  soon: ['#E08F1B', '#F4B942'],
  urgent: ['#E0392B', '#FF6B47'],
  expired: ['#6B6B6B', '#6B6B6B'],
};

const statusColors = {
  fresh: { text: C['status/fresh'], bg: C['status/freshBg'] },
  soon: { text: C['status/soon'], bg: C['status/soonBg'] },
  urgent: { text: C['status/urgent'], bg: C['status/urgentBg'] },
  expired: { text: C['status/expired'], bg: C['status/expiredBg'] },
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function ItemCardComponent({
  emoji,
  name,
  status,
  days,
  container,
  onPress,
  accessibilityLabel,
}: ItemCardProps) {
  const scale = useSharedValue(1);

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.98, { damping: 0.8, mass: 1 });
  }, []);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 0.8, mass: 1 });
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const colors = statusColors[status];

  const statusText =
    status === 'urgent'
      ? 'eat today'
      : status === 'soon'
        ? 'use soon'
        : status === 'expired'
          ? 'expired'
          : 'fresh';
  const daysText =
    days === 0 ? 'today' : days === 1 ? '1 day left' : days ? `${days} days left` : '';
  const locationText = container ? `in ${container}` : '';

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        {
          marginBottom: 10,
          borderRadius: 22,
          overflow: 'hidden',
        },
        animatedStyle,
      ]}
      accessible
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || name}
      accessibilityHint={`Status: ${statusText}. ${locationText} ${daysText}`.trim()}
    >
      {/* Colored gradient left stripe */}
      <LinearGradient
        colors={statusStripeGradients[status]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: 4,
          height: '100%',
        }}
      />

      {/* Card background */}
      <View
        style={{
          backgroundColor: C['surface/raised'],
          borderRadius: 22,
          borderWidth: 1,
          borderColor: C['border/subtle'],
          overflow: 'hidden',
          flexDirection: 'row',
          alignItems: 'center',
          paddingLeft: 16,
          paddingRight: 16,
          paddingVertical: 14,
          shadowColor: C['text/primary'],
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.04,
          shadowRadius: 6,
          elevation: 1,
        }}
      >
        {/* Icon/Emoji */}
        <View
          style={{
            width: 52,
            height: 52,
            borderRadius: 16,
            backgroundColor: colors.bg,
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: 14,
            flexShrink: 0,
            shadowColor: 'rgba(0,0,0,0.04)',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.1,
            shadowRadius: 1,
          }}
        >
          <Text fontSize={28}>{emoji}</Text>
        </View>

        {/* Content */}
        <YStack flex={1} gap={3}>
          <Text
            fontSize={17}
            fontWeight="700"
            color={C['text/primary']}
            letterSpacing={-0.2}
            numberOfLines={1}
          >
            {name}
          </Text>
          <XStack alignItems="center" gap={6}>
            {container && (
              <Text fontSize={13} color={C['text/secondary']}>
                {container}
              </Text>
            )}
            {container && days !== undefined && (
              <View
                style={{
                  width: 3,
                  height: 3,
                  borderRadius: 1.5,
                  backgroundColor: C['text/tertiary'],
                }}
              />
            )}
            {days !== undefined && (
              <Text fontSize={13} color={C['text/secondary']}>
                {days === 0 ? 'Today' : days === 1 ? '1 day' : `${days} days`}
              </Text>
            )}
          </XStack>
        </YStack>

        {/* Status badge */}
        <View
          style={{
            paddingHorizontal: 10,
            paddingVertical: 5,
            backgroundColor: colors.bg,
            borderRadius: 9999,
            marginLeft: 8,
            flexShrink: 0,
          }}
        >
          <Text
            fontSize={11}
            fontWeight="700"
            color={colors.text}
            textTransform="uppercase"
            letterSpacing={0.4}
          >
            {status === 'urgent'
              ? 'eat today'
              : status === 'soon'
                ? 'soon'
                : status === 'expired'
                  ? 'expired'
                  : 'fresh'}
          </Text>
        </View>
      </View>
    </AnimatedPressable>
  );
}

export const ItemCard = React.memo(ItemCardComponent);
