import { ScrollView, View } from 'react-native';
import { Stack } from 'expo-router';
import { Text, YStack, XStack } from 'tamagui';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
        <YStack padding={16} backgroundColor="#FFFFFF" borderRadius={16} marginBottom={16}>
          <Text fontSize={12} color="#5C615E" fontWeight="800">
            💡 THIS MONTH
          </Text>
          <Text fontSize={28} fontWeight="800" color="#0F1411" marginTop={8}>
            You saved $127
          </Text>
          <Text fontSize={14} color="#5C615E" marginTop={8} lineHeight={20}>
            Eating items before they expire saved 8.4 lbs of food from the trash.
          </Text>
        </YStack>

        {/* Stats Grid */}
        <YStack gap={12} marginBottom={20}>
          <YStack padding={16} backgroundColor="#E8F2EC" borderRadius={12}>
            <Text fontSize={12} color="#2F7D5B" fontWeight="600">
              Items saved this month
            </Text>
            <Text fontSize={24} fontWeight="800" color="#2F7D5B" marginTop={4}>
              42
            </Text>
          </YStack>

          <YStack padding={16} backgroundColor="#FAF1E1" borderRadius={12}>
            <Text fontSize={12} color="#C98A2B" fontWeight="600">
              Waste reduced
            </Text>
            <Text fontSize={24} fontWeight="800" color="#C98A2B" marginTop={4}>
              8.4 lbs
            </Text>
          </YStack>

          <YStack padding={16} backgroundColor="#FAE8E5" borderRadius={12}>
            <Text fontSize={12} color="#C24A3E" fontWeight="600">
              Carbon offset
            </Text>
            <Text fontSize={24} fontWeight="800" color="#C24A3E" marginTop={4}>
              12.2 kg CO₂
            </Text>
          </YStack>
        </YStack>

        {/* Weekly Breakdown */}
        <YStack padding={16} backgroundColor="#FFFFFF" borderRadius={16} marginBottom={16}>
          <Text fontSize={16} fontWeight="800" color="#0F1411" marginBottom={12}>
            Weekly breakdown
          </Text>
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, idx) => (
            <XStack
              key={day}
              justifyContent="space-between"
              alignItems="center"
              paddingVertical={8}
              borderBottomWidth={idx < 6 ? 1 : 0}
              borderBottomColor="#E8E5DE"
            >
              <Text fontSize={14} fontWeight="500" color="#0F1411">
                {day}
              </Text>
              <XStack alignItems="center" gap={8}>
                <View
                  style={{
                    height: 24,
                    width: Math.random() * 120 + 20,
                    backgroundColor: '#2F7D5B',
                    borderRadius: 4,
                  }}
                />
                <Text fontSize={14} fontWeight="600" color="#0F1411" width={40}>
                  ${Math.floor(Math.random() * 20 + 10)}
                </Text>
              </XStack>
            </XStack>
          ))}
        </YStack>

        {/* Achievements Progress */}
        <YStack padding={16} backgroundColor="#FFFFFF" borderRadius={16} marginBottom={16}>
          <Text fontSize={16} fontWeight="800" color="#0F1411" marginBottom={12}>
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
                  <Text fontSize={13} fontWeight="600" color="#0F1411">
                    {achievement.name}
                  </Text>
                  <Text fontSize={12} color="#5C615E">
                    {achievement.progress}%
                  </Text>
                </XStack>
                <View
                  style={{
                    height: 6,
                    backgroundColor: '#F2F0EB',
                    borderRadius: 3,
                    overflow: 'hidden',
                  }}
                >
                  <View
                    style={{
                      height: '100%',
                      width: `${achievement.progress}%`,
                      backgroundColor: '#2F7D5B',
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
          backgroundColor="#FFFFFF"
          borderRadius={16}
          borderWidth={1}
          borderColor="#E8E5DE"
        >
          <Text fontSize={14} fontWeight="700" color="#0F1411">
            Unlock advanced analytics
          </Text>
          <Text fontSize={12} color="#5C615E" marginTop={6}>
            Get detailed nutritional tracking, meal planning, and dietary recommendations with
            Premium.
          </Text>
        </YStack>
      </ScrollView>
    </>
  );
}
