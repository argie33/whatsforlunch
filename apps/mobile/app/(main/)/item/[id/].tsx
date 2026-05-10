import React, { useState } from 'react';
import { YStack, XStack, Text, View } from 'tamagui';
import { ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { TopBar, Button } from '@/components/ui';
import { lightTheme } from '@/theme/tokens';

const C = lightTheme;

// Mock item data
const mockItem = {
  id: 1,
  emoji: '🥬',
  name: 'Lettuce',
  status: 'fresh' as const,
  container: 'Fridge - Vegetable Drawer',
  addedDate: '2024-05-09',
  expiryDate: '2024-05-10',
  daysLeft: 1,
  notes: 'Romaine lettuce from market',
};

const statusColors = {
  fresh: { bg: C['status/freshBg'], text: C['status/fresh'] },
  soon: { bg: C['status/soonBg'], text: C['status/soon'] },
  urgent: { bg: C['status/urgentBg'], text: C['status/urgent'] },
  expired: { bg: C['status/expiredBg'], text: C['status/expired'] },
};

export default function ItemDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [isDeleting, setIsDeleting] = useState(false);
  const item = mockItem; // In real app, fetch by id

  const colors = statusColors[item.status];

  const handleEdit = () => {
    router.push(`/(main)/item/${item.id}/edit`);
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    setTimeout(() => {
      setIsDeleting(false);
      router.back();
    }, 800);
  };

  return (
    <YStack flex={1} backgroundColor={C['surface/base']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Top Bar */}
        <TopBar
          title="Item Details"
          actions={[
            {
              icon: '✏️',
              onPress: handleEdit,
              accessibilityLabel: 'Edit item',
            },
          ]}
        />

        {/* Large Item Display */}
        <YStack alignItems="center" paddingVertical={40} gap={20}>
          <Text fontSize={120}>{item.emoji}</Text>

          <YStack alignItems="center" gap={12}>
            <Text
              fontSize={34}
              fontWeight="800"
              letterSpacing={-1.2}
              color={C['text/primary']}
              fontFamily="$serif"
            >
              {item.name}
            </Text>

            <View
              paddingHorizontal={16}
              paddingVertical={8}
              backgroundColor={colors.bg}
              borderRadius={20}
            >
              <Text
                fontSize={13}
                fontWeight="700"
                color={colors.text}
                textTransform="uppercase"
                letterSpacing={0.4}
              >
                {item.status === 'urgent'
                  ? 'EAT TODAY'
                  : item.status === 'soon'
                    ? 'USE SOON'
                    : item.status === 'expired'
                      ? 'EXPIRED'
                      : 'FRESH'}
              </Text>
            </View>
          </YStack>
        </YStack>

        {/* Details Grid */}
        <YStack paddingHorizontal={22} gap={16}>
          {/* Container */}
          <YStack
            backgroundColor={C['surface/raised']}
            borderRadius={22}
            padding={16}
            borderWidth={1}
            borderColor={C['border/subtle']}
          >
            <Text fontSize={12} fontWeight="600" color={C['text/secondary']} marginBottom={4}>
              STORAGE LOCATION
            </Text>
            <Text fontSize={16} fontWeight="600" color={C['text/primary']}>
              {item.container}
            </Text>
          </YStack>

          {/* Dates */}
          <XStack gap={12}>
            <YStack
              flex={1}
              backgroundColor={C['surface/raised']}
              borderRadius={22}
              padding={16}
              borderWidth={1}
              borderColor={C['border/subtle']}
            >
              <Text fontSize={11} fontWeight="600" color={C['text/secondary']} marginBottom={4}>
                ADDED
              </Text>
              <Text fontSize={14} fontWeight="600" color={C['text/primary']}>
                {new Date(item.addedDate).toLocaleDateString()}
              </Text>
            </YStack>

            <YStack
              flex={1}
              backgroundColor={C['surface/raised']}
              borderRadius={22}
              padding={16}
              borderWidth={1}
              borderColor={C['border/subtle']}
            >
              <Text fontSize={11} fontWeight="600" color={C['text/secondary']} marginBottom={4}>
                EXPIRES
              </Text>
              <Text fontSize={14} fontWeight="600" color={colors.text}>
                {new Date(item.expiryDate).toLocaleDateString()}
              </Text>
            </YStack>
          </XStack>

          {/* Days Left */}
          <View backgroundColor={colors.bg} borderRadius={22} padding={16} alignItems="center">
            <Text fontSize={12} fontWeight="600" color={C['text/secondary']} marginBottom={4}>
              TIME LEFT
            </Text>
            <Text fontSize={24} fontWeight="800" color={colors.text} fontFamily="$serif">
              {item.daysLeft} day{item.daysLeft !== 1 ? 's' : ''} left
            </Text>
          </View>

          {/* Notes */}
          {item.notes && (
            <YStack
              backgroundColor={C['surface/raised']}
              borderRadius={22}
              padding={16}
              borderWidth={1}
              borderColor={C['border/subtle']}
            >
              <Text fontSize={12} fontWeight="600" color={C['text/secondary']} marginBottom={8}>
                NOTES
              </Text>
              <Text fontSize={14} lineHeight={20} color={C['text/primary']}>
                {item.notes}
              </Text>
            </YStack>
          )}

          {/* Actions */}
          <YStack gap={12} paddingTop={12}>
            <Button variant="secondary" size="lg" full onPress={() => {}}>
              📦 Move to another container
            </Button>

            <Button variant="coral" size="lg" full onPress={handleDelete} loading={isDeleting}>
              🗑️ Delete item
            </Button>
          </YStack>
        </YStack>
      </ScrollView>
    </YStack>
  );
}
