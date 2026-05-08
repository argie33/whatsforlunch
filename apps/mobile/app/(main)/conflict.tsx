import React from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { Text, YStack, XStack } from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import { lightTheme } from '@/theme/tokens';
import { R } from '@/theme/tokens';
import { Button } from '@/components/ui/Button';

const C = lightTheme;

export default function ConflictScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

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
              Resolve Conflict
            </Text>
          </View>
        </BlurView>

        {/* === Content === */}
        <View style={{ paddingHorizontal: 22, paddingVertical: 20, gap: 20 }}>
          {/* Conflict Icon */}
          <View
            style={{
              alignItems: 'center',
              paddingVertical: 20,
            }}
          >
            <View
              style={{
                width: 80,
                height: 80,
                borderRadius: 40,
                backgroundColor: C['status/urgentBg'],
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Text fontSize={40}>⚠️</Text>
            </View>
          </View>

          {/* Conflict Description */}
          <YStack gap={8}>
            <Text
              fontSize={24}
              fontWeight="800"
              color={C['text/primary']}
              letterSpacing={-0.4}
              fontFamily="Fraunces"
              textAlign="center"
            >
              Conflicting changes
            </Text>
            <Text fontSize={14} color={C['text/secondary']} textAlign="center" lineHeight={20}>
              Two family members changed this item. Choose which version to keep.
            </Text>
          </YStack>

          {/* Version Options */}
          <YStack gap={12}>
            <View
              style={{
                backgroundColor: C['surface/raised'],
                borderRadius: 20,
                padding: 16,
                borderWidth: 2,
                borderColor: C['brand/primary'],
              }}
            >
              <Text fontSize={12} color={C['text/secondary']} fontWeight="600" marginBottom={4}>
                YOUR VERSION
              </Text>
              <Text
                fontSize={16}
                fontWeight="700"
                color={C['text/primary']}
                marginBottom={8}
                fontFamily="Fraunces"
              >
                Organic Broccoli
              </Text>
              <XStack gap={12}>
                <YStack flex={1}>
                  <Text fontSize={11} color={C['text/secondary']}>
                    Expires
                  </Text>
                  <Text fontSize={14} fontWeight="700" color={C['text/primary']}>
                    Mar 15, 2026
                  </Text>
                </YStack>
                <YStack flex={1}>
                  <Text fontSize={11} color={C['text/secondary']}>
                    Location
                  </Text>
                  <Text fontSize={14} fontWeight="700" color={C['text/primary']}>
                    Fridge
                  </Text>
                </YStack>
              </XStack>
            </View>

            <View
              style={{
                backgroundColor: C['surface/raised'],
                borderRadius: 20,
                padding: 16,
                borderWidth: 1,
                borderColor: C['border/subtle'],
              }}
            >
              <Text fontSize={12} color={C['text/secondary']} fontWeight="600" marginBottom={4}>
                SARAH'S VERSION
              </Text>
              <Text
                fontSize={16}
                fontWeight="700"
                color={C['text/primary']}
                marginBottom={8}
                fontFamily="Fraunces"
              >
                Organic Broccoli
              </Text>
              <XStack gap={12}>
                <YStack flex={1}>
                  <Text fontSize={11} color={C['text/secondary']}>
                    Expires
                  </Text>
                  <Text fontSize={14} fontWeight="700" color={C['text/primary']}>
                    Mar 20, 2026
                  </Text>
                </YStack>
                <YStack flex={1}>
                  <Text fontSize={11} color={C['text/secondary']}>
                    Location
                  </Text>
                  <Text fontSize={14} fontWeight="700" color={C['text/primary']}>
                    Freezer
                  </Text>
                </YStack>
              </XStack>
            </View>
          </YStack>

          {/* Actions */}
          <YStack gap={10}>
            <Button variant="primary" size="lg" full onPress={() => router.back()}>
              Keep your version
            </Button>
            <Button variant="secondary" size="lg" full onPress={() => router.back()}>
              Keep Sarah's version
            </Button>
          </YStack>
        </View>
      </ScrollView>
    </View>
  );
}
