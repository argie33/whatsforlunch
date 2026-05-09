import React, { useState, useEffect, useMemo } from 'react';
import { ScrollView, View, Pressable, Platform } from 'react-native';
import { Text, YStack, XStack } from 'tamagui';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp, FadeOutDown } from 'react-native-reanimated';

import { useAuthIds, useCurrentUser } from '@/features/auth';
import { useDatabase } from '@/db';
import type { Item } from '@/db/models/Item';
import { ItemRepository } from '@/db/repositories/ItemRepository';
import { lightTheme } from '@/theme/tokens';
import { R } from '@/theme/tokens';
import { FAB } from '@/components/ui/FAB';
import { ItemCard } from '@/components/ui/ItemCard';
import { useSubscription } from '@/hooks/useSubscription';
import { statsService } from '@/services/StatsService';

const C = lightTheme;

interface ItemStats {
  fresh: number;
  soon: number;
  urgent: number;
}

const MS_1D = 24 * 60 * 60 * 1000;
const MS_3D = 3 * MS_1D;
const MS_7D = 7 * MS_1D;

type ItemStatus = 'fresh' | 'soon' | 'urgent' | 'expired';

const getItemStatus = (expiryAt?: number): ItemStatus => {
  if (!expiryAt) return 'fresh';
  const daysLeft = (expiryAt - Date.now()) / (1000 * 60 * 60 * 24);
  if (daysLeft <= 0) return 'expired';
  if (daysLeft <= 3) return 'urgent';
  if (daysLeft <= 7) return 'soon';
  return 'fresh';
};

const getDaysLeft = (expiryAt?: number): number | null => {
  if (!expiryAt) return null;
  return Math.floor((expiryAt - Date.now()) / (1000 * 60 * 60 * 24));
};

const getEmoji = (category?: string): string => {
  const emojiMap: Record<string, string> = {
    vegetable: '🥬',
    fruit: '🍎',
    dairy: '🥛',
    meat: '🥩',
    seafood: '🐟',
    bakery: '🍞',
    pantry: '🥫',
    beverage: '🥤',
    frozen: '❄️',
  };
  return emojiMap[category || ''] || '🍴';
};

const getUserInitials = (name?: string): string => {
  if (!name) return 'U';
  return name
    .split(' ')
    .map((n) => n[0]?.toUpperCase())
    .join('')
    .slice(0, 2);
};

// Platform-specific shadow helper (Android's elevation doesn't support colored shadows)
const getShadow = (color: string, elevation: number = 4): Record<string, any> => {
  if (Platform.OS === 'android') {
    return { elevation };
  }
  // iOS supports colored shadows
  return {
    shadowColor: color,
    shadowOffset: { width: 0, height: elevation },
    shadowOpacity: 0.3,
    shadowRadius: elevation * 2,
  };
};

