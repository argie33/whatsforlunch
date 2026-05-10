import React, { useState } from 'react';
import { YStack, XStack, Text, View } from 'tamagui';
import { ScrollView } from 'react-native';
import { useListItems } from '@/hooks/useItemsAPI';
import { useHouseholdId } from '@/features/auth/useHouseholdId';
import { TopBar, LoadingState } from '@/components/ui';
import { lightTheme } from '@/theme/tokens';

const C = lightTheme;

export default function AnalyticsScreen() {
  const householdId = useHouseholdId();
  const { data: items = [], isLoading, isError } = useListItems(householdId);
  const [scrollY, setScrollY] = useState(0);

  // Calculate stats from items
  const freshCount = items.filter((i) => i.status === 'fresh').length;
  const soonCount = items.filter((i) => i.status === 'soon').length;
  const urgentCount = items.filter((i) => i.status === 'urgent').length;
  const expiredCount = items.filter((i) => i.status === 'expired').length;
  const totalItems = items.length;

  // Category breakdown
  const categoryCount = items.reduce(
    (acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const topCategories = Object.entries(categoryCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Location breakdown
  const locationCount = items.reduce(
    (acc, item) => {
      acc[item.storageLocation] = (acc[item.storageLocation] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const topLocations = Object.entries(locationCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

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
        <TopBar title="Analytics" subtitle="Insights & trends" scrollY={scrollY} />

        {/* Overview Stats */}
        <YStack paddingHorizontal={22} paddingTop={20} gap={12}>
          <Text
            fontSize={14}
            fontWeight="700"
            color={C['text/secondary']}
            textTransform="uppercase"
            letterSpacing={1}
          >
            Overview
          </Text>

          <XStack gap={10}>
            <YStack
              flex={1}
              backgroundColor={C['surface/raised']}
              borderRadius={16}
              padding={16}
              borderWidth={1}
              borderColor={C['border/subtle']}
              alignItems="center"
            >
              <Text fontSize={24} fontWeight="800" color={C['text/primary']} fontFamily="$serif">
                {totalItems}
              </Text>
              <Text fontSize={12} color={C['text/secondary']} fontWeight="600">
                Total Items
              </Text>
            </YStack>

            <YStack
              flex={1}
              backgroundColor={C['surface/raised']}
              borderRadius={16}
              padding={16}
              borderWidth={1}
              borderColor={C['border/subtle']}
              alignItems="center"
            >
              <Text fontSize={24} fontWeight="800" color={C['status/fresh']} fontFamily="$serif">
                {freshCount}
              </Text>
              <Text fontSize={12} color={C['text/secondary']} fontWeight="600">
                Fresh
              </Text>
            </YStack>
          </XStack>

          <XStack gap={10}>
            <YStack
              flex={1}
              backgroundColor={C['surface/raised']}
              borderRadius={16}
              padding={16}
              borderWidth={1}
              borderColor={C['border/subtle']}
              alignItems="center"
            >
              <Text fontSize={24} fontWeight="800" color={C['status/soon']} fontFamily="$serif">
                {soonCount}
              </Text>
              <Text fontSize={12} color={C['text/secondary']} fontWeight="600">
                Soon
              </Text>
            </YStack>

            <YStack
              flex={1}
              backgroundColor={C['surface/raised']}
              borderRadius={16}
              padding={16}
              borderWidth={1}
              borderColor={C['border/subtle']}
              alignItems="center"
            >
              <Text fontSize={24} fontWeight="800" color={C['status/urgent']} fontFamily="$serif">
                {urgentCount + expiredCount}
              </Text>
              <Text fontSize={12} color={C['text/secondary']} fontWeight="600">
                Action Needed
              </Text>
            </YStack>
          </XStack>
        </YStack>

        {/* Top Categories */}
        <YStack paddingHorizontal={22} paddingTop={28} gap={12}>
          <Text
            fontSize={14}
            fontWeight="700"
            color={C['text/secondary']}
            textTransform="uppercase"
            letterSpacing={1}
          >
            Top Categories
          </Text>

          {topCategories.length > 0 ? (
            topCategories.map(([category, count], idx) => (
              <YStack
                key={idx}
                backgroundColor={C['surface/raised']}
                borderRadius={12}
                padding={12}
                borderWidth={1}
                borderColor={C['border/subtle']}
              >
                <XStack justifyContent="space-between" alignItems="center" marginBottom={8}>
                  <Text
                    fontSize={14}
                    fontWeight="600"
                    color={C['text/primary']}
                    textTransform="capitalize"
                  >
                    {category}
                  </Text>
                  <Text fontSize={14} fontWeight="700" color={C['brand/primary']}>
                    {count}
                  </Text>
                </XStack>
                <View
                  height={4}
                  backgroundColor={C['brand/soft']}
                  borderRadius={2}
                  overflow="hidden"
                >
                  <View
                    height={4}
                    backgroundColor={C['brand/primary']}
                    width={`${(count / Math.max(...topCategories.map((c) => c[1]))) * 100}%`}
                    borderRadius={2}
                  />
                </View>
              </YStack>
            ))
          ) : (
            <Text fontSize={14} color={C['text/secondary']}>
              No category data yet
            </Text>
          )}
        </YStack>

        {/* Top Locations */}
        <YStack paddingHorizontal={22} paddingTop={28} gap={12} paddingBottom={20}>
          <Text
            fontSize={14}
            fontWeight="700"
            color={C['text/secondary']}
            textTransform="uppercase"
            letterSpacing={1}
          >
            Storage Locations
          </Text>

          {topLocations.length > 0 ? (
            topLocations.map(([location, count], idx) => (
              <XStack
                key={idx}
                backgroundColor={C['surface/raised']}
                borderRadius={12}
                padding={12}
                borderWidth={1}
                borderColor={C['border/subtle']}
                justifyContent="space-between"
                alignItems="center"
              >
                <Text
                  fontSize={14}
                  fontWeight="600"
                  color={C['text/primary']}
                  flex={1}
                  numberOfLines={1}
                >
                  {location}
                </Text>
                <Text fontSize={14} fontWeight="700" color={C['brand/primary']}>
                  {count} items
                </Text>
              </XStack>
            ))
          ) : (
            <Text fontSize={14} color={C['text/secondary']}>
              No location data yet
            </Text>
          )}
        </YStack>
      </ScrollView>
    </YStack>
  );
}
