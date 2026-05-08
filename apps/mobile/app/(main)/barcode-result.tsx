import React from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { Text, YStack, XStack } from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import { lightTheme } from '@/theme/tokens';
import { Button } from '@/components/ui/Button';

const C = lightTheme;

export default function BarcodeResultScreen() {
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
              Scan Result
            </Text>
          </View>
        </BlurView>

        {/* === Content === */}
        <View style={{ paddingHorizontal: 22, paddingVertical: 20, gap: 16 }}>
          {/* Success Icon */}
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
                backgroundColor: C['status/freshBg'],
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Text fontSize={40}>✓</Text>
            </View>
          </View>

          {/* Product Info */}
          <YStack gap={12}>
            <View
              style={{
                backgroundColor: C['surface/raised'],
                borderRadius: 22,
                padding: 16,
                borderWidth: 1,
                borderColor: C['border/subtle'],
                gap: 12,
              }}
            >
              <YStack gap={4}>
                <Text fontSize={12} color={C['text/secondary']} fontWeight="600">
                  PRODUCT NAME
                </Text>
                <Text
                  fontSize={20}
                  fontWeight="700"
                  color={C['text/primary']}
                  fontFamily="Fraunces"
                >
                  Organic Broccoli
                </Text>
              </YStack>

              <XStack justifyContent="space-between">
                <YStack>
                  <Text fontSize={11} color={C['text/secondary']} fontWeight="600">
                    EXPIRATION
                  </Text>
                  <Text fontSize={14} fontWeight="700" color={C['text/primary']}>
                    Mar 15, 2026
                  </Text>
                </YStack>
                <YStack>
                  <Text fontSize={11} color={C['text/secondary']} fontWeight="600">
                    CATEGORY
                  </Text>
                  <Text fontSize={14} fontWeight="700" color={C['text/primary']}>
                    Vegetable
                  </Text>
                </YStack>
              </XStack>
            </View>

            {/* Barcode */}
            <View
              style={{
                backgroundColor: C['surface/raised'],
                borderRadius: 12,
                padding: 20,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: C['border/subtle'],
              }}
            >
              <Text fontSize={32} marginBottom={8}>
                ▮▯▮▮▯▮▮▯▮
              </Text>
              <Text fontSize={12} color={C['text/secondary']}>
                4011111111109
              </Text>
            </View>
          </YStack>

          {/* Actions */}
          <YStack gap={10}>
            <Button variant="primary" size="lg" full onPress={() => router.back()}>
              Save to inventory
            </Button>
            <Button variant="secondary" size="lg" full onPress={() => router.back()}>
              Scan another
            </Button>
          </YStack>
        </View>
      </ScrollView>
    </View>
  );
}
