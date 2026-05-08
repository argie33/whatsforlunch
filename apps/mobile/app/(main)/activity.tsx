import { ScrollView, View } from 'react-native';
import { Stack } from 'expo-router';
import { Text, YStack, XStack } from 'tamagui';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const activityLog = [
  { time: 'Just now', user: 'You', action: 'Marked spinach as eaten', icon: '✓' },
  { time: '2 hours ago', user: 'Sarah', action: 'Added chicken to fridge', icon: '➕' },
  { time: '5 hours ago', user: 'You', action: 'Bought milk and eggs', icon: '🛒' },
  { time: 'Yesterday', user: 'Mike', action: 'Completed shopping trip', icon: '🛒' },
  { time: 'Yesterday', user: 'You', action: 'Created container "Meal prep"', icon: '📦' },
  { time: '2 days ago', user: 'Sarah', action: 'Marked broccoli as wasted', icon: 'x' },
  { time: '2 days ago', user: 'You', action: 'Froze leftover pasta', icon: '❄️' },
  { time: '3 days ago', user: 'Mike', action: 'Added oranges', icon: '➕' },
];

export default function ActivityScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <>
      <Stack.Screen
        options={{
          title: t('activity.screenTitle', 'Activity'),
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
        {/* Today Section */}
        <Text fontSize={13} fontWeight="800" color="#5C615E" letterSpacing={1} marginBottom={12}>
          TODAY
        </Text>

        {activityLog.slice(0, 3).map((activity, idx) => (
          <XStack
            key={idx}
            paddingHorizontal={16}
            paddingVertical={12}
            backgroundColor="#FFFFFF"
            borderRadius={12}
            marginBottom={10}
            alignItems="flex-start"
            gap={12}
          >
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: '#E8F2EC',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Text fontSize={16}>{activity.icon}</Text>
            </View>
            <YStack flex={1}>
              <XStack gap={6} alignItems="center">
                <Text fontSize={13} fontWeight="700" color="#0F1411">
                  {activity.user}
                </Text>
                <Text fontSize={11} color="#5C615E">
                  {activity.action}
                </Text>
              </XStack>
              <Text fontSize={12} color="#8B908D" marginTop={4}>
                {activity.time}
              </Text>
            </YStack>
          </XStack>
        ))}

        {/* Earlier Section */}
        <Text
          fontSize={13}
          fontWeight="800"
          color="#5C615E"
          letterSpacing={1}
          marginTop={20}
          marginBottom={12}
        >
          EARLIER
        </Text>

        {activityLog.slice(3).map((activity, idx) => (
          <XStack
            key={idx}
            paddingHorizontal={16}
            paddingVertical={12}
            backgroundColor="#FFFFFF"
            borderRadius={12}
            marginBottom={10}
            alignItems="flex-start"
            gap={12}
          >
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: '#F2F0EB',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Text fontSize={16}>{activity.icon}</Text>
            </View>
            <YStack flex={1}>
              <XStack gap={6} alignItems="center">
                <Text fontSize={13} fontWeight="700" color="#0F1411">
                  {activity.user}
                </Text>
                <Text fontSize={11} color="#5C615E">
                  {activity.action}
                </Text>
              </XStack>
              <Text fontSize={12} color="#8B908D" marginTop={4}>
                {activity.time}
              </Text>
            </YStack>
          </XStack>
        ))}
      </ScrollView>
    </>
  );
}
