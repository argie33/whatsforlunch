import React, { useState } from 'react';
import { YStack, XStack, Text, View } from 'tamagui';
import { ScrollView, Pressable } from 'react-native';
import { TopBar, Button } from '@/components/ui';
import { lightTheme } from '@/theme/tokens';

const C = lightTheme;

interface Notification {
  id: string;
  type: 'expiry' | 'achievement' | 'household' | 'reminder';
  icon: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

const mockNotifications: Notification[] = [
  {
    id: '1',
    type: 'expiry',
    icon: '⏰',
    title: 'Lettuce expiring today!',
    message: 'Use it before midnight',
    timestamp: '2 hours ago',
    read: false,
  },
  {
    id: '2',
    type: 'achievement',
    icon: '🏆',
    title: 'Achievement unlocked!',
    message: "You've completed a 7-day streak",
    timestamp: '1 day ago',
    read: true,
  },
  {
    id: '3',
    type: 'household',
    icon: '👤',
    title: 'Alex added Milk',
    message: 'In Fridge · Expires 2024-05-15',
    timestamp: '3 days ago',
    read: true,
  },
  {
    id: '4',
    type: 'reminder',
    icon: '🍽️',
    title: 'Time to cook!',
    message: 'You have tomatoes that need using',
    timestamp: '1 week ago',
    read: true,
  },
  {
    id: '5',
    type: 'expiry',
    icon: '⏰',
    title: 'Carrots expiring soon',
    message: 'Use in the next 3 days',
    timestamp: '1 week ago',
    read: true,
  },
];

const notificationTypeColors = {
  expiry: { bg: C['status/urgentBg'], icon: '⏰' },
  achievement: { bg: C['brand/soft'], icon: '🏆' },
  household: { bg: C['surface/sunken'], icon: '👥' },
  reminder: { bg: C['accent/honeySoft'], icon: '🔔' },
};

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState(mockNotifications);
  const [scrollY, setScrollY] = useState(0);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = (id: string) => {
    setNotifications(notifications.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const deleteNotification = (id: string) => {
    setNotifications(notifications.filter((n) => n.id !== id));
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map((n) => ({ ...n, read: true })));
  };

  return (
    <YStack flex={1} backgroundColor={C['surface/base']}>
      <ScrollView
        scrollEventThrottle={16}
        onScroll={(e) => setScrollY(e.nativeEvent.contentOffset.y)}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        <TopBar
          title="Notifications"
          subtitle={unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
          scrollY={scrollY}
        />

        {notifications.length > 0 ? (
          <>
            {unreadCount > 0 && (
              <YStack paddingHorizontal={22} paddingTop={16}>
                <Button variant="ghost" size="sm" onPress={markAllAsRead}>
                  Mark all as read
                </Button>
              </YStack>
            )}

            {/* Notifications List */}
            <YStack paddingHorizontal={22} paddingTop={16} gap={8}>
              {notifications.map((notification) => (
                <Pressable
                  key={notification.id}
                  onPress={() => markAsRead(notification.id)}
                  style={{
                    backgroundColor: notification.read ? C['surface/raised'] : C['surface/sunken'],
                    borderRadius: 16,
                    borderWidth: notification.read ? 1 : 0,
                    borderColor: C['border/subtle'],
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    marginBottom: 0,
                  }}
                >
                  <XStack gap={12} alignItems="flex-start">
                    {/* Icon Background */}
                    <View
                      width={44}
                      height={44}
                      borderRadius={12}
                      backgroundColor={notificationTypeColors[notification.type].bg}
                      justifyContent="center"
                      alignItems="center"
                      flexShrink={0}
                    >
                      <Text fontSize={20}>{notification.icon}</Text>
                    </View>

                    {/* Content */}
                    <YStack flex={1} gap={2}>
                      <XStack alignItems="center" gap={8}>
                        <Text fontSize={15} fontWeight="700" color={C['text/primary']} flex={1}>
                          {notification.title}
                        </Text>
                        {!notification.read && (
                          <View
                            width={10}
                            height={10}
                            borderRadius={5}
                            backgroundColor={C['brand/primary']}
                            flexShrink={0}
                          />
                        )}
                      </XStack>

                      <Text fontSize={13} color={C['text/secondary']} lineHeight={18}>
                        {notification.message}
                      </Text>

                      <Text fontSize={11} color={C['text/tertiary']}>
                        {notification.timestamp}
                      </Text>
                    </YStack>

                    {/* Delete Button */}
                    <Pressable
                      onPress={() => deleteNotification(notification.id)}
                      style={{ padding: 4 }}
                    >
                      <Text fontSize={18} color={C['text/tertiary']}>
                        ✕
                      </Text>
                    </Pressable>
                  </XStack>
                </Pressable>
              ))}
            </YStack>
          </>
        ) : (
          <YStack paddingHorizontal={22} paddingTop={60} alignItems="center" gap={16}>
            <Text fontSize={60}>🔔</Text>
            <Text fontSize={18} fontWeight="700" color={C['text/primary']}>
              All caught up!
            </Text>
            <Text fontSize={14} color={C['text/secondary']} textAlign="center">
              You're all set. Check back later for updates.
            </Text>
          </YStack>
        )}
      </ScrollView>
    </YStack>
  );
}
