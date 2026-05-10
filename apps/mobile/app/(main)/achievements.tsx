import { ScrollView, View, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack } from 'expo-router';
import { Text, YStack, XStack } from 'tamagui';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInUp, FadeOutDown } from 'react-native-reanimated';
import { lightTheme } from '@/theme/tokens';
import { R } from '@/theme/tokens';

const C = lightTheme;

const achievements = [
  { icon: '🌱', title: 'Fresh Start', desc: 'Add your first item', tier: 'bronze' },
  { icon: '⭐', title: 'Food Saver', desc: 'Save 10 items from waste', tier: 'silver' },
  { icon: '🔥', title: '7 Day Streak', desc: 'Zero waste for 7 days', tier: 'gold' },
  { icon: '🏆', title: 'Champion', desc: 'Reach 30 day streak', tier: 'gold' },
  { icon: '👥', title: 'Household Helper', desc: 'Invite a household member', tier: 'silver' },
  { icon: '📊', title: 'Data Master', desc: 'Log 100 items', tier: 'bronze' },
  { icon: '🎯', title: 'Precision', desc: 'Categorize all items perfectly', tier: 'silver' },
  { icon: '💰', title: 'Money Saver', desc: 'Save $50 worth of food', tier: 'gold' },
  { icon: '📸', title: 'Photo Scout', desc: 'Take 10 food photos', tier: 'bronze' },
  { icon: '🌍', title: 'Eco Warrior', desc: 'Offset 50kg CO₂', tier: 'gold' },
  { icon: '🛒', title: 'Shopper', desc: 'Complete 5 shopping trips', tier: 'silver' },
  { icon: '👨‍🍳', title: 'Home Chef', desc: 'Cook 5 recipes from app', tier: 'gold' },
];

const tierColors = {
  gold: { bg: '#FFD700', light: '#FFF8DC', text: '#B8860B' },
  silver: { bg: '#C0C0C0', light: '#F5F5F5', text: '#808080' },
  bronze: { bg: '#CD7F32', light: '#FFE4B5', text: '#8B4513' },
};

