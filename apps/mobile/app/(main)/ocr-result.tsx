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

export default function OCRResultScreen() {
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
              Receipt Items
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

          {/* Detected Items */}
          <YStack gap={12}>
            {[
              { name: 'Organic Broccoli', qty: '2x', price: '$3.99' },
              { name: 'Greek Yogurt 500g', qty: '1x', price: '$4.49' },
              { name: 'Almond Butter', qty: '1x', price: '$8.99' },
            ].map((item, idx) => (
              <View
                key={idx}
                style={{
                  backgroundColor: C['surface/raised'],
                  borderRadius: 20,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: C['border/subtle'],
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <YStack flex={1}>
                  <Text
                    fontSize={16}
                    fontWeight="700"
                    color={C['text/primary']}
                    fontFamily="Fraunces"
                  >
                    {item.name}
                  </Text>
                  <Text fontSize={13} color={C['text/secondary']} marginTop={4}>
                    {item.qty}
                  </Text>
                </YStack>
                <Text fontSize={15} fontWeight="700" color={C['text/primary']}>
                  {item.price}
                </Text>
              </View>
            ))}
          </YStack>

          {/* Total */}
          <View
            style={{
              backgroundColor: C['surface/raised'],
              borderRadius: 20,
              padding: 16,
              borderWidth: 1,
              borderColor: C['border/subtle'],
            }}
          >
            <XStack justifyContent="space-between" marginBottom={8}>
              <Text fontSize={14} color={C['text/secondary']}>
                Subtotal
              </Text>
              <Text fontSize={14} color={C['text/primary']}>
                $17.47
              </Text>
            </XStack>
            <XStack
              justifyContent="space-between"
              paddingTop={8}
              borderTopWidth={1}
              borderTopColor={C['border/subtle']}
            >
              <Text fontSize={16} fontWeight="700" color={C['text/primary']}>
                Total
              </Text>
              <Text fontSize={16} fontWeight="700" color={C['brand/primary']}>
                $17.47
              </Text>
            </XStack>
          </View>

          {/* Actions */}
          <YStack gap={10}>
            <Button variant="primary" size="lg" full onPress={() => router.back()}>
              Save items
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
