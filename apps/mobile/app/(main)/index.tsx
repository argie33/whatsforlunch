import React, { useState, useEffect } from 'react';
import { ScrollView, View, Alert, Pressable, ImageBackground } from 'react-native';
import { Text, YStack, XStack, Input } from 'tamagui';
import { useTranslation } from 'react-i18next';
import { Plus, Bell } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { useAuthIds } from '@/features/auth';
import { useDatabase } from '@/db';
import type { Item } from '@/db/models/Item';
import { ItemRepository } from '@/db/repositories/ItemRepository';
import { itemsService } from '@/services';
import { Button } from '@/components/ui/Button';

interface ItemStats {
  fresh: number;
  soon: number;
  urgent: number;
}

export default function DashboardScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const db = useDatabase();
  const { householdId, userId } = useAuthIds();
  const [items, setItems] = useState<Item[]>([]);
  const [stats, setStats] = useState<ItemStats>({ fresh: 0, soon: 0, urgent: 0 });
  const [loading, setLoading] = useState(false);
  const [userName, setUserName] = useState('User');

  useEffect(() => {
    if (!householdId) return;
    setLoading(true);
    const repo = new ItemRepository(db);
    const sub = repo.observeByHousehold(householdId).subscribe({
      next: (fetchedItems) => {
        setItems(fetchedItems);
        calculateStats(fetchedItems);
        setLoading(false);
      },
      error: () => {
        setLoading(false);
      },
    });
    return () => sub.unsubscribe();
  }, [db, householdId]);

  const calculateStats = (items: Item[]) => {
    const now = Date.now();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
    const oneDayMs = 24 * 60 * 60 * 1000;

    const fresh = items.filter(item => {
      if (item.status !== 'active') return false;
      if (!item.expiryAt) return true;
      const expiry = new Date(item.expiryAt).getTime();
      return expiry - now > sevenDaysMs;
    }).length;

    const soon = items.filter(item => {
      if (item.status !== 'active') return false;
      if (!item.expiryAt) return false;
      const expiry = new Date(item.expiryAt).getTime();
      return expiry - now <= sevenDaysMs && expiry - now > threeDaysMs;
    }).length;

    const urgent = items.filter(item => {
      if (item.status !== 'active') return false;
      if (!item.expiryAt) return false;
      const expiry = new Date(item.expiryAt).getTime();
      return expiry - now <= threeDaysMs;
    }).length;

    setStats({ fresh, soon, urgent });
  };

  const soonItems = items
    .filter(item => item.status === 'active')
    .sort((a, b) => {
      if (!a.expiryAt) return 1;
      if (!b.expiryAt) return -1;
      return new Date(a.expiryAt).getTime() - new Date(b.expiryAt).getTime();
    })
    .slice(0, 3);

  const quickActions = [
    { icon: '🛒', title: 'Shopping', count: '3 items', route: '/shopping' },
    { icon: '🍱', title: 'Containers', count: '4 active', route: '/containers' },
    { icon: '📊', title: 'Insights', count: '$127 saved', route: '/analytics' },
    { icon: '🏆', title: 'Achievements', count: '12/30', route: '/achievements' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: '#FBFAF7' }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top,
          paddingHorizontal: 16,
          paddingBottom: insets.bottom + 100,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Bar */}
        <XStack
          justifyContent="space-between"
          alignItems="flex-start"
          marginBottom={12}
          paddingVertical={8}
        >
          <YStack flex={1}>
            <Text fontSize={12} color="#5C615E" fontWeight="600">
              Welcome back
            </Text>
            <Text fontSize={28} fontWeight="800" color="#0F1411" marginTop={4}>
              Hello there 👋
            </Text>
          </YStack>
          <XStack gap={12} alignItems="center">
            <Pressable
              onPress={() => router.push('/notifications')}
              style={{
                width: 40,
                height: 40,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Bell size={24} color="#0F1411" />
              <View
                style={{
                  position: 'absolute',
                  top: 6,
                  right: 6,
                  width: 9,
                  height: 9,
                  backgroundColor: '#E56C5A',
                  borderRadius: 4.5,
                  borderWidth: 2,
                  borderColor: 'white',
                }}
              />
            </Pressable>
            <Pressable
              onPress={() => router.push('/settings')}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: '#E8F2EC',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Text fontSize={16} fontWeight="700">
                U
              </Text>
            </Pressable>
          </XStack>
        </XStack>

        {/* Hero Stats */}
        <XStack gap={10} marginBottom={20}>
          {[
            { label: 'Fresh', count: stats.fresh, color: '#3A8C5F' },
            { label: 'Use soon', count: stats.soon, color: '#C98A2B' },
            { label: 'Eat today', count: stats.urgent, color: '#C24A3E' },
          ].map((stat) => (
            <YStack
              key={stat.label}
              flex={1}
              padding={16}
              backgroundColor="#FFFFFF"
              borderRadius={12}
              alignItems="center"
              justifyContent="center"
            >
              <Text fontSize={24} fontWeight="800" color={stat.color}>
                {stat.count}
              </Text>
              <Text fontSize={13} color="#5C615E" marginTop={6} fontWeight="600">
                {stat.label}
              </Text>
            </YStack>
          ))}
        </XStack>

        {/* Today's Pick Card */}
        <Pressable
          onPress={() => router.push('/digest')}
          style={{
            marginBottom: 20,
            borderRadius: 16,
            overflow: 'hidden',
            backgroundColor: '#FF8A3D',
          }}
        >
          <YStack
            padding={18}
            backgroundColor="#FF8A3D"
            borderRadius={16}
          >
            <Text fontSize={11} fontWeight="800" color="rgba(255,255,255,0.9)" letterSpacing={1.5}>
              ⭐ TODAY'S PICK
            </Text>
            <Text fontSize={22} fontWeight="800" color="white" marginTop={6}>
              What to eat today
            </Text>
            <Text fontSize={13} color="rgba(255,255,255,0.95)" marginTop={4}>
              Spinach expires tomorrow · 3 quick recipes
            </Text>
          </YStack>
        </Pressable>

        {/* Insight Card */}
        <YStack
          padding={16}
          backgroundColor="#FFFFFF"
          borderRadius={16}
          marginBottom={20}
          flexDirection="row"
          justifyContent="space-between"
          alignItems="center"
        >
          <YStack flex={1}>
            <Text fontSize={12} color="#5C615E" fontWeight="800">
              💡 THIS MONTH
            </Text>
            <Text fontSize={20} fontWeight="800" color="#0F1411" marginTop={4}>
              You saved $127
            </Text>
            <Text fontSize={13} color="#5C615E" marginTop={4} lineHeight={18}>
              Eating items before they expire saved 8.4 lbs of food from the trash.
            </Text>
          </YStack>
          <Text fontSize={32} marginLeft={12}>
            📈
          </Text>
        </YStack>

        {/* Streak Card */}
        <YStack
          padding={16}
          backgroundColor="#FFFFFF"
          borderRadius={16}
          marginBottom={20}
          flexDirection="row"
          justifyContent="space-between"
          alignItems="center"
        >
          <YStack
            width={48}
            height={48}
            backgroundColor="#E8F2EC"
            borderRadius={12}
            justifyContent="center"
            alignItems="center"
          >
            <Text fontSize={24} fontWeight="800" color="#3A8C5F">
              7
            </Text>
          </YStack>
          <YStack marginLeft={12} flex={1}>
            <Text fontSize={18} fontWeight="800" color="#0F1411">
              Day streak!
            </Text>
            <Text fontSize={13} color="#5C615E" marginTop={2}>
              Zero items wasted this week
            </Text>
          </YStack>
        </YStack>

        {/* Eat Soon Section */}
        <YStack marginBottom={20}>
          <XStack justifyContent="space-between" alignItems="center" marginBottom={12}>
            <Text fontSize={18} fontWeight="800" color="#0F1411">
              Eat soon
            </Text>
            <Pressable onPress={() => router.push('/items')}>
              <Text fontSize={14} color="#3A8C5F" fontWeight="600">
                See all →
              </Text>
            </Pressable>
          </XStack>
          {soonItems.length === 0 ? (
            <Text fontSize={14} color="#5C615E" textAlign="center" marginVertical={20}>
              No items expiring soon
            </Text>
          ) : (
            soonItems.map((item) => (
              <YStack
                key={item.id}
                padding={12}
                backgroundColor="#FFFFFF"
                borderRadius={12}
                marginBottom={10}
                flexDirection="row"
                justifyContent="space-between"
                alignItems="center"
              >
                <YStack flex={1}>
                  <Text fontWeight="600" fontSize={15} color="#0F1411">
                    {item.foodName}
                  </Text>
                  {item.expiryAt && (
                    <Text fontSize={12} color="#5C615E" marginTop={2}>
                      Expires {new Date(item.expiryAt).toLocaleDateString()}
                    </Text>
                  )}
                </YStack>
                <Pressable onPress={() => router.push(`/items/${item.id}`)}>
                  <Text fontSize={18}>→</Text>
                </Pressable>
              </YStack>
            ))
          )}
        </YStack>

        {/* Quick Actions Grid */}
        <YStack marginBottom={20}>
          <Text fontSize={18} fontWeight="800" color="#0F1411" marginBottom={12}>
            Quick actions
          </Text>
          {quickActions.map((action, idx) => (
            <Pressable
              key={idx}
              onPress={() => router.push(action.route as any)}
              style={{ marginBottom: 10 }}
            >
              <YStack
                padding={16}
                backgroundColor="#FFFFFF"
                borderRadius={12}
                flexDirection="row"
                alignItems="center"
                gap={12}
              >
                <Text fontSize={28}>{action.icon}</Text>
                <YStack flex={1}>
                  <Text fontWeight="700" fontSize={15} color="#0F1411">
                    {action.title}
                  </Text>
                  <Text fontSize={12} color="#5C615E" marginTop={2}>
                    {action.count}
                  </Text>
                </YStack>
              </YStack>
            </Pressable>
          ))}
        </YStack>
      </ScrollView>

      {/* Add Item FAB */}
      <Pressable
        onPress={() => router.push('/items/new')}
        style={{
          position: 'absolute',
          bottom: insets.bottom + 20,
          right: 20,
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: '#2F7D5B',
          justifyContent: 'center',
          alignItems: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.2,
          shadowRadius: 8,
          elevation: 4,
        }}
      >
        <Plus size={28} color="white" />
      </Pressable>
    </View>
  );
}
