import React, { useState } from 'react';
import { YStack, XStack, Text } from 'tamagui';
import { ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { TopBar, StatCard, InsightCard, StreakCard, ItemCard, FAB } from '@/components/ui';
import { lightTheme } from '@/theme/tokens';

const C = lightTheme;

// Mock data
const mockItems = [
  {
    id: 1,
    emoji: '🥬',
    name: 'Lettuce',
    meta: 'Fridge • Today',
    status: 'fresh' as const,
    badge: 'FRESH',
  },
  {
    id: 2,
    emoji: '🥕',
    name: 'Carrots',
    meta: 'Fridge • 3 days',
    status: 'soon' as const,
    badge: 'SOON',
  },
  {
    id: 3,
    emoji: '🍅',
    name: 'Tomatoes',
    meta: 'Counter • Today',
    status: 'urgent' as const,
    badge: 'EAT TODAY',
  },
];

export default function DashboardScreen() {
  const router = useRouter();
  const [scrollY, setScrollY] = useState(0);

  return (
    <YStack flex={1} backgroundColor={C['surface/base']}>
      <ScrollView
        scrollEventThrottle={16}
        onScroll={(e) => setScrollY(e.nativeEvent.contentOffset.y)}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* Top Bar */}
        <TopBar
          title="WhatsFresh"
          subtitle="Track what's fresh"
          scrollY={scrollY}
          actions={[
            {
              icon: '⚙️',
              onPress: () => router.push('/(main)/settings'),
              accessibilityLabel: 'Settings',
            },
          ]}
        />

        {/* Hero Stats */}
        <YStack paddingHorizontal={22} paddingBottom={16} gap={10}>
          <XStack gap={10}>
            <StatCard type="fresh" number={12} label="Fresh" onPress={() => {}} />
            <StatCard type="soon" number={5} label="Soon" onPress={() => {}} />
            <StatCard type="urgent" number={2} label="Urgent" onPress={() => {}} />
          </XStack>
        </YStack>

        {/* Insight Card */}
        <InsightCard
          eyebrow="This Week"
          title="You're Doing Great"
          text="No food waste in 7 days 🌱"
          icon="⭐"
        />

        {/* Streak Card */}
        <StreakCard count={7} label="Day Streak" />

        {/* Recent Items Section */}
        <YStack paddingHorizontal={22} gap={8} paddingTop={8}>
          <Text fontSize={20} fontWeight="700" letterSpacing={-0.3} color={C['text/primary']}>
            Recent Items
          </Text>
        </YStack>

        {/* Items List */}
        <YStack paddingHorizontal={22} paddingTop={8} gap={0}>
          {mockItems.map((item) => (
            <ItemCard
              key={item.id}
              status={item.status}
              icon={item.emoji}
              name={item.name}
              meta={item.meta}
              badge={item.badge}
              onPress={() => router.push(`/(main)/item/${item.id}`)}
              accessibilityLabel={item.name}
            />
          ))}
        </YStack>

        {/* Empty State Hint */}
        <YStack paddingHorizontal={22} paddingTop={24} alignItems="center" gap={8}>
          <Text fontSize={14} color={C['text/secondary']} textAlign="center">
            Tap the + button to add your first item
          </Text>
        </YStack>
      </ScrollView>

      {/* FAB */}
      <FAB icon="+" onPress={() => router.push('/(main)/add-item')} />
    </YStack>
  );
}
