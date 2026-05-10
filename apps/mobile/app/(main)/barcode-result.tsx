import React, { useEffect, useState } from 'react';
import { View, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { Text, YStack, XStack } from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { BlurView } from 'expo-blur';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { lightTheme } from '@/theme/tokens';
import { R } from '@/theme/tokens';
import { Button } from '@/components/ui/Button';

const C = lightTheme;

interface BarcodeProduct {
  barcode: string;
  productName: string;
  brand?: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  category?: string;
  expiryDays?: number;
}

export default function BarcodeResultScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { barcode } = useLocalSearchParams<{ barcode: string }>();
  const [product, setProduct] = useState<BarcodeProduct | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!barcode) {
      setLoading(false);
      return;
    }

    // TODO: Fetch from Open Food Facts API
    // For now, mock data
    setTimeout(() => {
      setProduct({
        barcode,
        productName: 'Organic Broccoli',
        brand: 'Local Farm',
        calories: 34,
        protein: 3.7,
        carbs: 7,
        fat: 0.4,
        category: 'vegetable',
        expiryDays: 7,
      });
      setLoading(false);
    }, 500);
  }, [barcode]);

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: C['surface/base'],
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <ActivityIndicator size="large" color={C['brand/primary']} />
      </View>
    );
  }

  if (!product) {
    return (
      <Animated.View
        style={{ flex: 1, backgroundColor: C['surface/base'] }}
        entering={FadeInUp.duration(300)}
      >
        <ScrollView
          contentContainerStyle={{ padding: 22, justifyContent: 'center', minHeight: '100%' }}
        >
          <YStack alignItems="center" gap={20}>
            <Text fontSize={24} fontWeight="700" color={C['text/primary']}>
              Product not found
            </Text>
            <Text fontSize={14} color={C['text/secondary']} textAlign="center">
              We couldn't find this product. You can add it manually instead.
            </Text>
            <Button variant="primary" full onPress={() => router.push('/items/new' as any)}>
              Add manually
            </Button>
            <Button variant="secondary" full onPress={() => router.back()}>
              Scan again
            </Button>
          </YStack>
        </ScrollView>
      </Animated.View>
    );
  }

  const expiryDate = product.expiryDays
    ? new Date(Date.now() + product.expiryDays * 24 * 60 * 60 * 1000).toLocaleDateString()
    : 'Unknown';

  return (
    <Animated.View
      style={{ flex: 1, backgroundColor: C['surface/base'] }}
      entering={FadeInUp.duration(300)}
    >
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
              Product Found
            </Text>
          </View>
        </BlurView>

        {/* === Content === */}
        <View style={{ paddingHorizontal: 22, paddingVertical: 20, gap: 16 }}>
          {/* Product Hero Card — Horizontal Layout */}
          <View
            style={{
              backgroundColor: C['surface/raised'],
              borderRadius: 20,
              padding: 14,
              borderWidth: 1,
              borderColor: C['border/subtle'],
              flexDirection: 'row',
              gap: 14,
              alignItems: 'flex-start',
            }}
          >
            {/* Emoji Thumbnail */}
            <View
              style={{
                width: 80,
                height: 80,
                borderRadius: 16,
                backgroundColor: C['surface/sunken'],
                justifyContent: 'center',
                alignItems: 'center',
                flexShrink: 0,
              }}
            >
              <Text fontSize={48}>
                {product.category === 'vegetable'
                  ? '🥬'
                  : product.category === 'dairy'
                    ? '🥛'
                    : '🍴'}
              </Text>
            </View>

            {/* Product Info Stack */}
            <YStack flex={1} gap={4}>
              <Text
                fontSize={11}
                fontWeight="800"
                color={C['brand/primary']}
                textTransform="uppercase"
                letterSpacing={0.5}
              >
                Found in Open Food Facts
              </Text>
              <Text
                fontSize={22}
                fontWeight="700"
                color={C['text/primary']}
                fontFamily="Fraunces"
                letterSpacing={-0.5}
              >
                {product.productName}
              </Text>
              {product.brand && (
                <Text fontSize={14} color={C['text/secondary']}>
                  {product.brand}
                </Text>
              )}
              <Text fontSize={12} color={C['text/tertiary']} marginTop={4} fontFamily="monospace">
                UPC: {product.barcode}
              </Text>
            </YStack>
          </View>

          {/* Nutrition (if available) */}
          {(product.calories || product.protein || product.carbs || product.fat) && (
            <>
              <Text fontSize={14} fontWeight="700" color={C['text/primary']} marginTop={8}>
                Nutrition per 100g
              </Text>
              <YStack gap={8}>
                {[
                  { label: 'Calories', value: product.calories, unit: 'kcal' },
                  { label: 'Protein', value: product.protein, unit: 'g' },
                  { label: 'Carbs', value: product.carbs, unit: 'g' },
                  { label: 'Fat', value: product.fat, unit: 'g' },
                ].map(
                  (item) =>
                    item.value !== undefined && (
                      <XStack
                        key={item.label}
                        justifyContent="space-between"
                        paddingHorizontal={12}
                        paddingVertical={10}
                        backgroundColor={C['surface/raised']}
                        borderRadius={R.md}
                        borderWidth={1}
                        borderColor={C['border/subtle']}
                      >
                        <Text fontSize={13} color={C['text/secondary']}>
                          {item.label}
                        </Text>
                        <Text fontSize={13} fontWeight="700" color={C['text/primary']}>
                          {item.value} {item.unit}
                        </Text>
                      </XStack>
                    ),
                )}
              </YStack>
            </>
          )}

          {/* Barcode Display */}
          <View
            style={{
              backgroundColor: C['surface/raised'],
              borderRadius: 12,
              padding: 16,
              alignItems: 'center',
              borderWidth: 1,
              borderColor: C['border/subtle'],
              marginTop: 8,
            }}
          >
            <Text fontSize={28} marginBottom={8} letterSpacing={4}>
              ▮▯▮▮▯▮▮▯▮
            </Text>
            <Text fontSize={12} color={C['text/secondary']} letterSpacing={1}>
              {product.barcode}
            </Text>
          </View>

          {/* Actions */}
          <YStack gap={10} marginTop={16}>
            <Button
              variant="primary"
              size="lg"
              full
              onPress={() =>
                router.push({
                  pathname: '/items/new',
                  params: {
                    barcode: product.barcode,
                    foodName: product.productName,
                    category: product.category,
                  },
                } as any)
              }
            >
              Add to fridge
            </Button>
            <Button variant="ghost" size="lg" full onPress={() => router.back()}>
              Wrong product?
            </Button>
          </YStack>
        </View>
      </ScrollView>
    </Animated.View>
  );
}
