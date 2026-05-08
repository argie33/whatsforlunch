import { ScrollView, View, Pressable } from 'react-native';
import { Stack } from 'expo-router';
import { Text, YStack, XStack } from 'tamagui';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { lightTheme } from '@/theme/tokens';

const C = lightTheme;

const achievements = [
  { icon: '🌱', title: 'Fresh Start', desc: 'Add your first item' },
  { icon: '⭐', title: 'Food Saver', desc: 'Save 10 items from waste' },
  { icon: '🔥', title: '7 Day Streak', desc: 'Zero waste for 7 days' },
  { icon: '🏆', title: 'Champion', desc: 'Reach 30 day streak' },
  { icon: '👥', title: 'Household Helper', desc: 'Invite a household member' },
  { icon: '📊', title: 'Data Master', desc: 'Log 100 items' },
  { icon: '🎯', title: 'Precision', desc: 'Categorize all items perfectly' },
  { icon: '💰', title: 'Money Saver', desc: 'Save $50 worth of food' },
  { icon: '📸', title: 'Photo Scout', desc: 'Take 10 food photos' },
  { icon: '🌍', title: 'Eco Warrior', desc: 'Offset 50kg CO₂' },
  { icon: '🛒', title: 'Shopper', desc: 'Complete 5 shopping trips' },
  { icon: '👨‍🍳', title: 'Home Chef', desc: 'Cook 5 recipes from app' },
];

export default function AchievementsScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const unlockedCount = 7;
  const totalCount = achievements.length;

  return (
    <>
      <Stack.Screen
        options={{
          title: t('achievements.screenTitle', 'Achievements'),
          headerShown: true,
        }}
      />
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top,
          paddingHorizontal: 16,
          paddingBottom: insets.bottom + 20,
          paddingVertical: 16,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <YStack marginBottom={20} alignItems="center">
          <Text fontSize={32} fontWeight="800" color={C['text/primary']}>
            🏆
          </Text>
          <Text fontSize={24} fontWeight="800" color={C['text/primary']} marginTop={8}>
            {unlockedCount}/{totalCount} Achievements
          </Text>
          <Text fontSize={13} color={C['text/secondary']} marginTop={4}>
            Keep going to unlock more!
          </Text>
        </YStack>

        {/* Progress Bar */}
        <View
          style={{
            height: 8,
            backgroundColor: C['surface/sunken'],
            borderRadius: 4,
            overflow: 'hidden',
            marginBottom: 20,
          }}
        >
          <View
            style={{
              height: '100%',
              width: `${(unlockedCount / totalCount) * 100}%`,
              backgroundColor: C['brand/primary'],
            }}
          />
        </View>

        {/* Achievements Grid */}
        <View
          style={{
            display: 'flex',
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 10,
            marginHorizontal: -5,
          }}
        >
          {achievements.map((achievement, idx) => (
            <View key={idx} style={{ width: '50%', paddingHorizontal: 5 }}>
              <Pressable>
                <YStack
                  padding={16}
                  backgroundColor={idx < unlockedCount ? C['surface/raised'] : C['surface/sunken']}
                  borderRadius={12}
                  alignItems="center"
                  justifyContent="center"
                  minHeight={120}
                  opacity={idx < unlockedCount ? 1 : 0.6}
                  borderWidth={1}
                  borderColor={C['border/subtle']}
                >
                  <Text fontSize={32} marginBottom={8}>
                    {achievement.icon}
                  </Text>
                  <Text fontSize={13} fontWeight="700" color={C['text/primary']} textAlign="center">
                    {achievement.title}
                  </Text>
                  <Text fontSize={11} color={C['text/secondary']} marginTop={4} textAlign="center">
                    {achievement.desc}
                  </Text>
                  {idx < unlockedCount && (
                    <View
                      style={{
                        marginTop: 8,
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        backgroundColor: C['brand/primaryMuted'],
                        borderRadius: 6,
                      }}
                    >
                      <Text fontSize={10} fontWeight="700" color={C['brand/primary']}>
                        Unlocked
                      </Text>
                    </View>
                  )}
                </YStack>
              </Pressable>
            </View>
          ))}
        </View>
      </ScrollView>
    </>
  );
}
