import React from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { Text, YStack } from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import { lightTheme } from '@/theme/tokens';
import { Button } from '@/components/ui/Button';

const C = lightTheme;

export default function BiometricScreen() {
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
              Biometric Login
            </Text>
          </View>
        </BlurView>

        {/* === Content === */}
        <View
          style={{
            paddingHorizontal: 22,
            paddingVertical: 20,
            gap: 20,
          }}
        >
          {/* Illustration */}
          <View
            style={{
              alignItems: 'center',
              paddingVertical: 40,
            }}
          >
            <Text fontSize={80}>👆</Text>
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
              Quick access
            </Text>
            <Text fontSize={14} color={C['text/secondary']} textAlign="center" lineHeight={20}>
              Use your fingerprint or face to quickly access your account.
            </Text>
          </YStack>

          {/* Features */}
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
            {[
              { emoji: '👆', title: 'Fingerprint', desc: 'Fast and secure' },
              { emoji: '👤', title: 'Face ID', desc: 'Recognize your face' },
            ].map((item, idx) => (
              <View
                key={idx}
                style={{
                  flexDirection: 'row',
                  gap: 12,
                  paddingBottom: idx < 1 ? 12 : 0,
                  borderBottomWidth: idx < 1 ? 1 : 0,
                  borderBottomColor: C['border/subtle'],
                }}
              >
                <Text fontSize={24}>{item.emoji}</Text>
                <YStack flex={1}>
                  <Text fontSize={15} fontWeight="700" color={C['text/primary']}>
                    {item.title}
                  </Text>
                  <Text fontSize={13} color={C['text/secondary']}>
                    {item.desc}
                  </Text>
                </YStack>
              </View>
            ))}
          </View>

          {/* CTA Buttons */}
          <YStack gap={10}>
            <Button variant="primary" size="lg" full onPress={() => router.back()}>
              Enable biometric
            </Button>
            <Button variant="secondary" size="lg" full onPress={() => router.back()}>
              Use password instead
            </Button>
          </YStack>
        </View>
      </ScrollView>
    </View>
  );
}
