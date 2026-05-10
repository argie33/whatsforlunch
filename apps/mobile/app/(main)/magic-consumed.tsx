import React from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { Text, YStack } from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import { lightTheme } from '@/theme/tokens';
import { R } from '@/theme/tokens';
import { Button } from '@/components/ui/Button';

const C = lightTheme;

export default function MagicConsumedScreen() {
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
              Link Consumed
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
          {/* Icon */}
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

          {/* Message */}
          <YStack gap={8} alignItems="center">
            <Text
              fontSize={24}
              fontWeight="800"
              color={C['text/primary']}
              letterSpacing={-0.4}
              fontFamily="Fraunces"
              textAlign="center"
            >
              Link already used
            </Text>
            <Text fontSize={14} color={C['text/secondary']} textAlign="center" lineHeight={20}>
              This invitation link has already been activated.
            </Text>
          </YStack>

          {/* Info Card */}
          <View
            style={{
              backgroundColor: C['surface/raised'],
              borderRadius: 20,
              padding: 16,
              borderWidth: 1,
              borderColor: C['border/subtle'],
              width: '100%',
            }}
          >
            <Text fontSize={12} color={C['text/secondary']} fontWeight="600" marginBottom={4}>
              ACTIVATED
            </Text>
            <Text fontSize={15} fontWeight="700" color={C['text/primary']} marginBottom={8}>
              May 5, 2026 at 2:34 PM
            </Text>
            <Text fontSize={12} color={C['text/secondary']}>
              By argeropolos@gmail.com
            </Text>
          </View>

          {/* Action */}
          <Button variant="primary" size="lg" full onPress={() => router.push('/')}>
            Go home
          </Button>
        </View>
      </ScrollView>
    </View>
  );
}
