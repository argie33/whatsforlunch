import React from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { Text, YStack, XStack } from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import { lightTheme } from '@/theme/tokens';
import { Button } from '@/components/ui/Button';

const C = lightTheme;

export default function PermissionScreen() {
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
              Permissions
            </Text>
          </View>
        </BlurView>

        {/* === Content === */}
        <View style={{ paddingHorizontal: 22, paddingVertical: 20, gap: 20 }}>
          {/* Illustration */}
          <View
            style={{
              alignItems: 'center',
              paddingVertical: 40,
            }}
          >
            <Text fontSize={80}>📱</Text>
          </View>

          {/* Title & Subtitle */}
          <YStack gap={8}>
            <Text
              fontSize={24}
              fontWeight="800"
              color={C['text/primary']}
              letterSpacing={-0.4}
              fontFamily="Fraunces"
              textAlign="center"
            >
              We need camera access
            </Text>
            <Text fontSize={14} color={C['text/secondary']} textAlign="center" lineHeight={20}>
              To scan barcodes and receipts, we need permission to use your device's camera.
            </Text>
          </YStack>

          {/* Permission Details */}
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
            <XStack gap={12}>
              <Text fontSize={20}>📷</Text>
              <YStack flex={1}>
                <Text fontSize={15} fontWeight="700" color={C['text/primary']}>
                  Camera
                </Text>
                <Text fontSize={13} color={C['text/secondary']}>
                  Used for scanning and photos
                </Text>
              </YStack>
            </XStack>
          </View>

          {/* CTA Buttons */}
          <YStack gap={10}>
            <Button
              variant="primary"
              size="lg"
              full
              onPress={() => {
                // Request permission logic here
                router.back();
              }}
            >
              Allow Camera Access
            </Button>
            <Button variant="secondary" size="lg" full onPress={() => router.back()}>
              Not now
            </Button>
          </YStack>
        </View>
      </ScrollView>
    </View>
  );
}
