import React, { useState } from 'react';
import { ScrollView, View, Pressable } from 'react-native';
import { Text, YStack, XStack } from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { FadeInUp, FadeOutDown } from 'react-native-reanimated';
import { lightTheme } from '@/theme/tokens';
import { R } from '@/theme/tokens';
import { Button } from '@/components/ui/Button';

const C = lightTheme;

export default function StickersScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [quantity, setQuantity] = useState(12);
  const [size, setSize] = useState<'small' | 'medium' | 'large'>('medium');

  const SIZES = [
    { key: 'small' as const, label: 'Small (1")', desc: 'Condiment jars' },
    { key: 'medium' as const, label: 'Medium (1.5")', desc: 'Standard containers' },
    { key: 'large' as const, label: 'Large (2")', desc: 'Large containers' },
  ];

  const PRICE_PER_STICKER = 0.99;
  const totalPrice = (quantity * PRICE_PER_STICKER).toFixed(2);

  return (
    <>
      <Animated.View
        style={{ flex: 1, backgroundColor: C['surface/base'] }}
        entering={FadeInUp.duration(300)}
        exiting={FadeOutDown.duration(200)}
      >
        <ScrollView
          contentContainerStyle={{
            paddingTop: insets.top + 8,
            paddingHorizontal: 22,
            paddingBottom: insets.bottom + 20,
          }}
          showsVerticalScrollIndicator={false}
        >
          {/* === Header === */}
          <YStack marginBottom={24}>
            <Text fontSize={12} fontWeight="600" color={C['text/secondary']} letterSpacing={0.3}>
              PREMIUM
            </Text>
            <Text
              fontSize={28}
              fontWeight="800"
              color={C['text/primary']}
              letterSpacing={-0.8}
              marginTop={2}
              fontFamily="Fraunces"
            >
              QR Stickers
            </Text>
          </YStack>

          {/* === Preview === */}
          <View
            style={{
              backgroundColor: C['surface/raised'],
              borderRadius: R.lg,
              padding: 20,
              marginBottom: 24,
              borderWidth: 1,
              borderColor: C['border/subtle'],
            }}
          >
            <Text
              fontSize={12}
              fontWeight="600"
              color={C['text/secondary']}
              letterSpacing={0.3}
              marginBottom={12}
            >
              PDF PREVIEW
            </Text>
            <View
              style={{
                backgroundColor: 'white',
                borderRadius: R.md,
                padding: 16,
                aspectRatio: 8.5 / 11,
                justifyContent: 'space-around',
                alignItems: 'center',
                marginBottom: 12,
              }}
            >
              <View
                style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}
              >
                {[...Array(quantity)].map((_, idx) => (
                  <View
                    key={idx}
                    style={{
                      width: size === 'small' ? 40 : size === 'medium' ? 50 : 60,
                      height: size === 'small' ? 40 : size === 'medium' ? 50 : 60,
                      backgroundColor: C['surface/sunken'],
                      borderRadius: R.xs,
                      justifyContent: 'center',
                      alignItems: 'center',
                      borderWidth: 1,
                      borderColor: C['border/subtle'],
                    }}
                  >
                    <Text fontSize={12}>██</Text>
                  </View>
                ))}
              </View>
            </View>
            <XStack justifyContent="space-between" alignItems="center">
              <Text fontSize={11} color={C['text/secondary']}>
                {quantity} stickers on A4 sheet
              </Text>
              <Button variant="secondary" onPress={() => {}}>
                Print PDF
              </Button>
            </XStack>
          </View>

          {/* === Size Selection === */}
          <Text fontSize={14} fontWeight="700" color={C['text/primary']} marginBottom={12}>
            Sticker Size
          </Text>
          <YStack gap={10} marginBottom={24}>
            {SIZES.map((sizeOpt) => (
              <Pressable
                key={sizeOpt.key}
                onPress={() => setSize(sizeOpt.key)}
                style={{
                  backgroundColor: size === sizeOpt.key ? C['brand/soft'] : C['surface/raised'],
                  borderRadius: R.md,
                  padding: 14,
                  borderWidth: 1,
                  borderColor: size === sizeOpt.key ? C['brand/primary'] : C['border/subtle'],
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <View
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    borderWidth: 2,
                    borderColor: size === sizeOpt.key ? C['brand/primary'] : C['border/subtle'],
                    backgroundColor: size === sizeOpt.key ? C['brand/primary'] : 'transparent',
                  }}
                />
                <YStack flex={1} gap={2}>
                  <Text
                    fontSize={13}
                    fontWeight="700"
                    color={size === sizeOpt.key ? C['brand/primary'] : C['text/primary']}
                  >
                    {sizeOpt.label}
                  </Text>
                  <Text fontSize={11} color={C['text/secondary']}>
                    {sizeOpt.desc}
                  </Text>
                </YStack>
              </Pressable>
            ))}
          </YStack>

          {/* === Quantity === */}
          <Text fontSize={14} fontWeight="700" color={C['text/primary']} marginBottom={12}>
            Quantity
          </Text>
          <View
            style={{
              backgroundColor: C['surface/raised'],
              borderRadius: R.md,
              padding: 14,
              borderWidth: 1,
              borderColor: C['border/subtle'],
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 24,
            }}
          >
            <Pressable
              onPress={() => setQuantity(Math.max(1, quantity - 6))}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: C['surface/sunken'],
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Text fontSize={18}>−</Text>
            </Pressable>
            <YStack alignItems="center" gap={2}>
              <Text fontSize={20} fontWeight="800" color={C['text/primary']}>
                {quantity}
              </Text>
              <Text fontSize={10} color={C['text/secondary']}>
                stickers
              </Text>
            </YStack>
            <Pressable
              onPress={() => setQuantity(quantity + 6)}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: C['surface/sunken'],
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Text fontSize={18}>+</Text>
            </Pressable>
          </View>

          {/* === Pricing === */}
          <View
            style={{
              backgroundColor: C['surface/raised'],
              borderRadius: R.lg,
              padding: 16,
              borderWidth: 1,
              borderColor: C['border/subtle'],
              marginBottom: 24,
            }}
          >
            <XStack justifyContent="space-between" marginBottom={10}>
              <Text fontSize={13} color={C['text/secondary']}>
                {quantity} stickers × ${PRICE_PER_STICKER.toFixed(2)}
              </Text>
              <Text fontSize={13} fontWeight="700" color={C['text/primary']}>
                ${totalPrice}
              </Text>
            </XStack>
            <View style={{ height: 1, backgroundColor: C['border/subtle'], marginBottom: 10 }} />
            <XStack justifyContent="space-between" alignItems="center">
              <Text fontSize={13} color={C['text/secondary']}>
                Shipping
              </Text>
              <Text fontSize={13} fontWeight="700" color={C['brand/primary']}>
                FREE
              </Text>
            </XStack>
            <View style={{ height: 1, backgroundColor: C['border/subtle'], marginVertical: 10 }} />
            <XStack justifyContent="space-between" alignItems="center">
              <Text fontSize={14} fontWeight="700" color={C['text/primary']}>
                Total
              </Text>
              <Text fontSize={18} fontWeight="800" color={C['brand/primary']}>
                ${totalPrice}
              </Text>
            </XStack>
          </View>

          {/* === Order Button === */}
          <Button variant="primary" full size="lg" onPress={() => {}}>
            Order Stickers
          </Button>
        </ScrollView>
      </Animated.View>
    </>
  );
}
