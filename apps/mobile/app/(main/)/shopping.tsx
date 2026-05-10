import React, { useEffect, useState, useMemo } from 'react';
import { ScrollView, View, Pressable, TextInput } from 'react-native';
import { Text, YStack, XStack } from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp, FadeOutDown } from 'react-native-reanimated';
import { lightTheme } from '@/theme/tokens';
import { R } from '@/theme/tokens';
import { useAuthIds } from '@/features/auth';
import { useDatabase } from '@/db';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';

const C = lightTheme;

interface ShoppingItem {
  id: string;
  name: string;
  quantity: number;
  checked: boolean;
  category: string;
}

const MOCK_ITEMS: ShoppingItem[] = [
  { id: '1', name: 'Organic broccoli', quantity: 2, checked: false, category: 'produce' },
  { id: '2', name: 'Greek yogurt 500g', quantity: 1, checked: false, category: 'dairy' },
  { id: '3', name: 'Almond butter', quantity: 1, checked: true, category: 'pantry' },
  { id: '4', name: 'Free-range eggs', quantity: 12, checked: false, category: 'dairy' },
  { id: '5', name: 'Wild salmon fillets', quantity: 2, checked: false, category: 'seafood' },
];

const SMART_SUGGESTIONS = [
  { icon: '🥕', name: 'Carrots', reason: 'Usually bought with broccoli' },
  { icon: '🧅', name: 'Onions', reason: 'Your favorite ingredient' },
  { icon: '🥒', name: 'Olive oil', reason: 'Running low' },
];

const DELIVERY_PARTNERS = [
  { name: 'Instacart', icon: '🛒' },
  { name: 'Amazon Fresh', icon: '📦' },
  { name: 'Walmart+', icon: '🏪' },
  { name: 'DoorDash', icon: '🏃' },
];

