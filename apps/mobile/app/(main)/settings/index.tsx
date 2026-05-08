import React, { useCallback } from 'react';
import { Alert, ScrollView, View, Pressable } from 'react-native';
import { Text, YStack, XStack } from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { useCurrentUser } from '@/features/auth/useCurrentUser';
import { signOut } from '@/features/auth/authService';
import { useUserPreferences } from '@/features/settings/useUserPreferences';
import { useSubscription } from '@/hooks/useSubscription';
import { lightTheme } from '@/theme/tokens';

const C = lightTheme;

interface SettingRow {
  icon: string;
  iconBg: string;
  title: string;
  subtitle?: string;
  onPress: () => void;
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useCurrentUser();
  const { prefs } = useUserPreferences();
  const { isPremium } = useSubscription();

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((w) => w[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'U';

  const handleSignOut = useCallback(() => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut();
            router.replace('/(auth)/sign-in');
          } catch (err) {
            Alert.alert('Error', String(err));
          }
        },
      },
    ]);
  }, []);

  const featuresRows: SettingRow[] = [
    {
      icon: '🛒',
      iconBg: C['accent/honeySoft'],
      title: 'Shopping list',
      subtitle: 'Plan your trips',
      onPress: () => router.push('/shopping'),
    },
    {
      icon: '🍱',
      iconBg: C['accent/coralSoft'],
      title: 'Containers',
      subtitle: 'Lunchboxes, meal preps',
      onPress: () => router.push('/containers'),
    },
    {
      icon: '🗓️',
      iconBg: C['accent/skySoft'],
      title: 'Meal plan',
      subtitle: 'Weekly planning',
      onPress: () => router.push('/meal-plan'),
    },
    {
      icon: '🍽️',
      iconBg: C['accent/honeySoft'],
      title: 'Restaurants',
      subtitle: 'Eat out recommendations',
      onPress: () => router.push('/restaurants'),
    },
    {
      icon: '📊',
      iconBg: C['accent/skySoft'],
      title: 'Insights',
      subtitle: 'Track your savings',
      onPress: () => router.push('/analytics'),
    },
    {
      icon: '🥗',
      iconBg: C['brand/soft'],
      title: 'Nutrition',
      subtitle: 'Daily intake tracking',
      onPress: () => router.push('/nutrition'),
    },
    {
      icon: '🏆',
      iconBg: C['accent/plumSoft'],
      title: 'Achievements',
      subtitle: '12 of 30 unlocked',
      onPress: () => router.push('/achievements'),
    },
    {
      icon: '📰',
      iconBg: C['accent/coralSoft'],
      title: 'Activity',
      subtitle: 'Household feed',
      onPress: () => router.push('/activity'),
    },
  ];

  const accountRows: SettingRow[] = [
    {
      icon: '👤',
      iconBg: C['brand/soft'],
      title: 'Edit profile',
      subtitle: 'Photo, name, dietary preferences',
      onPress: () => router.push('/settings/profile'),
    },
    {
      icon: '🏠',
      iconBg: C['accent/honeySoft'],
      title: 'Households',
      subtitle: 'Family & shared fridges',
      onPress: () => router.push('/settings/households'),
    },
    {
      icon: '🔔',
      iconBg: C['accent/coralSoft'],
      title: 'Notifications',
      subtitle: prefs.notificationsEnabled ? 'On' : 'Off',
      onPress: () => router.push('/settings/notifications'),
    },
    {
      icon: '🎨',
      iconBg: C['accent/plumSoft'],
      title: 'Preferences',
      subtitle: 'Theme, units, language',
      onPress: () => router.push('/settings/preferences'),
    },
    {
      icon: '🔒',
      iconBg: C['accent/skySoft'],
      title: 'Privacy & data',
      subtitle: 'Control your info',
      onPress: () => router.push('/settings/privacy'),
    },
  ];

  const helpRows: SettingRow[] = [
    {
      icon: '💬',
      iconBg: C['brand/soft'],
      title: 'Help & support',
      onPress: () => router.push('/settings/support'),
    },
    {
      icon: 'ℹ️',
      iconBg: C['accent/skySoft'],
      title: 'About',
      onPress: () => router.push('/settings/about'),
    },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: C['surface/base'] }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 8,
          paddingBottom: insets.bottom + 32,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* === Header === */}
        <View style={{ paddingHorizontal: 22, paddingVertical: 14 }}>
          <Text fontSize={28} fontWeight="800" color={C['text/primary']} letterSpacing={-0.8}>
            Settings
          </Text>
        </View>

        {/* === Profile Header === */}
        <View
          style={{
            alignItems: 'center',
            paddingHorizontal: 22,
            paddingVertical: 24,
          }}
        >
          <View
            style={{
              width: 88,
              height: 88,
              borderRadius: 44,
              backgroundColor: C['brand/primary'],
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 12,
              shadowColor: C['brand/primary'],
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.25,
              shadowRadius: 16,
              elevation: 6,
            }}
          >
            <Text fontSize={32} fontWeight="800" color="white">
              {initials}
            </Text>
          </View>
          <Text fontSize={22} fontWeight="800" color={C['text/primary']} letterSpacing={-0.4}>
            {user?.name || 'User'}
          </Text>
          <Text fontSize={13} color={C['text/secondary']} marginTop={2}>
            {user?.email || ''}
          </Text>

          {/* Profile Stats */}
          <XStack
            gap={32}
            marginTop={20}
            paddingVertical={16}
            paddingHorizontal={24}
            backgroundColor={C['surface/raised']}
            borderRadius={22}
            borderWidth={1}
            borderColor={C['border/subtle']}
          >
            {[
              { value: '12', label: 'Items' },
              { value: '7', label: 'Day streak' },
              { value: '$127', label: 'Saved' },
            ].map((stat, idx) => (
              <YStack key={idx} alignItems="center">
                <Text fontSize={20} fontWeight="800" color={C['text/primary']} letterSpacing={-0.5}>
                  {stat.value}
                </Text>
                <Text fontSize={11} color={C['text/secondary']} fontWeight="600" marginTop={2}>
                  {stat.label}
                </Text>
              </YStack>
            ))}
          </XStack>
        </View>

        {/* === Subscription Card === */}
        {!isPremium && (
          <View style={{ paddingHorizontal: 22, marginBottom: 16 }}>
            <Pressable
              onPress={() => router.push('/settings/subscription')}
              style={{
                backgroundColor: C['accent/berry'],
                borderRadius: 22,
                padding: 22,
                shadowColor: C['accent/berry'],
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.25,
                shadowRadius: 16,
                elevation: 6,
              }}
            >
              <Text
                fontSize={11}
                fontWeight="800"
                color="rgba(255,255,255,0.9)"
                letterSpacing={1.5}
              >
                ⭐ PREMIUM
              </Text>
              <Text fontSize={22} fontWeight="800" color="white" marginTop={6} letterSpacing={-0.4}>
                Unlock everything
              </Text>
              <YStack gap={4} marginTop={12} marginBottom={16}>
                {[
                  'Unlimited AI scans',
                  'Family sharing (6 members)',
                  'Advanced analytics & exports',
                  'Custom expiry rules',
                ].map((feature, idx) => (
                  <Text key={idx} fontSize={13} color="rgba(255,255,255,0.95)">
                    ✓ {feature}
                  </Text>
                ))}
              </YStack>
              <XStack justifyContent="space-between" alignItems="center">
                <YStack>
                  <Text fontSize={20} fontWeight="800" color="white">
                    $4.99
                  </Text>
                  <Text fontSize={11} color="rgba(255,255,255,0.85)">
                    per month
                  </Text>
                </YStack>
                <View
                  style={{
                    backgroundColor: 'white',
                    paddingHorizontal: 22,
                    paddingVertical: 14,
                    borderRadius: 16,
                  }}
                >
                  <Text fontSize={15} fontWeight="800" color={C['accent/berry']}>
                    Try free →
                  </Text>
                </View>
              </XStack>
            </Pressable>
          </View>
        )}

        {/* === Features Section === */}
        <SectionHeader title="FEATURES" />
        <SettingsCard rows={featuresRows} />

        {/* === Account Section === */}
        <SectionHeader title="ACCOUNT" />
        <SettingsCard rows={accountRows} />

        {/* === Help Section === */}
        <SectionHeader title="HELP" />
        <SettingsCard rows={helpRows} />

        {/* === Sign Out === */}
        <View style={{ paddingHorizontal: 22, marginTop: 24 }}>
          <Pressable
            onPress={handleSignOut}
            style={{
              backgroundColor: C['surface/raised'],
              borderRadius: 16,
              padding: 16,
              alignItems: 'center',
              borderWidth: 1,
              borderColor: C['border/subtle'],
            }}
          >
            <Text fontSize={15} fontWeight="700" color={C['status/urgent']}>
              Sign out
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <Text
      fontSize={11}
      fontWeight="800"
      color={C['text/secondary']}
      letterSpacing={1.5}
      paddingHorizontal={22}
      paddingTop={20}
      paddingBottom={8}
    >
      {title}
    </Text>
  );
}

function SettingsCard({ rows }: { rows: SettingRow[] }) {
  return (
    <View style={{ paddingHorizontal: 22 }}>
      <View
        style={{
          backgroundColor: C['surface/raised'],
          borderRadius: 22,
          borderWidth: 1,
          borderColor: C['border/subtle'],
          overflow: 'hidden',
        }}
      >
        {rows.map((row, idx) => (
          <Pressable
            key={idx}
            onPress={row.onPress}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              padding: 14,
              gap: 14,
              borderBottomWidth: idx < rows.length - 1 ? 1 : 0,
              borderBottomColor: C['border/subtle'],
            }}
          >
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                backgroundColor: row.iconBg,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Text fontSize={20}>{row.icon}</Text>
            </View>
            <YStack flex={1}>
              <Text fontSize={15} fontWeight="700" color={C['text/primary']} letterSpacing={-0.1}>
                {row.title}
              </Text>
              {row.subtitle && (
                <Text fontSize={12} color={C['text/secondary']} marginTop={2}>
                  {row.subtitle}
                </Text>
              )}
            </YStack>
            <Text fontSize={20} color={C['text/tertiary']}>
              ›
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
