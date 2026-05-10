import React, { useState } from 'react';
import { ScrollView, View, Pressable, TextInput } from 'react-native';
import { Text, YStack, XStack } from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { FadeInUp, FadeOutDown } from 'react-native-reanimated';
import { lightTheme } from '@/theme/tokens';
import { R } from '@/theme/tokens';
import { useAuthIds } from '@/features/auth';
import { useDatabase } from '@/db';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';

const C = lightTheme;

interface Friend {
  id: string;
  name: string;
  email: string;
  avatar: string;
  isFollowing: boolean;
  mutualFriends: number;
}

const MOCK_FRIENDS: Friend[] = [
  {
    id: '1',
    name: 'Sarah',
    email: 'sarah@example.com',
    avatar: '👩',
    isFollowing: true,
    mutualFriends: 2,
  },
  {
    id: '2',
    name: 'Alex',
    email: 'alex@example.com',
    avatar: '👨',
    isFollowing: true,
    mutualFriends: 1,
  },
  {
    id: '3',
    name: 'Jordan',
    email: 'jordan@example.com',
    avatar: '🧑',
    isFollowing: false,
    mutualFriends: 3,
  },
];

const MOCK_SUGGESTIONS: Friend[] = [
  {
    id: '4',
    name: 'Casey',
    email: 'casey@example.com',
    avatar: '🧑‍🤝‍🧑',
    isFollowing: false,
    mutualFriends: 2,
  },
  {
    id: '5',
    name: 'Morgan',
    email: 'morgan@example.com',
    avatar: '👨‍🦱',
    isFollowing: false,
    mutualFriends: 1,
  },
];

export default function SocialScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const db = useDatabase();
  const { householdId } = useAuthIds();
  const [filter, setFilter] = useState<'all' | 'following' | 'suggestions'>('all');
  const [friends, setFriends] = useState<Friend[]>(MOCK_FRIENDS);
  const [searchQuery, setSearchQuery] = useState('');

  const toggleFollow = (id: string) => {
    setFriends(friends.map((f) => (f.id === id ? { ...f, isFollowing: !f.isFollowing } : f)));
  };

  const filteredFriends = friends.filter((f) => {
    if (filter === 'following') return f.isFollowing;
    if (filter === 'suggestions') return !f.isFollowing;
    return true;
  });

  const displayedFriends = searchQuery
    ? filteredFriends.filter((f) => f.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : filteredFriends;

  return (
    <>
      <Animated.View
        style={{ flex: 1, backgroundColor: C['surface/base'] }}
        entering={FadeInUp.duration(300)}
        exiting={FadeOutDown.duration(200)}
      >
        <ScrollView
          contentContainerStyle={{
            paddingTop: insets.top + 8,
            paddingHorizontal: 22,
            paddingBottom: insets.bottom + 20,
          }}
          showsVerticalScrollIndicator={false}
        >
          {/* === Header === */}
          <YStack marginBottom={24}>
            <Text fontSize={12} fontWeight="600" color={C['text/secondary']} letterSpacing={0.3}>
              CONNECT
            </Text>
            <Text
              fontSize={28}
              fontWeight="800"
              color={C['text/primary']}
              letterSpacing={-0.8}
              marginTop={2}
              fontFamily="Fraunces"
            >
              Friends
            </Text>
          </YStack>

          {/* === Search === */}
          <View
            style={{
              backgroundColor: C['surface/raised'],
              borderRadius: R.full,
              borderWidth: 1,
              borderColor: C['border/subtle'],
              paddingHorizontal: 16,
              paddingVertical: 12,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              marginBottom: 16,
            }}
          >
            <Text fontSize={14}>🔍</Text>
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search friends..."
              placeholderTextColor={C['text/secondary']}
              style={{
                flex: 1,
                fontSize: 14,
                color: C['text/primary'],
              }}
            />
          </View>

          {/* === Filter Chips === */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
            style={{ marginBottom: 20 }}
          >
            {[
              { key: 'all' as const, label: 'All' },
              { key: 'following' as const, label: 'Following' },
              { key: 'suggestions' as const, label: 'Suggestions' },
            ].map((f) => (
              <Chip
                key={f.key}
                label={f.label}
                active={filter === f.key}
                onPress={() => setFilter(f.key)}
              />
            ))}
          </ScrollView>

          {/* === Friends List === */}
          {displayedFriends.length === 0 ? (
            <View
              style={{
                backgroundColor: C['surface/raised'],
                borderRadius: R.lg,
                padding: 32,
                borderWidth: 1,
                borderColor: C['border/subtle'],
                alignItems: 'center',
              }}
            >
              <Text fontSize={48} marginBottom={12}>
                👥
              </Text>
              <Text fontSize={16} fontWeight="700" color={C['text/primary']} marginBottom={4}>
                No friends yet
              </Text>
              <Text fontSize={13} color={C['text/secondary']} textAlign="center">
                Find and follow friends to share your food journey
              </Text>
            </View>
          ) : (
            <YStack gap={10} marginBottom={24}>
              {displayedFriends.map((friend) => (
                <View
                  key={friend.id}
                  style={{
                    backgroundColor: C['surface/raised'],
                    borderRadius: R.md,
                    padding: 12,
                    borderWidth: 1,
                    borderColor: C['border/subtle'],
                  }}
                >
                  <XStack justifyContent="space-between" alignItems="flex-start">
                    <XStack alignItems="flex-start" gap={12} flex={1}>
                      <View
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 22,
                          backgroundColor: C['surface/sunken'],
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}
                      >
                        <Text fontSize={20}>{friend.avatar}</Text>
                      </View>
                      <YStack flex={1} gap={2}>
                        <Text fontSize={13} fontWeight="700" color={C['text/primary']}>
                          {friend.name}
                        </Text>
                        <Text fontSize={11} color={C['text/secondary']}>
                          {friend.email}
                        </Text>
                        {friend.mutualFriends > 0 && (
                          <Text fontSize={10} color={C['text/secondary']} marginTop={2}>
                            {friend.mutualFriends} mutual friend
                            {friend.mutualFriends !== 1 ? 's' : ''}
                          </Text>
                        )}
                      </YStack>
                    </XStack>

                    <Pressable
                      onPress={() => toggleFollow(friend.id)}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        backgroundColor: friend.isFollowing
                          ? C['surface/sunken']
                          : C['brand/primary'],
                        borderRadius: R.md,
                      }}
                    >
                      <Text
                        fontSize={11}
                        fontWeight="700"
                        color={friend.isFollowing ? C['text/primary'] : 'white'}
                      >
                        {friend.isFollowing ? 'Following' : 'Follow'}
                      </Text>
                    </Pressable>
                  </XStack>
                </View>
              ))}
            </YStack>
          )}

          {/* === Add Friend === */}
          <Button
            variant="primary"
            full
            size="lg"
            onPress={() => {
              // TODO: Open add friend modal
            }}
          >
            + Add Friend
          </Button>
        </ScrollView>
      </Animated.View>
    </>
  );
}
