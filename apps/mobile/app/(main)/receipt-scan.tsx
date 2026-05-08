import React from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { Text, YStack } from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import { lightTheme } from '@/theme/tokens';
import { Button } from '@/components/ui/Button';

const C = lightTheme;

export default function ReceiptScanScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={{ flex: 1, backgroundColor: C['surface/base'] }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 8,
          paddingBottom: insets.bottom + 32,
          flex: 1,
          justifyContent: 'center',
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
              Scan Receipt
            </Text>
          </View>
        </BlurView>

        {/* === Content === */}
        <View
          style={{
            paddingHorizontal: 22,
            alignItems: 'center',
            gap: 20,
          }}
        >
          {/* Illustration */}
          <Text fontSize={80}>📸</Text>

          {/* Title & Subtitle */}
          <YStack gap={8} alignItems="center">
            <Text
              fontSize={24}
              fontWeight="800"
              color={C['text/primary']}
              letterSpacing={-0.4}
              fontFamily="Fraunces"
              textAlign="center"
            >
              Capture your receipt
            </Text>
            <Text fontSize={14} color={C['text/secondary']} textAlign="center" lineHeight={20}>
              Point your camera at the receipt and we'll extract the items automatically.
            </Text>
          </YStack>

          {/* Camera Preview Placeholder */}
          <View
            style={{
              width: '100%',
              height: 300,
              backgroundColor: C['surface/raised'],
              borderRadius: 32,
              borderWidth: 2,
              borderColor: C['brand/primary'],
              justifyContent: 'center',
              alignItems: 'center',
              marginVertical: 20,
            }}
          >
            <Text fontSize={60}>📷</Text>
          </View>

          {/* Instructions */}
          <View
            style={{
              backgroundColor: C['surface/raised'],
              borderRadius: 22,
              padding: 16,
              borderWidth: 1,
              borderColor: C['border/subtle'],
              width: '100%',
            }}
          >
            {[
              'Make sure all text is visible',
              'Avoid shadows and glare',
              'Hold camera steady for 2 seconds',
            ].map((instruction, idx) => (
              <Text
                key={idx}
                fontSize={13}
                color={C['text/secondary']}
                marginBottom={idx < 2 ? 8 : 0}
              >
                ✓ {instruction}
              </Text>
            ))}
          </View>

          {/* CTA Buttons */}
          <YStack gap={10} width="100%">
            <Button variant="primary" size="lg" full onPress={() => router.push('/ocr-result')}>
              Start scanning
            </Button>
            <Button variant="secondary" size="lg" full onPress={() => router.back()}>
              Cancel
            </Button>
          </YStack>
        </View>
      </ScrollView>
    </View>
  );
}
