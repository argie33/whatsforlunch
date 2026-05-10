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

interface ReceiptItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  selected: boolean;
}

export default function OCRResultScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { photoPath } = useLocalSearchParams<{ photoPath: string }>();
  const [items, setItems] = useState<ReceiptItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!photoPath) {
      setLoading(false);
      return;
    }

    // TODO: Run receipt OCR via API
    // Mock data for now
    setTimeout(() => {
      setItems([
        { id: '1', name: 'Organic Broccoli', quantity: 2, price: 3.99, selected: true },
        { id: '2', name: 'Greek Yogurt 500g', quantity: 1, price: 4.49, selected: true },
        { id: '3', name: 'Almond Butter', quantity: 1, price: 8.99, selected: true },
      ]);
      setLoading(false);
    }, 800);
  }, [photoPath]);

  const toggleItem = (id: string) => {
    setItems(items.map((item) => (item.id === id ? { ...item, selected: !item.selected } : item)));
  };

  const selectedItems = items.filter((item) => item.selected);
  const total = selectedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

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
        <Text marginTop={16} color={C['text/secondary']}>
          Reading receipt...
        </Text>
      </View>
    );
  }

  if (items.length === 0) {
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
              No items found
            </Text>
            <Text fontSize={14} color={C['text/secondary']} textAlign="center">
              We couldn't detect any items on the receipt. Try a clearer photo or add items
              manually.
            </Text>
            <Button variant="primary" full onPress={() => router.push('/items/new' as any)}>
              Add manually
            </Button>
            <Button variant="secondary" full onPress={() => router.back()}>
              Retake photo
            </Button>
          </YStack>
        </ScrollView>
      </Animated.View>
    );
  }

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
              {items.length} Items Found
            </Text>
          </View>
        </BlurView>

        {/* === Content === */}
        <View style={{ paddingHorizontal: 22, paddingVertical: 20, gap: 16 }}>
          {/* Info */}
          <Text fontSize={13} color={C['text/secondary']}>
            Tap items to select which ones to add to your fridge:
          </Text>

          {/* Detected Items */}
          <YStack gap={10}>
            {items.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => toggleItem(item.id)}
                style={{
                  backgroundColor: item.selected ? C['brand/soft'] : C['surface/raised'],
                  borderRadius: 20,
                  padding: 14,
                  borderWidth: 2,
                  borderColor: item.selected ? C['brand/primary'] : C['border/subtle'],
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <View
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    borderWidth: 2,
                    borderColor: item.selected ? C['brand/primary'] : C['border/subtle'],
                    backgroundColor: item.selected ? C['brand/primary'] : 'transparent',
                    justifyContent: 'center',
                    alignItems: 'center',
                    flexShrink: 0,
                  }}
                >
                  {item.selected && (
                    <Text fontSize={12} color="white" fontWeight="800">
                      ✓
                    </Text>
                  )}
                </View>
                <YStack flex={1}>
                  <Text
                    fontSize={15}
                    fontWeight="700"
                    color={C['text/primary']}
                    fontFamily="Fraunces"
                  >
                    {item.name}
                  </Text>
                  <Text fontSize={12} color={C['text/secondary']} marginTop={2}>
                    {item.quantity}x @ ${(item.price / item.quantity).toFixed(2)} ea
                  </Text>
                </YStack>
                <Text fontSize={14} fontWeight="700" color={C['text/primary']}>
                  ${(item.price * item.quantity).toFixed(2)}
                </Text>
              </Pressable>
            ))}
          </YStack>

          {/* Total */}
          {selectedItems.length > 0 && (
            <View
              style={{
                backgroundColor: C['surface/raised'],
                borderRadius: 20,
                padding: 16,
                borderWidth: 1,
                borderColor: C['border/subtle'],
                marginTop: 8,
              }}
            >
              <XStack justifyContent="space-between" marginBottom={8}>
                <Text fontSize={14} color={C['text/secondary']}>
                  {selectedItems.length} item{selectedItems.length !== 1 ? 's' : ''} selected
                </Text>
                <Text fontSize={14} color={C['text/secondary']}>
                  ${total.toFixed(2)}
                </Text>
              </XStack>
            </View>
          )}

          {/* Actions */}
          <YStack gap={10} marginTop={12}>
            <Button
              variant="primary"
              size="lg"
              full
              disabled={selectedItems.length === 0}
              onPress={() => {
                // TODO: Add selected items to inventory
                router.push('/items' as any);
              }}
            >
              Add {selectedItems.length} item{selectedItems.length !== 1 ? 's' : ''} to fridge
            </Button>
            <Button variant="secondary" size="lg" full onPress={() => router.back()}>
              Scan another receipt
            </Button>
          </YStack>
        </View>
      </ScrollView>
    </Animated.View>
  );
}
