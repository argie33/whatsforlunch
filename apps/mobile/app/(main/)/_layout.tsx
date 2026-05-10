import React, { useState } from 'react';
import { Stack, useRouter } from 'expo-router';
import { YStack } from 'tamagui';
import { TabBar } from '@/components/ui';
import { lightTheme } from '@/theme/tokens';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const C = lightTheme;

const tabs = [
  { name: 'dashboard', icon: '🏠', label: 'Home' },
  { name: 'items', icon: '📦', label: 'Items' },
  { name: 'add-item', icon: '➕', label: 'Add', isFAB: true },
  { name: 'recipes', icon: '👨‍🍳', label: 'Recipes' },
  { name: 'settings', icon: '⚙️', label: 'Settings' },
];

export default function MainLayout() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState('dashboard');

  const handleTabPress = (name: string) => {
    setActiveTab(name);
    router.push(`/(main)/${name === 'add-item' ? 'add-item' : name}`);
  };

  return (
    <YStack flex={1} backgroundColor={C['surface/base']}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: C['surface/base'],
          },
        }}
      />

      {/* Tab Bar - Positioned absolutely at bottom */}
      <YStack position="absolute" bottom={0} left={0} right={0} zIndex={20}>
        <TabBar tabs={tabs} activeTab={activeTab} onTabPress={handleTabPress} />
      </YStack>
    </YStack>
  );
}
