import React, { useState } from 'react';
import { YStack, XStack, Text, View } from 'tamagui';
import { ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { TopBar, Button } from '@/components/ui';
import { lightTheme } from '@/theme/tokens';

const C = lightTheme;

interface SettingRow {
  icon: string;
  label: string;
  value?: string;
  onPress: () => void;
}

export default function SettingsScreen() {
  const router = useRouter();
  const [scrollY, setScrollY] = useState(0);

  const settings: SettingRow[] = [
    {
      icon: '👤',
      label: 'Profile',
      value: 'user@example.com',
      onPress: () => {},
    },
    {
      icon: '🔔',
      label: 'Notifications',
      value: 'Enabled',
      onPress: () => {},
    },
    {
      icon: '🎨',
      label: 'Theme',
      value: 'Light',
      onPress: () => {},
    },
    {
      icon: '🌍',
      label: 'Language',
      value: 'English',
      onPress: () => {},
    },
  ];

  const legalLinks = [
    { label: 'Privacy Policy', onPress: () => {} },
    { label: 'Terms of Service', onPress: () => {} },
    { label: 'Data Export', onPress: () => {} },
  ];

  return (
    <YStack flex={1} backgroundColor={C['surface/base']}>
      <ScrollView
        scrollEventThrottle={16}
        onScroll={(e) => setScrollY(e.nativeEvent.contentOffset.y)}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        <TopBar title="Settings" subtitle="Manage preferences" scrollY={scrollY} />

        {/* Profile Section */}
        <YStack paddingHorizontal={22} paddingTop={24} gap={8}>
          <Text
            fontSize={12}
            fontWeight="700"
            color={C['text/secondary']}
            textTransform="uppercase"
            letterSpacing={1}
          >
            Account
          </Text>

          {settings.map((setting, idx) => (
            <Pressable
              key={idx}
              onPress={setting.onPress}
              style={{
                backgroundColor: C['surface/raised'],
                borderRadius: 16,
                padding: 16,
                borderWidth: 1,
                borderColor: C['border/subtle'],
                marginBottom: 8,
              }}
            >
              <XStack justifyContent="space-between" alignItems="center">
                <XStack gap={12} alignItems="center" flex={1}>
                  <Text fontSize={24}>{setting.icon}</Text>
                  <YStack flex={1}>
                    <Text fontSize={16} fontWeight="600" color={C['text/primary']}>
                      {setting.label}
                    </Text>
                    {setting.value && (
                      <Text fontSize={12} color={C['text/secondary']}>
                        {setting.value}
                      </Text>
                    )}
                  </YStack>
                </XStack>
                <Text fontSize={18}>›</Text>
              </XStack>
            </Pressable>
          ))}
        </YStack>

        {/* Legal Section */}
        <YStack paddingHorizontal={22} paddingTop={32} gap={8}>
          <Text
            fontSize={12}
            fontWeight="700"
            color={C['text/secondary']}
            textTransform="uppercase"
            letterSpacing={1}
          >
            Legal
          </Text>

          {legalLinks.map((link, idx) => (
            <Pressable
              key={idx}
              onPress={link.onPress}
              style={{
                backgroundColor: C['surface/raised'],
                borderRadius: 16,
                padding: 16,
                borderWidth: 1,
                borderColor: C['border/subtle'],
                marginBottom: 8,
              }}
            >
              <XStack justifyContent="space-between" alignItems="center">
                <Text fontSize={16} fontWeight="600" color={C['text/primary']}>
                  {link.label}
                </Text>
                <Text fontSize={18}>›</Text>
              </XStack>
            </Pressable>
          ))}
        </YStack>

        {/* Logout */}
        <YStack paddingHorizontal={22} paddingTop={32} paddingBottom={20}>
          <Button variant="coral" size="lg" full onPress={() => router.replace('/(auth)/auth')}>
            🚪 Logout
          </Button>
        </YStack>

        {/* Version */}
        <Text fontSize={12} color={C['text/tertiary']} textAlign="center" paddingVertical={16}>
          WhatsFresh v1.0.0
        </Text>
      </ScrollView>
    </YStack>
  );
}
