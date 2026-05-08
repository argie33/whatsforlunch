import React from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { Text, YStack, XStack } from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import { lightTheme } from '@/theme/tokens';
import { R } from '@/theme/tokens';

const C = lightTheme;

export default function TempSensorScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const sensors = [
    { emoji: '🌡️', name: 'Fridge', temp: 38, unit: '°F', status: 'good' },
    { emoji: '❄️', name: 'Freezer', temp: 0, unit: '°F', status: 'good' },
    { emoji: '🌡️', name: 'Pantry', temp: 72, unit: '°F', status: 'good' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: C['surface/base'] }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 8,
          paddingBottom: insets.bottom + 32,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* === Header === */}
        <BlurView intensity={90} style={{ paddingTop: insets.top }}>
          <View style={{ paddingHorizontal: 22, paddingVertical: 14 }}>
            <Pressable
              onPress={() => router.back()}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: C['surface/raised'],
                borderWidth: 1,
                borderColor: C['border/subtle'],
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 12,
              }}
            >
              <Text fontSize={18}>‹</Text>
            </Pressable>
            <Text
              fontSize={28}
              fontWeight="800"
              color={C['text/primary']}
              letterSpacing={-0.8}
              fontFamily="Fraunces"
            >
              Temperature
            </Text>
          </View>
        </BlurView>

        {/* === Content === */}
        <View style={{ paddingHorizontal: 22, paddingVertical: 20, gap: 16 }}>
          {/* Sensors List */}
          <YStack gap={12}>
            {sensors.map((sensor, idx) => (
              <View
                key={idx}
                style={{
                  backgroundColor: C['surface/raised'],
                  borderRadius: 20,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: C['border/subtle'],
                }}
              >
                <XStack alignItems="center" gap={12} marginBottom={12}>
                  <Text fontSize={32}>{sensor.emoji}</Text>
                  <YStack flex={1}>
                    <Text fontSize={16} fontWeight="700" color={C['text/primary']}>
                      {sensor.name}
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 4, marginTop: 4 }}>
                      <View
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 4,
                          backgroundColor:
                            sensor.status === 'good' ? C['status/fresh'] : C['status/urgent'],
                        }}
                      />
                      <Text
                        fontSize={12}
                        color={sensor.status === 'good' ? C['status/fresh'] : C['status/urgent']}
                      >
                        {sensor.status === 'good' ? 'Optimal' : 'Alert'}
                      </Text>
                    </View>
                  </YStack>
                  <YStack alignItems="flex-end">
                    <Text
                      fontSize={24}
                      fontWeight="800"
                      color={C['text/primary']}
                      fontFamily="Fraunces"
                    >
                      {sensor.temp}
                      <Text fontSize={16}>{sensor.unit}</Text>
                    </Text>
                  </YStack>
                </XStack>
                <View
                  style={{
                    height: 6,
                    backgroundColor: C['border/subtle'],
                    borderRadius: 3,
                    overflow: 'hidden',
                  }}
                >
                  <View
                    style={{
                      height: '100%',
                      width: '60%',
                      backgroundColor: C['brand/primary'],
                    }}
                  />
                </View>
              </View>
            ))}
          </YStack>

          {/* Info Card */}
          <View
            style={{
              backgroundColor: C['surface/raised'],
              borderRadius: 20,
              padding: 16,
              borderWidth: 1,
              borderColor: C['border/subtle'],
            }}
          >
            <Text fontSize={14} fontWeight="700" color={C['text/primary']} marginBottom={8}>
              Recommended ranges
            </Text>
            <YStack gap={6}>
              {[
                { location: 'Refrigerator', range: '35-38°F' },
                { location: 'Freezer', range: '-18°F or below' },
                { location: 'Pantry', range: '50-70°F' },
              ].map((item, idx) => (
                <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text fontSize={12} color={C['text/secondary']}>
                    {item.location}
                  </Text>
                  <Text fontSize={12} fontWeight="600" color={C['text/primary']}>
                    {item.range}
                  </Text>
                </View>
              ))}
            </YStack>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
