import React, { useState } from 'react';
import { ScrollView, View, Pressable, FlatList } from 'react-native';
import { Text, YStack, XStack } from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { FadeInUp, FadeOutDown } from 'react-native-reanimated';
import { lightTheme } from '@/theme/tokens';
import { R } from '@/theme/tokens';
import { useAuthIds } from '@/features/auth';
import { useDatabase } from '@/db';
import { Chip } from '@/components/ui/Chip';

const C = lightTheme;

interface Photo {
  id: string;
  itemName: string;
  date: string;
  emoji: string;
  owner: string;
  likes: number;
}

const MOCK_PHOTOS: Photo[] = [
  { id: '1', itemName: 'Homemade pasta', date: 'Today', emoji: '🍝', owner: 'You', likes: 12 },
  {
    id: '2',
    itemName: 'Grilled chicken',
    date: 'Yesterday',
    emoji: '🍗',
    owner: 'Sarah',
    likes: 8,
  },
  { id: '3', itemName: 'Fresh salad', date: '2 days ago', emoji: '🥗', owner: 'You', likes: 15 },
  {
    id: '4',
    itemName: 'Veggie stir fry',
    date: '3 days ago',
    emoji: '🥘',
    owner: 'Alex',
    likes: 6,
  },
  { id: '5', itemName: 'Chocolate cake', date: '1 week ago', emoji: '🍰', owner: 'You', likes: 23 },
  {
    id: '6',
    itemName: 'Breakfast bowl',
    date: '1 week ago',
    emoji: '🥣',
    owner: 'Sarah',
    likes: 11,
  },
];

export default function GalleryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const db = useDatabase();
  const { householdId } = useAuthIds();
  const [photos, setPhotos] = useState<Photo[]>(MOCK_PHOTOS);
  const [filter, setFilter] = useState<'all' | 'yours' | 'friends'>('all');
  const [likedPhotos, setLikedPhotos] = useState<Set<string>>(new Set());

  // TODO: Wire to galleryService.getPhotos(db, householdId, filter)

  const filteredPhotos = photos.filter((photo) => {
    if (filter === 'yours') return photo.owner === 'You';
    if (filter === 'friends') return photo.owner !== 'You';
    return true;
  });

  const toggleLike = (photoId: string) => {
    const newLiked = new Set(likedPhotos);
    if (newLiked.has(photoId)) {
      newLiked.delete(photoId);
      setPhotos(photos.map((p) => (p.id === photoId ? { ...p, likes: p.likes - 1 } : p)));
    } else {
      newLiked.add(photoId);
      setPhotos(photos.map((p) => (p.id === photoId ? { ...p, likes: p.likes + 1 } : p)));
    }
    setLikedPhotos(newLiked);
  };

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
              GALLERY
            </Text>
            <Text
              fontSize={28}
              fontWeight="800"
              color={C['text/primary']}
              letterSpacing={-0.8}
              marginTop={2}
              fontFamily="Fraunces"
            >
              Food Moments
            </Text>
          </YStack>

          {/* === Filter Chips === */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
            style={{ marginBottom: 20 }}
          >
            {[
              { key: 'all' as const, label: 'All' },
              { key: 'yours' as const, label: 'Your Photos' },
              { key: 'friends' as const, label: 'Friends' },
            ].map((f) => (
              <Chip
                key={f.key}
                label={f.label}
                active={filter === f.key}
                onPress={() => setFilter(f.key)}
              />
            ))}
          </ScrollView>

          {/* === Photos Grid === */}
          {filteredPhotos.length === 0 ? (
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
                📸
              </Text>
              <Text fontSize={16} fontWeight="700" color={C['text/primary']} marginBottom={4}>
                No photos yet
              </Text>
              <Text fontSize={13} color={C['text/secondary']} textAlign="center">
                Share your food moments with the community
              </Text>
            </View>
          ) : (
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: 12,
                marginBottom: 24,
              }}
            >
              {filteredPhotos.map((photo) => (
                <Pressable
                  key={photo.id}
                  onPress={() => router.push(`/gallery/${photo.id}` as any)}
                  style={{
                    width: '48%',
                    backgroundColor: C['surface/raised'],
                    borderRadius: R.lg,
                    borderWidth: 1,
                    borderColor: C['border/subtle'],
                    overflow: 'hidden',
                  }}
                >
                  {/* === Photo Placeholder === */}
                  <View
                    style={{
                      aspectRatio: 1,
                      backgroundColor: C['surface/sunken'],
                      justifyContent: 'center',
                      alignItems: 'center',
                      borderBottomWidth: 1,
                      borderBottomColor: C['border/subtle'],
                    }}
                  >
                    <Text fontSize={48}>{photo.emoji}</Text>
                  </View>

                  {/* === Info === */}
                  <View style={{ padding: 10 }}>
                    <Text fontSize={12} fontWeight="700" color={C['text/primary']} marginBottom={4}>
                      {photo.itemName}
                    </Text>
                    <XStack justifyContent="space-between" alignItems="center">
                      <Text fontSize={10} color={C['text/secondary']}>
                        {photo.date}
                      </Text>
                    </XStack>

                    {/* === Like Button === */}
                    <Pressable
                      onPress={() => toggleLike(photo.id)}
                      style={{
                        marginTop: 8,
                        paddingHorizontal: 8,
                        paddingVertical: 6,
                        backgroundColor: likedPhotos.has(photo.id)
                          ? C['accent/coral']
                          : C['surface/sunken'],
                        borderRadius: R.xs,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 4,
                      }}
                    >
                      <Text fontSize={12}>{likedPhotos.has(photo.id) ? '❤️' : '🤍'}</Text>
                      <Text
                        fontSize={10}
                        fontWeight="700"
                        color={likedPhotos.has(photo.id) ? 'white' : C['text/secondary']}
                      >
                        {photo.likes}
                      </Text>
                    </Pressable>
                  </View>
                </Pressable>
              ))}
            </View>
          )}

          {/* === Upload CTA === */}
          <Pressable
            onPress={() => {
              // TODO: Open camera/upload modal
            }}
            style={{
              backgroundColor: C['surface/raised'],
              borderRadius: R.lg,
              padding: 24,
              borderWidth: 2,
              borderStyle: 'dashed',
              borderColor: C['border/subtle'],
              alignItems: 'center',
            }}
          >
            <Text fontSize={40} marginBottom={12}>
              📸
            </Text>
            <Text fontSize={14} fontWeight="700" color={C['text/primary']} marginBottom={4}>
              Share a moment
            </Text>
            <Text fontSize={12} color={C['text/secondary']} textAlign="center">
              Upload a photo of your meal or food prep
            </Text>
          </Pressable>
        </ScrollView>
      </Animated.View>
    </>
  );
}
