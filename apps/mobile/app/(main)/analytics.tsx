import { ScrollView, View } from 'react-native';
import { Stack } from 'expo-router';
import { Text, YStack, XStack } from 'tamagui';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { lightTheme } from '@/theme/tokens';
import { R } from '@/theme/tokens';

const C = lightTheme;

export default function AnalyticsScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <>
      <Stack.Screen
        options={{
          title: t('analytics.screenTitle', 'Insights'),
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
        {/* This Month Stats */}
        <YStack
          padding={16}
          backgroundColor={C['surface/raised']}
          borderRadius={32}
          marginBottom={16}
          borderWidth={1}
          borderColor={C['border/subtle']}
        >
          <Text
            fontSize={12}
            color={C['text/secondary']}
            fontWeight="800"
            textTransform="uppercase"
            letterSpacing={0.3}
          >
            💡 This month
          </Text>
          <Text
            fontSize={32}
            fontWeight="800"
            fontFamily="Fraunces"
            color={C['text/primary']}
            marginTop={8}
            letterSpacing={-1.2}
          >
            You saved $127
          </Text>
          <Text fontSize={14} color={C['text/secondary']} marginTop={8} lineHeight={20}>
            Eating items before they expire saved 8.4 lbs of food from the trash.
          </Text>
        </YStack>

        {/* Stats Grid */}
        <YStack gap={12} marginBottom={20}>
          <YStack
            padding={16}
            backgroundColor={C['status/freshBg']}
            borderRadius={32}
            borderWidth={1}
            borderColor={C['status/fresh']}
          >
            <Text fontSize={12} color={C['status/fresh']} fontWeight="600" letterSpacing={0.3}>
              Items saved this month
            </Text>
            <Text
              fontSize={32}
              fontWeight="800"
              fontFamily="Fraunces"
              color={C['status/fresh']}
              marginTop={4}
              letterSpacing={-1}
            >
              42
            </Text>
          </YStack>

          <YStack
            padding={16}
            backgroundColor={C['accent/honeySoft']}
            borderRadius={32}
            borderWidth={1}
            borderColor={C['accent/honey']}
          >
            <Text fontSize={12} color={C['accent/honey']} fontWeight="600" letterSpacing={0.3}>
              Waste reduced
            </Text>
            <Text
              fontSize={32}
              fontWeight="800"
              fontFamily="Fraunces"
              color={C['accent/honey']}
              marginTop={4}
              letterSpacing={-1}
            >
              8.4 lbs
            </Text>
          </YStack>

          <YStack
            padding={16}
            backgroundColor={C['status/urgentBg']}
            borderRadius={32}
            borderWidth={1}
            borderColor={C['status/urgent']}
          >
            <Text fontSize={12} color={C['status/urgent']} fontWeight="600" letterSpacing={0.3}>
              Carbon offset
            </Text>
            <Text
              fontSize={32}
              fontWeight="800"
              fontFamily="Fraunces"
              color={C['status/urgent']}
              marginTop={4}
              letterSpacing={-1}
            >
              12.2 kg CO₂
            </Text>
          </YStack>
        </YStack>

        {/* Weekly Breakdown */}
        <YStack
          padding={16}
          backgroundColor={C['surface/raised']}
          borderRadius={32}
          marginBottom={16}
          borderWidth={1}
          borderColor={C['border/subtle']}
        >
          <Text
            fontSize={16}
            fontWeight="800"
            fontFamily="Fraunces"
            color={C['text/primary']}
            marginBottom={12}
            letterSpacing={-0.3}
          >
            Weekly breakdown
          </Text>
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, idx) => (
            <XStack
              key={day}
              justifyContent="space-between"
              alignItems="center"
              paddingVertical={8}
              borderBottomWidth={idx < 6 ? 1 : 0}
              borderBottomColor={C['border/subtle']}
            >
              <Text fontSize={14} fontWeight="500" color={C['text/primary']}>
                {day}
              </Text>
              <XStack alignItems="center" gap={8}>
                <View
                  style={{
                    height: 24,
                    width: Math.random() * 120 + 20,
                    backgroundColor: C['brand/primary'],
                    borderRadius: 4,
                  }}
                />
                <Text fontSize={14} fontWeight="600" color={C['text/primary']} width={40}>
                  ${Math.floor(Math.random() * 20 + 10)}
                </Text>
              </XStack>
            </XStack>
          ))}
        </YStack>

        {/* Achievements Progress */}
        <YStack
          padding={16}
          backgroundColor={C['surface/raised']}
          borderRadius={32}
          marginBottom={16}
          borderWidth={1}
          borderColor={C['border/subtle']}
        >
          <Text
            fontSize={16}
            fontWeight="800"
            fontFamily="Fraunces"
            color={C['text/primary']}
            marginBottom={12}
            letterSpacing={-0.3}
          >
            Achievements progress
          </Text>
          <YStack gap={12}>
            {[
              { name: 'Zero Waste Week', progress: 65 },
              { name: 'Meal Planner', progress: 40 },
              { name: 'Community Helper', progress: 75 },
            ].map((achievement) => (
              <YStack key={achievement.name}>
                <XStack justifyContent="space-between" alignItems="center" marginBottom={4}>
                  <Text fontSize={13} fontWeight="600" color={C['text/primary']}>
                    {achievement.name}
                  </Text>
                  <Text fontSize={12} color={C['text/secondary']}>
                    {achievement.progress}%
                  </Text>
                </XStack>
                <View
                  style={{
                    height: 6,
                    backgroundColor: C['surface/sunken'],
                    borderRadius: 3,
                    overflow: 'hidden',
                  }}
                >
                  <View
                    style={{
                      height: '100%',
                      width: `${achievement.progress}%`,
                      backgroundColor: C['brand/primary'],
                      borderRadius: 3,
                    }}
                  />
                </View>
              </YStack>
            ))}
          </YStack>
        </YStack>

        {/* Premium Unlock */}
        <YStack
          padding={16}
          backgroundColor={C['surface/raised']}
          borderRadius={32}
          borderWidth={1}
          borderColor={C['border/subtle']}
        >
          <Text fontSize={14} fontWeight="700" color={C['text/primary']}>
            Unlock advanced analytics
          </Text>
          <Text fontSize={12} color={C['text/secondary']} marginTop={6} lineHeight={18}>
            Get detailed nutritional tracking, meal planning, and dietary recommendations with
            Premium.
          </Text>
        </YStack>
      </ScrollView>
    </>
  );
}
