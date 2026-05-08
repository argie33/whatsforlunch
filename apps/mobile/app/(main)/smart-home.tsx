import React from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { Text, YStack, XStack } from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import { lightTheme } from '@/theme/tokens';

const C = lightTheme;

export default function SmartHomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const devices = [
    { icon: '🍳', name: 'Smart Fridge', location: 'Kitchen', connected: true },
    { icon: '❄️', name: 'Freezer', location: 'Kitchen', connected: true },
    { icon: '🥔', name: 'Pantry Sensor', location: 'Pantry', connected: false },
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
              Smart Home
            </Text>
          </View>
        </BlurView>

        {/* === Content === */}
        <View style={{ paddingHorizontal: 22, paddingVertical: 20, gap: 20 }}>
          {/* Connected Devices */}
          <View>
            <Text
              fontSize={12}
              fontWeight="800"
              color={C['text/secondary']}
              letterSpacing={1.5}
              marginBottom={12}
            >
              CONNECTED DEVICES
            </Text>
            <YStack gap={8}>
              {devices.map((device, idx) => (
                <View
                  key={idx}
                  style={{
                    backgroundColor: C['surface/raised'],
                    borderRadius: 16,
                    padding: 14,
                    borderWidth: 1,
                    borderColor: C['border/subtle'],
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <Text fontSize={20}>{device.icon}</Text>
                  <YStack flex={1}>
                    <Text fontSize={15} fontWeight="600" color={C['text/primary']}>
                      {device.name}
                    </Text>
                    <Text fontSize={12} color={C['text/secondary']}>
                      {device.location}
                    </Text>
                  </YStack>
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: device.connected ? C['status/fresh'] : C['border/subtle'],
                    }}
                  />
                </View>
              ))}
            </YStack>
          </View>

          {/* Add Device */}
          <Pressable
            onPress={() => {}}
            style={{
              backgroundColor: C['surface/raised'],
              borderRadius: 16,
              padding: 16,
              alignItems: 'center',
              borderWidth: 2,
              borderColor: C['brand/primary'],
              borderStyle: 'dashed',
              gap: 8,
            }}
          >
            <Text fontSize={24}>➕</Text>
            <Text fontSize={15} fontWeight="700" color={C['brand/primary']}>
              Add device
            </Text>
          </Pressable>

          {/* Integrations */}
          <View>
            <Text
              fontSize={12}
              fontWeight="800"
              color={C['text/secondary']}
              letterSpacing={1.5}
              marginBottom={12}
            >
              INTEGRATIONS
            </Text>
            <YStack gap={8}>
              {[
                { icon: '🏠', name: 'HomeKit', status: 'Connected' },
                { icon: '🤖', name: 'Google Home', status: 'Not connected' },
              ].map((integration, idx) => (
                <Pressable
                  key={idx}
                  onPress={() => {}}
                  style={{
                    backgroundColor: C['surface/raised'],
                    borderRadius: 16,
                    padding: 14,
                    borderWidth: 1,
                    borderColor: C['border/subtle'],
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <Text fontSize={20}>{integration.icon}</Text>
                  <YStack flex={1}>
                    <Text fontSize={15} fontWeight="600" color={C['text/primary']}>
                      {integration.name}
                    </Text>
                  </YStack>
                  <Text
                    fontSize={12}
                    fontWeight="600"
                    color={
                      integration.status === 'Connected' ? C['status/fresh'] : C['text/secondary']
                    }
                  >
                    {integration.status}
                  </Text>
                </Pressable>
              ))}
            </YStack>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
