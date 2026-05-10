import React, { useState } from 'react';
import { YStack, XStack, Text } from 'tamagui';
import { ScrollView, Pressable } from 'react-native';
import { useListItems } from '@/hooks/useItemsAPI';
import { useHouseholdId } from '@/features/auth/useHouseholdId';
import { TopBar, Button, LoadingState } from '@/components/ui';
import { lightTheme } from '@/theme/tokens';

const C = lightTheme;

interface Container {
  name: string;
  icon: string;
  itemCount: number;
  description: string;
}

export default function ContainersScreen() {
  const householdId = useHouseholdId();
  const { data: items = [], isLoading } = useListItems(householdId);
  const [scrollY, setScrollY] = useState(0);

  // Group items by storage location
  const containerMap = items.reduce(
    (acc, item) => {
      if (!acc[item.storageLocation]) {
        acc[item.storageLocation] = {
          name: item.storageLocation,
          icon: '📦',
          itemCount: 0,
          description: '',
        };
      }
      acc[item.storageLocation].itemCount += 1;
      return acc;
    },
    {} as Record<string, Container>,
  );

  const containers = Object.values(containerMap).sort((a, b) => b.itemCount - a.itemCount);

  // Assign icons based on container type
  const containerIcons: Record<string, string> = {
    fridge: '🧊',
    freezer: '❄️',
    pantry: '🗄️',
    counter: '🍽️',
    cupboard: '🏠',
    cabinet: '🚪',
  };

  const getContainerIcon = (name: string): string => {
    const lower = name.toLowerCase();
    for (const [key, icon] of Object.entries(containerIcons)) {
      if (lower.includes(key)) return icon;
    }
    return '📦';
  };

  if (isLoading) {
    return <LoadingState />;
  }

  return (
    <YStack flex={1} backgroundColor={C['surface/base']}>
      <ScrollView
        scrollEventThrottle={16}
        onScroll={(e) => setScrollY(e.nativeEvent.contentOffset.y)}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        <TopBar title="Containers" subtitle={`${containers.length} locations`} scrollY={scrollY} />

        {containers.length > 0 ? (
          <>
            {/* Container List */}
            <YStack paddingHorizontal={22} paddingTop={20} gap={12}>
              {containers.map((container, idx) => (
                <Pressable
                  key={idx}
                  onPress={() => {}}
                  style={{
                    backgroundColor: C['surface/raised'],
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: C['border/subtle'],
                    paddingHorizontal: 16,
                    paddingVertical: 16,
                    marginBottom: 0,
                  }}
                >
                  <XStack justifyContent="space-between" alignItems="center" gap={12}>
                    <XStack gap={12} alignItems="center" flex={1}>
                      <Text fontSize={32}>{getContainerIcon(container.name)}</Text>
                      <YStack flex={1} gap={2}>
                        <Text
                          fontSize={16}
                          fontWeight="700"
                          color={C['text/primary']}
                          textTransform="capitalize"
                        >
                          {container.name}
                        </Text>
                        <Text fontSize={12} color={C['text/secondary']}>
                          {container.itemCount} item{container.itemCount !== 1 ? 's' : ''}
                        </Text>
                      </YStack>
                    </XStack>
                    <Text fontSize={18} color={C['text/tertiary']}>
                      ›
                    </Text>
                  </XStack>
                </Pressable>
              ))}
            </YStack>

            {/* Stats */}
            <YStack paddingHorizontal={22} paddingTop={28} gap={12}>
              <Text
                fontSize={14}
                fontWeight="700"
                color={C['text/secondary']}
                textTransform="uppercase"
                letterSpacing={1}
              >
                Storage Stats
              </Text>

              <XStack
                backgroundColor={C['surface/raised']}
                borderRadius={16}
                padding={16}
                borderWidth={1}
                borderColor={C['border/subtle']}
                justifyContent="space-around"
              >
                <YStack alignItems="center" gap={4}>
                  <Text
                    fontSize={20}
                    fontWeight="800"
                    color={C['brand/primary']}
                    fontFamily="$serif"
                  >
                    {containers.length}
                  </Text>
                  <Text fontSize={12} color={C['text/secondary']} fontWeight="600">
                    Locations
                  </Text>
                </YStack>

                <YStack alignItems="center" gap={4}>
                  <Text
                    fontSize={20}
                    fontWeight="800"
                    color={C['brand/primary']}
                    fontFamily="$serif"
                  >
                    {items.length}
                  </Text>
                  <Text fontSize={12} color={C['text/secondary']} fontWeight="600">
                    Total Items
                  </Text>
                </YStack>

                <YStack alignItems="center" gap={4}>
                  <Text
                    fontSize={20}
                    fontWeight="800"
                    color={C['brand/primary']}
                    fontFamily="$serif"
                  >
                    {containers.length > 0 ? Math.round(items.length / containers.length) : 0}
                  </Text>
                  <Text fontSize={12} color={C['text/secondary']} fontWeight="600">
                    Per Location
                  </Text>
                </YStack>
              </XStack>
            </YStack>
          </>
        ) : (
          <YStack paddingHorizontal={22} paddingTop={60} alignItems="center" gap={16}>
            <Text fontSize={60}>📦</Text>
            <Text fontSize={18} fontWeight="700" color={C['text/primary']}>
              No containers yet
            </Text>
            <Text fontSize={14} color={C['text/secondary']} textAlign="center">
              Add items with storage locations to see them appear here
            </Text>
          </YStack>
        )}

        {/* Add Container Button */}
        <YStack paddingHorizontal={22} paddingTop={28} paddingBottom={20}>
          <Button variant="secondary" size="lg" full onPress={() => {}}>
            ➕ Add New Container
          </Button>
        </YStack>
      </ScrollView>
    </YStack>
  );
}
