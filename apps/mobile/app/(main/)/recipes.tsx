import React, { useState } from 'react';
import { YStack, Text } from 'tamagui';
import { ScrollView } from 'react-native';
import { TopBar, Input } from '@/components/ui';
import { lightTheme } from '@/theme/tokens';

const C = lightTheme;

export default function RecipesScreen() {
  const [searchText, setSearchText] = useState('');
  const [scrollY, setScrollY] = useState(0);

  return (
    <YStack flex={1} backgroundColor={C['surface/base']}>
      <ScrollView
        scrollEventThrottle={16}
        onScroll={(e) => setScrollY(e.nativeEvent.contentOffset.y)}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        <TopBar title="Recipes" subtitle="Cook smart" scrollY={scrollY} />

        <YStack paddingHorizontal={22} paddingTop={16} paddingBottom={12}>
          <Input
            placeholder="Search recipes..."
            value={searchText}
            onChangeText={setSearchText}
            placeholderTextColor={C['text/tertiary']}
          />
        </YStack>

        <YStack paddingHorizontal={22} paddingTop={40} alignItems="center" gap={16}>
          <Text fontSize={60}>👨‍🍳</Text>
          <Text fontSize={18} fontWeight="700" color={C['text/primary']} textAlign="center">
            Recipe Suggestions Coming Soon
          </Text>
          <Text fontSize={14} color={C['text/secondary']} textAlign="center">
            Based on what you have in your kitchen
          </Text>
        </YStack>
      </ScrollView>
    </YStack>
  );
}