export default function ShoppingScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const db = useDatabase();
  const { householdId } = useAuthIds();
  const [items, setItems] = useState<ShoppingItem[]>(MOCK_ITEMS);
  const [filter, setFilter] = useState<'all' | 'pending' | 'bought'>('all');

  // TODO: Wire to ShoppingListService.getList(db, householdId)

  const filteredItems = useMemo(() => {
    if (filter === 'pending') return items.filter((i) => !i.checked);
    if (filter === 'bought') return items.filter((i) => i.checked);
    return items;
  }, [items, filter]);

  const checkedCount = items.filter((i) => i.checked).length;
  const totalCount = items.length;
  const estimatedCost = items.reduce((sum, item) => sum + item.quantity * 2.5, 0);

  const toggleItem = (id: string) => {
    setItems(items.map((item) => (item.id === id ? { ...item, checked: !item.checked } : item)));
  };

  const deleteItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id));
  };

  const addSuggestion = (name: string) => {
    const newItem: ShoppingItem = {
      id: Date.now().toString(),
      name,
      quantity: 1,
      checked: false,
      category: 'misc',
    };
    setItems([...items, newItem]);
  };

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
            paddingBottom: insets.bottom + 20,
          }}
          showsVerticalScrollIndicator={false}
        >
          {/* === Stats Card === */}
          <LinearGradient
            colors={[C['accent/coral'], C['accent/honey']]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              marginHorizontal: 22,
              marginBottom: 24,
              borderRadius: R.lg,
              padding: 20,
              overflow: 'hidden',
            }}
          >
            <View style={{ position: 'absolute', top: -40, right: -40, opacity: 0.1 }}>
              <Text fontSize={120}>○</Text>
            </View>

            <YStack gap={12}>
              <Text
                fontSize={12}
                fontWeight="600"
                color="rgba(255,255,255,0.9)"
                letterSpacing={0.3}
              >
                SHOPPING LIST
              </Text>
              <XStack justifyContent="space-between" alignItems="flex-end">
                <YStack gap={4}>
                  <Text fontSize={32} fontWeight="800" color="white" fontFamily="Fraunces">
                    {checkedCount}/{totalCount}
                  </Text>
                  <Text fontSize={12} color="rgba(255,255,255,0.85)">
                    Items to buy
                  </Text>
                </YStack>
                <YStack alignItems="flex-end" gap={4}>
                  <Text fontSize={20} fontWeight="800" color="white">
                    ${estimatedCost.toFixed(2)}
                  </Text>
                  <Text fontSize={11} color="rgba(255,255,255,0.85)">
                    Estimated cost
                  </Text>
                </YStack>
              </XStack>
            </YStack>
          </LinearGradient>

          {/* === Header === */}
          <View style={{ paddingHorizontal: 22, marginBottom: 16 }}>
            <Text fontSize={12} fontWeight="600" color={C['text/secondary']} letterSpacing={0.3}>
              YOUR LIST
            </Text>
            <Text
              fontSize={28}
              fontWeight="800"
              color={C['text/primary']}
              letterSpacing={-0.8}
              marginTop={2}
              fontFamily="Fraunces"
            >
              To Buy
            </Text>
          </View>

          {/* === Filter Chips === */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 22, gap: 8 }}
            style={{ marginBottom: 20 }}
          >
            {[
              { key: 'all' as const, label: 'All' },
              { key: 'pending' as const, label: 'Pending' },
              { key: 'bought' as const, label: 'Bought' },
            ].map((f) => (
              <Chip
                key={f.key}
                label={f.label}
                active={filter === f.key}
                onPress={() => setFilter(f.key)}
              />
            ))}
          </ScrollView>

          {/* === Shopping Items === */}
          <View style={{ paddingHorizontal: 22, marginBottom: 28 }}>
            {filteredItems.length === 0 ? (
              <View
                style={{
                  backgroundColor: C['surface/raised'],
                  borderRadius: R.lg,
                  padding: 32,
                  borderWidth: 1,
                  borderColor: C['border/subtle'],
                  alignItems: 'center',
                }}
              >
                <Text fontSize={48} marginBottom={12}>
                  ✓
                </Text>
                <Text fontSize={16} fontWeight="700" color={C['text/primary']} marginBottom={4}>
                  All set!
                </Text>
                <Text fontSize={13} color={C['text/secondary']} textAlign="center">
                  You've bought everything on your list
                </Text>
              </View>
            ) : (
              <YStack gap={10}>
                {filteredItems.map((item) => (
                  <Pressable
                    key={item.id}
                    onPress={() => toggleItem(item.id)}
                    style={{
                      backgroundColor: item.checked ? C['surface/sunken'] : C['surface/raised'],
                      borderRadius: R.md,
                      padding: 14,
                      borderWidth: 1,
                      borderColor: item.checked ? C['border/subtle'] : C['border/subtle'],
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                      opacity: item.checked ? 0.6 : 1,
                    }}
                  >
                    <View
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 4,
                        borderWidth: 2,
                        borderColor: item.checked ? C['brand/primary'] : C['border/subtle'],
                        backgroundColor: item.checked ? C['brand/primary'] : 'transparent',
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                    >
                      {item.checked && (
                        <Text fontSize={12} color="white">
                          ✓
                        </Text>
                      )}
                    </View>
                    <YStack flex={1} gap={2}>
                      <Text
                        fontSize={13}
                        fontWeight="700"
                        color={C['text/primary']}
                        style={{ textDecorationLine: item.checked ? 'line-through' : 'none' }}
                      >
                        {item.name}
                      </Text>
                      <Text fontSize={11} color={C['text/secondary']}>
                        Qty: {item.quantity}
                      </Text>
                    </YStack>
                    <Pressable onPress={() => deleteItem(item.id)} style={{ padding: 8 }}>
                      <Text fontSize={14} color={C['text/secondary']}>
                        ✕
                      </Text>
                    </Pressable>
                  </Pressable>
                ))}
              </YStack>
            )}
          </View>

          {/* === Smart Suggestions === */}
          <Text
            fontSize={14}
            fontWeight="700"
            color={C['text/primary']}
            marginBottom={12}
            marginHorizontal={22}
          >
            💡 Smart Suggestions
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 22, gap: 10 }}
            style={{ marginBottom: 28 }}
          >
            {SMART_SUGGESTIONS.map((sugg, idx) => (
              <Pressable
                key={idx}
                onPress={() => addSuggestion(sugg.name)}
                style={{
                  width: 140,
                  backgroundColor: C['surface/raised'],
                  borderRadius: R.md,
                  padding: 12,
                  borderWidth: 1,
                  borderColor: C['border/subtle'],
                }}
              >
                <Text fontSize={28} marginBottom={6}>
                  {sugg.icon}
                </Text>
                <Text fontSize={12} fontWeight="700" color={C['text/primary']} marginBottom={2}>
                  {sugg.name}
                </Text>
                <Text fontSize={10} color={C['text/secondary']} numberOfLines={2}>
                  {sugg.reason}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* === Delivery Partners === */}
          <Text
            fontSize={14}
            fontWeight="700"
            color={C['text/primary']}
            marginBottom={12}
            marginHorizontal={22}
          >
            📦 Delivery Partners
          </Text>
          <View
            style={{
              paddingHorizontal: 22,
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 10,
              marginBottom: 28,
            }}
          >
            {DELIVERY_PARTNERS.map((partner, idx) => (
              <Pressable
                key={idx}
                style={{
                  flex: 1,
                  minWidth: '45%',
                  backgroundColor: C['surface/raised'],
                  borderRadius: R.md,
                  padding: 14,
                  borderWidth: 1,
                  borderColor: C['border/subtle'],
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <Text fontSize={24}>{partner.icon}</Text>
                <Text fontSize={12} fontWeight="700" color={C['text/primary']} textAlign="center">
                  {partner.name}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* === Add Item === */}
          <View style={{ paddingHorizontal: 22 }}>
            <Button
              variant="primary"
              full
              size="lg"
              onPress={() => router.push('/items/new' as any)}
            >
              + Add Item
            </Button>
          </View>
        </ScrollView>
      </Animated.View>
    </>
  );
}