export default function DashboardScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const db = useDatabase();
  const { householdId } = useAuthIds();
  const { user } = useCurrentUser();
  const { isPremium } = useSubscription();
  const [items, setItems] = useState<Item[]>([]);
  const [notifications, setNotifications] = useState(0);
  const [valueSaved, setValueSaved] = useState(0);
  const [wasteStreaks, setWasteStreaks] = useState(0);

  useEffect(() => {
    if (!householdId) return;
    const repo = new ItemRepository(db);
    const sub = repo.observeByHousehold(householdId).subscribe({
      next: (fetchedItems) => {
        setItems(fetchedItems);
      },
      error: () => {},
    });
    return () => sub.unsubscribe();
  }, [db, householdId]);

  // Fetch stats (savings, waste streaks)
  useEffect(() => {
    if (!householdId) return;
    statsService.getStatsOverview(db, householdId).then((overview) => {
      setValueSaved(Math.round(overview.totalValueSaved));
      setWasteStreaks(overview.wasteStreaks);
    });
  }, [db, householdId]);

  // Memoized stats calculation - only recalculates when items change
  const stats = useMemo<ItemStats>(() => {
    const now = Date.now();
    let fresh = 0,
      soon = 0,
      urgent = 0;

    for (const item of items) {
      if (item.status !== 'active') continue;
      if (!item.expiryAt) {
        fresh++;
      } else {
        const diff = item.expiryAt - now;
        if (diff > MS_7D) fresh++;
        else if (diff > MS_3D) soon++;
        else urgent++;
      }
    }
    return { fresh, soon, urgent };
  }, [items]);

  // Memoized soon items - only recalculates when items change
  const soonItems = useMemo(() => {
    return items
      .filter((item) => item.status === 'active')
      .sort((a, b) => {
        if (!a.expiryAt) return 1;
        if (!b.expiryAt) return -1;
        return a.expiryAt - b.expiryAt;
      })
      .slice(0, 3);
  }, [items]);

  return (
    <Animated.View
      style={{ flex: 1, backgroundColor: C['surface/base'] }}
      entering={FadeInUp.duration(300)}
      exiting={FadeOutDown.duration(200)}
    >
      {/* === Sticky Topbar (outside ScrollView) === */}
      <BlurView intensity={90} style={{ paddingTop: insets.top, zIndex: 10 }}>
        <XStack
          paddingHorizontal={22}
          paddingVertical={12}
          justifyContent="space-between"
          alignItems="flex-end"
        >
          <YStack flex={1} gap={2}>
            <XStack alignItems="center" gap={8}>
              <Text fontSize={12} fontWeight="600" color={C['text/secondary']} letterSpacing={0.3}>
                Welcome back
              </Text>
              {/* Synced pill */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 5,
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  backgroundColor: C['brand/soft'],
                  borderRadius: R.full,
                }}
              >
                <View
                  style={{
                    width: 6,
                    height: 6,
                    backgroundColor: C['brand/primary'],
                    borderRadius: 3, // Half of size for circular dot
                  }}
                />
                <Text fontSize={10} fontWeight="700" color={C['brand/primary']} letterSpacing={0.3}>
                  Synced
                </Text>
              </View>
            </XStack>
            <Text
              fontSize={28}
              fontWeight="800"
              fontFamily="Fraunces"
              color={C['text/primary']}
              letterSpacing={-0.8}
              lineHeight={31}
            >
              Hello there 👋
            </Text>
          </YStack>
          <XStack gap={8} alignItems="center">
            <Pressable
              onPress={() => router.push('/notifications')}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: C['surface/raised'],
                borderWidth: 1,
                borderColor: C['border/subtle'],
                justifyContent: 'center',
                alignItems: 'center',
              }}
              accessible
              accessibilityRole="button"
              accessibilityLabel="View notifications"
              accessibilityHint="Shows unread notifications and alerts"
            >
              <Text fontSize={18}>🔔</Text>
              {notifications > 0 && (
                <View
                  style={{
                    position: 'absolute',
                    top: 6,
                    right: 6,
                    width: 9,
                    height: 9,
                    backgroundColor: C['accent/coral'],
                    borderRadius: 4.5,
                    borderWidth: 2,
                    borderColor: C['surface/raised'],
                  }}
                  accessible={false}
                />
              )}
            </Pressable>
            <Pressable
              onPress={() => router.push('/settings')}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: C['brand/soft'],
                justifyContent: 'center',
                alignItems: 'center',
              }}
              accessible
              accessibilityRole="button"
              accessibilityLabel="Account settings"
              accessibilityHint="Open user profile and app settings"
            >
              <Text fontSize={15} fontWeight="800" color={C['brand/primary']}>
                {getUserInitials(user?.name)}
              </Text>
            </Pressable>
          </XStack>
        </XStack>
      </BlurView>

      {/* === ScrollView (starts below sticky topbar) === */}
      <ScrollView
        contentContainerStyle={{
          paddingBottom: insets.bottom + 100,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* === Hero Stats === */}
        <View
          style={{
            display: 'flex',
            flexDirection: 'row',
            gap: 10,
            paddingHorizontal: 22,
            paddingVertical: 4,
            marginBottom: 16,
          }}
        >
          {[
            {
              label: 'Fresh',
              count: stats.fresh,
              color: C['status/fresh'],
            },
            {
              label: 'Use soon',
              count: stats.soon,
              color: C['status/soon'],
            },
            {
              label: 'Eat today',
              count: stats.urgent,
              color: C['status/urgent'],
            },
          ].map((stat) => (
            <Pressable
              key={stat.label}
              onPress={() => router.push('/items' as any)}
              style={{
                flex: 1,
                backgroundColor: C['surface/raised'],
                borderRadius: 32,
                padding: 16,
                paddingBottom: 14,
                borderWidth: 1,
                borderColor: C['border/subtle'],
                alignItems: 'flex-start',
                justifyContent: 'flex-start',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <Text
                fontSize={32}
                fontWeight="800"
                fontFamily="Fraunces"
                color={stat.color}
                letterSpacing={-1.5}
                lineHeight={1}
                marginBottom={4}
              >
                {stat.count}
              </Text>
              <Text fontSize={12} color={C['text/secondary']} fontWeight="600" letterSpacing={0.3}>
                {stat.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* === Today's Pick CTA === */}
        <View style={{ paddingHorizontal: 22, paddingBottom: 0, paddingTop: 8 }}>
          <Pressable
            onPress={() => router.push('/digest')}
            style={{
              borderRadius: R.lg,
              overflow: 'hidden',
              padding: 18,
              position: 'relative',
              shadowColor: C['accent/coral'],
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.3,
              shadowRadius: 24,
              elevation: 6,
            }}
          >
            <LinearGradient
              colors={[C['accent/coral'], C['accent/honey']]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }}
            />
            <View
              style={{
                position: 'absolute',
                top: -20,
                right: -20,
                opacity: 0.15,
              }}
            >
              <Text fontSize={120}>🍽</Text>
            </View>
            <View style={{ position: 'relative', zIndex: 1 }}>
              <Text
                fontSize={11}
                fontWeight="800"
                color="rgba(255,255,255,0.9)"
                letterSpacing={1.5}
              >
                ⭐ TODAY'S PICK
              </Text>
              <Text fontSize={22} fontWeight="800" color="white" marginTop={6} letterSpacing={-0.4}>
                What to eat today
              </Text>
              <Text fontSize={13} color="rgba(255,255,255,0.95)" marginTop={4}>
                Spinach expires tomorrow · 3 quick recipes
              </Text>
            </View>
          </Pressable>
        </View>

        {/* === Insight Card === */}
        <View
          style={{
            marginHorizontal: 22,
            marginVertical: 16,
            borderRadius: R.lg,
            overflow: 'hidden',
            padding: 22,
            position: 'relative',
            ...getShadow(C['brand/primary'], 8),
          }}
        >
          <LinearGradient
            colors={[C['brand/primary'], C['brand/primaryLight']]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          />
          {/* Decorative circle ::before */}
          <View
            style={{
              position: 'absolute',
              top: -60,
              right: -60,
              width: 180,
              height: 180,
              borderRadius: 90,
              backgroundColor: 'rgba(255,255,255,0.15)',
              opacity: 0.5,
            }}
          />
          {/* Decorative circle ::after */}
          <View
            style={{
              position: 'absolute',
              bottom: -40,
              left: -40,
              width: 140,
              height: 140,
              borderRadius: 70,
              backgroundColor: 'rgba(244,185,66,0.20)',
              opacity: 0.5,
            }}
          />
          <View
            style={{
              position: 'relative',
              flexDirection: 'row',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
            }}
          >
            <YStack flex={1}>
              <Text fontSize={11} fontWeight="800" color="rgba(255,255,255,0.85)" letterSpacing={2}>
                💡 THIS MONTH
              </Text>
              <Text
                fontSize={26}
                fontWeight="800"
                fontFamily="Fraunces"
                color="white"
                letterSpacing={-0.6}
                marginTop={6}
              >
                You saved ${valueSaved}
              </Text>
              <Text fontSize={14} color="rgba(255,255,255,0.92)" marginTop={6} lineHeight={20}>
                Eating items before they expire saved 8.4 lbs of food from the trash.
              </Text>
            </YStack>
            <Text fontSize={28} marginLeft={12}>
              📈
            </Text>
          </View>
        </View>

        {/* === Streak Card === */}
        <View style={{ marginHorizontal: 22, marginVertical: 16 }}>
          <LinearGradient
            colors={[C['accent/coral'], C['accent/honey']]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              borderRadius: R.lg,
              padding: 18,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 14,
              position: 'relative',
              overflow: 'hidden',
              ...getShadow(C['accent/coral'], 8),
            }}
          >
            <View
              style={{
                position: 'absolute',
                top: -10,
                right: -10,
                opacity: 0.15,
              }}
            >
              <Text fontSize={100}>🔥</Text>
            </View>
            <Text
              fontSize={40}
              fontWeight="900"
              fontFamily="Fraunces"
              color="white"
              letterSpacing={-2}
              lineHeight={1}
            >
              {wasteStreaks}
            </Text>
            <YStack flex={1}>
              <Text fontSize={18} fontWeight="800" color="white" letterSpacing={-0.5}>
                {wasteStreaks === 1 ? 'Week' : 'Weeks'} no waste!
              </Text>
              <Text fontSize={13} color="rgba(255,255,255,0.95)" marginTop={2}>
                Zero items wasted this week
              </Text>
            </YStack>
          </LinearGradient>
        </View>

        {/* === Eat Soon Section === */}
        <YStack paddingHorizontal={22} paddingTop={16}>
          <XStack justifyContent="space-between" alignItems="baseline" marginBottom={14}>
            <Text
              fontSize={20}
              fontWeight="700"
              color={C['text/primary']}
              letterSpacing={-0.3}
              fontFamily="Fraunces"
            >
              Eat soon
            </Text>
            <Pressable onPress={() => router.push('/items' as any)}>
              <Text fontSize={14} color={C['brand/primary']} fontWeight="600">
                See all →
              </Text>
            </Pressable>
          </XStack>
          {soonItems.length === 0 ? (
            <View
              style={{
                backgroundColor: C['surface/raised'],
                borderRadius: 32,
                padding: 24,
                borderWidth: 1,
                borderColor: C['border/subtle'],
                alignItems: 'center',
              }}
            >
              <Text fontSize={32} marginBottom={8}>
                🌱
              </Text>
              <Text fontSize={14} color={C['text/secondary']} textAlign="center">
                No items expiring soon
              </Text>
            </View>
          ) : (
            soonItems.map((item) => {
              const status = getItemStatus(item.expiryAt);
              const daysLeft = getDaysLeft(item.expiryAt);
              const emoji = getEmoji(item.category);
              return (
                <ItemCard
                  key={item.id}
                  emoji={emoji}
                  name={item.foodName}
                  status={status}
                  days={daysLeft ?? undefined}
                  container={item.storageLocation}
                  onPress={() => router.push(`/items/${item.id}` as any)}
                  accessibilityLabel={`${item.foodName}, expires in ${daysLeft} days`}
                />
              );
            })
          )}
        </YStack>

        {/* === Tonight's Ideas === */}
        <YStack paddingHorizontal={22} paddingTop={16}>
          <XStack justifyContent="space-between" alignItems="baseline" marginBottom={14}>
            <Text
              fontSize={20}
              fontWeight="700"
              color={C['text/primary']}
              letterSpacing={-0.3}
              fontFamily="Fraunces"
            >
              Tonight's ideas
            </Text>
            <Pressable onPress={() => router.push('/recipes')}>
              <Text fontSize={14} color={C['brand/primary']} fontWeight="600">
                More →
              </Text>
            </Pressable>
          </XStack>
          <Pressable
            onPress={() => router.push('/recipes')}
            style={{
              backgroundColor: C['surface/raised'],
              borderRadius: 32,
              padding: 18,
              borderWidth: 1,
              borderColor: C['border/subtle'],
              flexDirection: 'row',
              alignItems: 'center',
              gap: 14,
              shadowColor: C['text/primary'],
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.04,
              shadowRadius: 4,
              elevation: 1,
            }}
          >
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                backgroundColor: C['accent/honeySoft'],
                justifyContent: 'center',
                alignItems: 'center',
                flexShrink: 0,
              }}
            >
              <Text fontSize={28}>🍝</Text>
            </View>
            <YStack flex={1}>
              <Text fontSize={15} fontWeight="700" color={C['text/primary']} letterSpacing={-0.1}>
                Creamy Mushroom Pasta
              </Text>
              <Text fontSize={12} color={C['text/secondary']} marginTop={4}>
                Uses spinach, mushrooms · 25 min
              </Text>
            </YStack>
          </Pressable>
        </YStack>

        {/* === Quick Actions Grid === */}
        <YStack paddingHorizontal={22} paddingTop={16}>
          <XStack justifyContent="space-between" alignItems="baseline" marginBottom={14}>
            <Text
              fontSize={20}
              fontWeight="700"
              color={C['text/primary']}
              letterSpacing={-0.3}
              fontFamily="Fraunces"
            >
              Quick actions
            </Text>
          </XStack>
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 10,
            }}
          >
            {[
              {
                icon: '🛒',
                title: 'Shopping',
                count: '3 items',
                route: '/shopping',
                bg: C['accent/honeySoft'],
              },
              {
                icon: '🍱',
                title: 'Containers',
                count: '4 active',
                route: '/containers',
                bg: C['accent/coralSoft'],
              },
              {
                icon: '📊',
                title: 'Insights',
                count: `$${valueSaved} saved`,
                route: '/analytics',
                bg: C['accent/skySoft'],
              },
              {
                icon: '🏆',
                title: 'Achievements',
                count: '12/30',
                route: '/achievements',
                bg: C['accent/plumSoft'],
              },
              {
                icon: '📰',
                title: 'Activity',
                count: '12 today',
                route: '/activity',
                bg: C['accent/coralSoft'],
              },
              {
                icon: '🍕',
                title: 'Eat out',
                count: 'Nearby spots',
                route: '/restaurants',
                bg: C['accent/honeySoft'],
              },
              {
                icon: '🧾',
                title: 'Scan receipt',
                count: 'Add 30+ at once',
                route: '/receipt-review',
                bg: C['accent/skySoft'],
              },
              {
                icon: '🏷️',
                title: 'Print stickers',
                count: 'QR sheet',
                route: '/stickers',
                bg: C['accent/plumSoft'],
              },
              {
                icon: '🥗',
                title: 'Daily intake',
                count: '1,247 / 2,000 cal',
                route: '/nutrition',
                bg: C['status/freshBg'],
              },
              {
                icon: '👥',
                title: 'Friends',
                count: 'Social feed',
                route: '/activity',
                bg: C['accent/coralSoft'],
              },
            ].map((action, idx) => (
              <Pressable
                key={idx}
                onPress={() => router.push(action.route as any)}
                style={{
                  width: '48.5%',
                  backgroundColor: C['surface/raised'],
                  borderRadius: 32,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: C['border/subtle'],
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  shadowColor: C['text/primary'],
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.04,
                  shadowRadius: 4,
                  elevation: 1,
                }}
              >
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    backgroundColor: action.bg,
                    justifyContent: 'center',
                    alignItems: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Text fontSize={20}>{action.icon}</Text>
                </View>
                <YStack flex={1}>
                  <Text
                    fontSize={15}
                    fontWeight="700"
                    color={C['text/primary']}
                    letterSpacing={-0.1}
                  >
                    {action.title}
                  </Text>
                  <Text fontSize={12} color={C['text/secondary']} marginTop={2}>
                    {action.count}
                  </Text>
                </YStack>
              </Pressable>
            ))}
          </View>
        </YStack>

        {/* === Premium Upsell Card === */}
        <View style={{ paddingHorizontal: 22, paddingTop: 16 }}>
          <Pressable
            onPress={() => router.push('/subscription' as any)}
            style={{
              borderRadius: R.lg,
              overflow: 'hidden',
              padding: 18,
              position: 'relative',
              shadowColor: C['accent/berry'],
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.2,
              shadowRadius: 16,
              elevation: 4,
            }}
          >
            <LinearGradient
              colors={[C['accent/plum'], C['accent/berry']]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }}
            />
            <View
              style={{
                position: 'absolute',
                top: -30,
                right: -20,
                opacity: 0.15,
              }}
            >
              <Text fontSize={140} lineHeight={140}>
                ⭐
              </Text>
            </View>
            <View style={{ position: 'relative', zIndex: 1 }}>
              <Text
                fontSize={11}
                fontWeight="800"
                color="rgba(255,255,255,0.9)"
                letterSpacing={1.5}
              >
                PREMIUM
              </Text>
              <Text fontSize={20} fontWeight="800" color="white" marginTop={6} letterSpacing={-0.3}>
                Unlimited AI · Family sharing · More
              </Text>
              <Text fontSize={13} color="rgba(255,255,255,0.92)" marginTop={4}>
                7-day free trial · Cancel anytime
              </Text>
            </View>
          </Pressable>
        </View>

        {/* === Weekly Recap Card === */}
        <View style={{ paddingHorizontal: 22, paddingTop: 16, paddingBottom: 40 }}>
          <Pressable
            onPress={() => router.push('/digest' as any)}
            style={{
              borderRadius: 32,
              overflow: 'hidden',
              padding: 18,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 14,
              shadowColor: C['brand/primary'],
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.25,
              shadowRadius: 16,
              elevation: 6,
            }}
          >
            <LinearGradient
              colors={[C['brand/primary'], C['brand/primaryLight']]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            />
            <View
              style={{
                position: 'relative',
                zIndex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 14,
                flex: 1,
              }}
            >
              <View
                style={{
                  width: 48,
                  height: 48,
                  backgroundColor: 'rgba(255,255,255,0.18)',
                  borderRadius: 16,
                  justifyContent: 'center',
                  alignItems: 'center',
                  flexShrink: 0,
                }}
              >
                <Text fontSize={24}>📅</Text>
              </View>
              <YStack flex={1}>
                <Text fontSize={18} fontWeight="800" color="white" letterSpacing={-0.3}>
                  Your week in food
                </Text>
                <Text fontSize={13} color="rgba(255,255,255,0.9)" marginTop={2}>
                  ${valueSaved} saved · {wasteStreaks} {wasteStreaks === 1 ? 'week' : 'weeks'} · See
                  recap
                </Text>
              </YStack>
              <Text fontSize={24} color="white">
                →
              </Text>
            </View>
          </Pressable>
        </View>
      </ScrollView>

      {/* === Floating Add Button === */}
      <FAB
        icon="+"
        position="bottom-right"
        size="md"
        onPress={() => router.push('/items/new' as any)}
      />
    </Animated.View>
  );
}
