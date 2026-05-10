import React, { useState } from 'react';
import { YStack, XStack, Text, View } from 'tamagui';
import { ScrollView } from 'react-native';
import { TopBar, Button } from '@/components/ui';
import { lightTheme } from '@/theme/tokens';

const C = lightTheme;

interface Achievement {
  id: string;
  icon: string;
  name: string;
  description: string;
  unlocked: boolean;
  unlockedAt?: string;
  progress?: number;
  maxProgress?: number;
}

const mockAchievements: Achievement[] = [
  {
    id: '1',
    icon: '🌱',
    name: 'Green Thumb',
    description: 'Track 10 fresh items',
    unlocked: true,
    unlockedAt: '2024-05-01',
  },
  {
    id: '2',
    icon: '🔥',
    name: '7-Day Streak',
    description: 'Use the app for 7 consecutive days',
    unlocked: true,
    unlockedAt: '2024-05-08',
  },
  {
    id: '3',
    icon: '♻️',
    name: 'Zero Waste',
    description: 'No expired items for 30 days',
    unlocked: false,
    progress: 5,
    maxProgress: 30,
  },
  {
    id: '4',
    icon: '👨‍🍳',
    name: "Chef's Choice",
    description: 'Cook 5 recipes with items you have',
    unlocked: false,
    progress: 2,
    maxProgress: 5,
  },
  {
    id: '5',
    icon: '🏠',
    name: 'Household Hero',
    description: 'Share with 3 household members',
    unlocked: false,
    progress: 1,
    maxProgress: 3,
  },
  {
    id: '6',
    icon: '📊',
    name: 'Data Master',
    description: 'Track 100 items',
    unlocked: false,
    progress: 34,
    maxProgress: 100,
  },
];

export default function AchievementsScreen() {
  const [scrollY, setScrollY] = useState(0);
  const unlockedCount = mockAchievements.filter((a) => a.unlocked).length;

  return (
    <YStack flex={1} backgroundColor={C['surface/base']}>
      <ScrollView
        scrollEventThrottle={16}
        onScroll={(e) => setScrollY(e.nativeEvent.contentOffset.y)}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        <TopBar
          title="Achievements"
          subtitle={`${unlockedCount}/${mockAchievements.length} unlocked`}
          scrollY={scrollY}
        />

        {/* Streak Section */}
        <YStack paddingHorizontal={22} paddingTop={20} gap={12}>
          <Text
            fontSize={14}
            fontWeight="700"
            color={C['text/secondary']}
            textTransform="uppercase"
            letterSpacing={1}
          >
            Current Streak
          </Text>

          <YStack
            backgroundColor="linear-gradient(135deg, #FF6B47 0%, #F4B942 100%)"
            borderRadius={24}
            padding={24}
            alignItems="center"
            gap={8}
          >
            <Text fontSize={60} fontFamily="$serif">
              🔥
            </Text>
            <Text fontSize={32} fontWeight="800" color="white" fontFamily="$serif">
              7 Days
            </Text>
            <Text fontSize={14} color="rgba(255,255,255,0.9)">
              Keep it up! Don't break the chain
            </Text>
          </YStack>
        </YStack>

        {/* Achievements Grid */}
        <YStack paddingHorizontal={22} paddingTop={28} gap={12}>
          <Text
            fontSize={14}
            fontWeight="700"
            color={C['text/secondary']}
            textTransform="uppercase"
            letterSpacing={1}
          >
            All Achievements
          </Text>

          {mockAchievements.map((achievement) => (
            <YStack
              key={achievement.id}
              backgroundColor={achievement.unlocked ? C['surface/raised'] : C['surface/sunken']}
              borderRadius={16}
              padding={16}
              borderWidth={1}
              borderColor={achievement.unlocked ? C['border/subtle'] : 'rgba(0,0,0,0.05)'}
              opacity={achievement.unlocked ? 1 : 0.7}
            >
              <XStack gap={12} marginBottom={12} alignItems="flex-start">
                <Text fontSize={32}>{achievement.icon}</Text>
                <YStack flex={1} gap={2}>
                  <Text fontSize={15} fontWeight="700" color={C['text/primary']}>
                    {achievement.name}
                  </Text>
                  <Text fontSize={13} color={C['text/secondary']}>
                    {achievement.description}
                  </Text>
                </YStack>
              </XStack>

              {achievement.unlocked ? (
                <XStack gap={6} alignItems="center">
                  <Text fontSize={12} color={C['status/fresh']} fontWeight="600">
                    ✓ Unlocked
                  </Text>
                  {achievement.unlockedAt && (
                    <Text fontSize={11} color={C['text/tertiary']}>
                      on {new Date(achievement.unlockedAt).toLocaleDateString()}
                    </Text>
                  )}
                </XStack>
              ) : (
                <YStack gap={6}>
                  <XStack justifyContent="space-between" alignItems="center">
                    <Text fontSize={12} color={C['text/secondary']} fontWeight="600">
                      Progress
                    </Text>
                    <Text fontSize={12} color={C['text/secondary']} fontWeight="600">
                      {achievement.progress}/{achievement.maxProgress}
                    </Text>
                  </XStack>
                  <View
                    height={6}
                    backgroundColor={C['surface/base']}
                    borderRadius={3}
                    overflow="hidden"
                  >
                    <View
                      height={6}
                      backgroundColor={C['brand/primary']}
                      width={`${((achievement.progress || 0) / (achievement.maxProgress || 1)) * 100}%`}
                      borderRadius={3}
                    />
                  </View>
                </YStack>
              )}
            </YStack>
          ))}
        </YStack>

        {/* Share Section */}
        <YStack paddingHorizontal={22} paddingTop={28} paddingBottom={20}>
          <Button variant="secondary" size="lg" full onPress={() => {}}>
            📤 Share Your Achievements
          </Button>
        </YStack>
      </ScrollView>
    </YStack>
  );
}
