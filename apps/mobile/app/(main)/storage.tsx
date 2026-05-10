import React from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { Text, YStack } from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import { lightTheme } from '@/theme/tokens';
import { R } from '@/theme/tokens';

const C = lightTheme;

export default function StorageScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const containers = [
    { emoji: '🍳', name: 'Main Fridge', items: 24, capacity: 32 },
    { emoji: '❄️', name: 'Freezer', items: 18, capacity: 32 },
    { emoji: '🥔', name: 'Pantry', items: 12, capacity: 48 },
    { emoji: '🧊', name: 'Drawer 1', items: 8, capacity: 16 },
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
              Storage
            </Text>
          </View>
        </BlurView>

        {/* === Content === */}
        <View style={{ paddingHorizontal: 22, paddingVertical: 20, gap: 16 }}>
          {/* Total Summary */}
          <View
            style={{
              backgroundColor: C['surface/raised'],
              borderRadius: 20,
              padding: 16,
              borderWidth: 1,
              borderColor: C['border/subtle'],
            }}
          >
            <Text fontSize={12} color={C['text/secondary']} fontWeight="600" marginBottom={8}>
              TOTAL CAPACITY
            </Text>
            <YStack gap={4}>
              <Text fontSize={24} fontWeight="800" color={C['brand/primary']} fontFamily="Fraunces">
                62 of 128 items
              </Text>
              <View
                style={{
                  height: 8,
                  backgroundColor: C['border/subtle'],
                  borderRadius: 4,
                  overflow: 'hidden',
                  marginTop: 8,
                }}
              >
                <View
                  style={{
                    height: '100%',
                    width: '48.4%',
                    backgroundColor: C['brand/primary'],
                  }}
                />
              </View>
              <Text fontSize={12} color={C['text/secondary']} marginTop={4}>
                48% full
              </Text>
            </YStack>
          </View>

          {/* Containers List */}
          <YStack gap={12}>
            {containers.map((container, idx) => (
              <Pressable
                key={idx}
                onPress={() => {}}
                style={{
                  backgroundColor: C['surface/raised'],
                  borderRadius: 20,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: C['border/subtle'],
                }}
              >
                <View
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}
                >
                  <Text fontSize={28}>{container.emoji}</Text>
                  <YStack flex={1}>
                    <Text fontSize={16} fontWeight="700" color={C['text/primary']}>
                      {container.name}
                    </Text>
                    <Text fontSize={13} color={C['text/secondary']}>
                      {container.items}/{container.capacity} items
                    </Text>
                  </YStack>
                </View>
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
                      width: `${(container.items / container.capacity) * 100}%`,
                      backgroundColor:
                        container.items / container.capacity > 0.75
                          ? C['status/urgent']
                          : container.items / container.capacity > 0.5
                            ? C['status/soon']
                            : C['status/fresh'],
                    }}
                  />
                </View>
              </Pressable>
            ))}
          </YStack>
        </View>
      </ScrollView>
    </View>
  );
}
