import React from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { Text, YStack, XStack } from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet } from 'react-native';
import { lightTheme } from '@/theme/tokens';
import { Button } from '@/components/ui/Button';

const C = lightTheme;

export default function ManageSubScreen() {
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
              Premium
            </Text>
          </View>
        </BlurView>

        {/* === Content === */}
        <View style={{ paddingHorizontal: 22, paddingVertical: 20, gap: 20 }}>
          {/* Current Plan */}
          <Pressable
            style={{
              borderRadius: 32,
              padding: 24,
              overflow: 'hidden',
            }}
          >
            <LinearGradient
              colors={[C['accent/plum'], C['accent/berry']]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <Text
              fontSize={11}
              fontWeight="800"
              color="rgba(255,255,255,0.9)"
              letterSpacing={2}
              marginBottom={8}
            >
              ⭐ PREMIUM ACTIVE
            </Text>
            <Text
              fontSize={28}
              fontWeight="800"
              fontFamily="Fraunces"
              color="white"
              letterSpacing={-0.5}
              marginBottom={16}
            >
              Premium Subscriber
            </Text>
            <Text fontSize={13} color="rgba(255,255,255,0.9)" marginBottom={12}>
              Renews on June 8, 2026
            </Text>
            <Text fontSize={13} color="rgba(255,255,255,0.85)">
              $4.99 per month • Cancel anytime
            </Text>
          </Pressable>

          {/* Benefits */}
          <View>
            <Text
              fontSize={12}
              fontWeight="800"
              color={C['text/secondary']}
              letterSpacing={1.5}
              marginBottom={12}
            >
              YOUR BENEFITS
            </Text>
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
                'Unlimited AI scans',
                'Family sharing (6 members)',
                'Advanced analytics & exports',
                'Custom expiry rules',
              ].map((benefit, idx) => (
                <Text
                  key={idx}
                  fontSize={14}
                  color={C['text/primary']}
                  marginBottom={idx < 3 ? 4 : 0}
                >
                  ✓ {benefit}
                </Text>
              ))}
            </View>
          </View>

          {/* Billing Details */}
          <View
            style={{
              backgroundColor: C['surface/raised'],
              borderRadius: 22,
              padding: 16,
              borderWidth: 1,
              borderColor: C['border/subtle'],
            }}
          >
            <Text fontSize={15} fontWeight="700" color={C['text/primary']} marginBottom={12}>
              Billing details
            </Text>
            {[
              { label: 'Payment method', value: 'Visa ending in 4242' },
              { label: 'Billing email', value: 'argeropolos@gmail.com' },
            ].map((item, idx) => (
              <View
                key={idx}
                style={{
                  marginBottom: idx < 1 ? 12 : 0,
                  paddingBottom: idx < 1 ? 12 : 0,
                  borderBottomWidth: idx < 1 ? 1 : 0,
                  borderBottomColor: C['border/subtle'],
                }}
              >
                <Text fontSize={12} color={C['text/secondary']} marginBottom={4}>
                  {item.label}
                </Text>
                <Text fontSize={13} color={C['text/primary']}>
                  {item.value}
                </Text>
              </View>
            ))}
          </View>

          {/* Actions */}
          <YStack gap={10}>
            <Button variant="secondary" size="lg" full onPress={() => {}}>
              Update payment method
            </Button>
            <Pressable
              onPress={() => {}}
              style={{
                backgroundColor: C['surface/raised'],
                borderRadius: 16,
                padding: 14,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: C['status/urgent'],
              }}
            >
              <Text fontSize={15} fontWeight="700" color={C['status/urgent']}>
                Cancel subscription
              </Text>
            </Pressable>
          </YStack>
        </View>
      </ScrollView>
    </View>
  );
}