export default function AchievementsScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const unlockedCount = 7;
  const totalCount = achievements.length;
  const currentLevel = Math.floor(unlockedCount / 2) + 1;
  const currentXP = (unlockedCount * 15) % 100;
  const xpToNextLevel = 100 - currentXP;

  return (
    <>
      <Stack.Screen
        options={{
          title: t('achievements.screenTitle', 'Achievements'),
          headerShown: true,
        }}
      />
      <Animated.View
        style={{ flex: 1 }}
        entering={FadeInUp.duration(300)}
        exiting={FadeOutDown.duration(200)}
      >
        <ScrollView
          contentContainerStyle={{
            paddingTop: insets.top,
            paddingHorizontal: 16,
            paddingBottom: insets.bottom + 20,
            paddingVertical: 16,
          }}
          showsVerticalScrollIndicator={false}
        >
          {/* Level Card */}
          <View
            style={{
              backgroundColor: C['surface/raised'],
              borderRadius: R.lg,
              padding: 20,
              borderWidth: 1,
              borderColor: C['border/subtle'],
              marginBottom: 20,
              alignItems: 'center',
            }}
          >
            <Text
              fontSize={14}
              color={C['text/secondary']}
              fontWeight="600"
              letterSpacing={0.3}
              marginBottom={8}
            >
              CURRENT LEVEL
            </Text>
            <Text
              fontSize={48}
              fontWeight="900"
              fontFamily="Fraunces"
              color={C['brand/primary']}
              letterSpacing={-2}
            >
              {currentLevel}
            </Text>
            <Text fontSize={13} color={C['text/secondary']} marginTop={4} marginBottom={12}>
              Food Waste Fighter
            </Text>

            {/* XP Progress */}
            <View
              style={{
                width: '100%',
                height: 6,
                backgroundColor: C['surface/sunken'],
                borderRadius: 3,
                overflow: 'hidden',
                marginBottom: 8,
              }}
            >
              <View
                style={{
                  height: '100%',
                  width: `${currentXP}%`,
                  backgroundColor: C['brand/primary'],
                }}
              />
            </View>
            <XStack justifyContent="space-between" width="100%">
              <Text fontSize={11} color={C['text/secondary']}>
                {currentXP} XP
              </Text>
              <Text fontSize={11} color={C['text/secondary']}>
                {xpToNextLevel} to Level {currentLevel + 1}
              </Text>
            </XStack>
          </View>

          {/* Stats */}
          <XStack gap={10} marginBottom={20}>
            <View
              style={{
                flex: 1,
                backgroundColor: C['surface/raised'],
                borderRadius: R.md,
                padding: 12,
                borderWidth: 1,
                borderColor: C['border/subtle'],
                alignItems: 'center',
              }}
            >
              <Text fontSize={20} marginBottom={4}>
                🏅
              </Text>
              <Text fontSize={16} fontWeight="800" color={C['text/primary']}>
                {unlockedCount}
              </Text>
              <Text fontSize={11} color={C['text/secondary']} marginTop={2}>
                Unlocked
              </Text>
            </View>
            <View
              style={{
                flex: 1,
                backgroundColor: C['surface/raised'],
                borderRadius: R.md,
                padding: 12,
                borderWidth: 1,
                borderColor: C['border/subtle'],
                alignItems: 'center',
              }}
            >
              <Text fontSize={20} marginBottom={4}>
                🎯
              </Text>
              <Text fontSize={16} fontWeight="800" color={C['text/primary']}>
                {totalCount - unlockedCount}
              </Text>
              <Text fontSize={11} color={C['text/secondary']} marginTop={2}>
                In Progress
              </Text>
            </View>
          </XStack>

          {/* Section: Unlocked Achievements */}
          <Text fontSize={14} fontWeight="700" color={C['text/primary']} marginBottom={12}>
            🌟 Unlocked
          </Text>
          <View
            style={{
              display: 'flex',
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 10,
              marginHorizontal: -5,
              marginBottom: 24,
            }}
          >
            {achievements.slice(0, unlockedCount).map((achievement, idx) => {
              const tierColor = tierColors[achievement.tier as keyof typeof tierColors];
              return (
                <View key={idx} style={{ width: '50%', paddingHorizontal: 5 }}>
                  <Pressable>
                    <YStack
                      padding={14}
                      backgroundColor={tierColor.light}
                      borderRadius={R.lg}
                      alignItems="center"
                      justifyContent="center"
                      minHeight={110}
                      borderWidth={1.5}
                      borderColor={tierColor.bg}
                    >
                      <Text fontSize={32} marginBottom={6}>
                        {achievement.icon}
                      </Text>
                      <Text
                        fontSize={12}
                        fontWeight="700"
                        fontFamily="Fraunces"
                        color={C['text/primary']}
                        textAlign="center"
                        letterSpacing={-0.2}
                      >
                        {achievement.title}
                      </Text>
                      <Text
                        fontSize={10}
                        color={C['text/secondary']}
                        marginTop={3}
                        textAlign="center"
                      >
                        {achievement.desc}
                      </Text>
                    </YStack>
                  </Pressable>
                </View>
              );
            })}
          </View>

          {/* Section: Locked Achievements */}
          <Text fontSize={14} fontWeight="700" color={C['text/primary']} marginBottom={12}>
            🔒 Locked ({totalCount - unlockedCount})
          </Text>
          <View
            style={{
              display: 'flex',
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 10,
              marginHorizontal: -5,
            }}
          >
            {achievements.slice(unlockedCount).map((achievement, idx) => (
              <View key={unlockedCount + idx} style={{ width: '50%', paddingHorizontal: 5 }}>
                <Pressable>
                  <YStack
                    padding={14}
                    backgroundColor={C['surface/sunken']}
                    borderRadius={R.lg}
                    alignItems="center"
                    justifyContent="center"
                    minHeight={110}
                    opacity={0.5}
                    borderWidth={1}
                    borderColor={C['border/subtle']}
                  >
                    <Text fontSize={32} marginBottom={6} opacity={0.5}>
                      {achievement.icon}
                    </Text>
                    <Text
                      fontSize={12}
                      fontWeight="700"
                      fontFamily="Fraunces"
                      color={C['text/primary']}
                      textAlign="center"
                      letterSpacing={-0.2}
                    >
                      {achievement.title}
                    </Text>
                    <Text
                      fontSize={10}
                      color={C['text/secondary']}
                      marginTop={3}
                      textAlign="center"
                    >
                      {achievement.desc}
                    </Text>
                  </YStack>
                </Pressable>
              </View>
            ))}
          </View>
        </ScrollView>
      </Animated.View>
    </>
  );
}
