import React, { useEffect, useState } from 'react';
import { ScrollView, View, Pressable } from 'react-native';
import { Text, YStack, XStack } from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { FadeInUp, FadeOutDown } from 'react-native-reanimated';
import { lightTheme } from '@/theme/tokens';
import { R } from '@/theme/tokens';
import { useAuthIds } from '@/features/auth';
import { useDatabase } from '@/db';
import { Button } from '@/components/ui/Button';

const C = lightTheme;

interface Container {
  id: string;
  name: string;
  type: string;
  emoji: string;
  itemCount: number;
  color: string;
}

const MOCK_CONTAINERS: Container[] = [
  {
    id: '1',
    name: 'Main Fridge',
    type: 'Refrigerator',
    emoji: '❄️',
    itemCount: 12,
    color: C['accent/sky'],
  },
  { id: '2', name: 'Freezer', type: 'Freezer', emoji: '🧊', itemCount: 8, color: C['accent/sky'] },
  { id: '3', name: 'Pantry', type: 'Pantry', emoji: '🥫', itemCount: 24, color: C['accent/honey'] },
  {
    id: '4',
    name: 'Counter',
    type: 'Counter',
    emoji: '🍞',
    itemCount: 5,
    color: C['accent/coral'],
  },
];

export default function ContainersScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const db = useDatabase();
  const { householdId } = useAuthIds();
  const [containers, setContainers] = useState<Container[]>(MOCK_CONTAINERS);

  // TODO: Wire to ContainersService.getContainers(db, householdId)

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
              ORGANIZE
            </Text>
            <Text
              fontSize={28}
              fontWeight="800"
              color={C['text/primary']}
              letterSpacing={-0.8}
              marginTop={2}
              fontFamily="Fraunces"
            >
              Containers
            </Text>
          </YStack>

          {/* === Containers Grid === */}
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 12,
              marginBottom: 28,
            }}
          >
            {containers.map((container) => (
              <Pressable
                key={container.id}
                onPress={() => router.push(`/containers/${container.id}` as any)}
                style={{
                  width: '48%',
                  backgroundColor: C['surface/raised'],
                  borderRadius: R.lg,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: C['border/subtle'],
                  alignItems: 'center',
                }}
              >
                <Text fontSize={40} marginBottom={8}>
                  {container.emoji}
                </Text>
                <Text
                  fontSize={13}
                  fontWeight="700"
                  color={C['text/primary']}
                  textAlign="center"
                  marginBottom={2}
                >
                  {container.name}
                </Text>
                <Text fontSize={11} color={C['text/secondary']} marginBottom={8}>
                  {container.itemCount} items
                </Text>
                <View
                  style={{
                    backgroundColor: C['surface/sunken'],
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: R.xs,
                  }}
                >
                  <Text fontSize={9} fontWeight="700" color={C['text/secondary']}>
                    {container.type}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>

          {/* === QR Sticker CTA === */}
          <Pressable
            onPress={() => router.push('/stickers' as any)}
            style={{
              backgroundColor: C['surface/raised'],
              borderRadius: R.lg,
              padding: 24,
              borderWidth: 2,
              borderStyle: 'dashed',
              borderColor: C['border/subtle'],
              alignItems: 'center',
              marginBottom: 24,
            }}
          >
            <Text fontSize={40} marginBottom={12}>
              📤
            </Text>
            <Text fontSize={14} fontWeight="700" color={C['text/primary']} marginBottom={4}>
              Order QR Stickers
            </Text>
            <Text fontSize={12} color={C['text/secondary']} textAlign="center" marginBottom={12}>
              Label containers with smart QR codes. Track items with a scan.
            </Text>
            <View
              style={{
                backgroundColor: C['brand/soft'],
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: R.md,
              }}
            >
              <Text fontSize={11} fontWeight="700" color={C['brand/primary']}>
                Shop Stickers
              </Text>
            </View>
          </Pressable>

          {/* === Add Container === */}
          <Button
            variant="primary"
            full
            size="lg"
            onPress={() => {
              // TODO: Open add container modal
            }}
          >
            + Add Container
          </Button>
        </ScrollView>
      </Animated.View>
    </>
  );
}
