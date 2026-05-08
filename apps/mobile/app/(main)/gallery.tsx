import React from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { Text, YStack } from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import { lightTheme } from '@/theme/tokens';

const C = lightTheme;

export default function GalleryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const photos = Array.from({ length: 12 }, (_, i) => ({
    id: i,
    emoji: ['🥗', '🍎', '🥦', '🥕', '🍌', '🧀', '🥛', '🍞', '🥚', '🍗', '🥒', '🍊'][i % 12],
  }));

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
        <BlurView intensity={90} style={{ paddingTop: insets.top }}>
          <View style={{ paddingHorizontal: 22, paddingVertical: 14 }}>
            <Pressable
              onPress={() => router.back()}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: C['surface/raised'],
                borderWidth: 1,
                borderColor: C['border/subtle'],
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 12,
              }}
            >
              <Text fontSize={18}>‹</Text>
            </Pressable>
            <Text
              fontSize={28}
              fontWeight="800"
              color={C['text/primary']}
              letterSpacing={-0.8}
              fontFamily="Fraunces"
            >
              Photo Gallery
            </Text>
          </View>
        </BlurView>

        {/* === Content === */}
        <View style={{ paddingHorizontal: 22, paddingVertical: 20 }}>
          {/* Grid of photos */}
          <View style={{ gap: 12 }}>
            {Array.from({ length: Math.ceil(photos.length / 3) }, (_, row) => (
              <View key={row} style={{ flexDirection: 'row', gap: 12 }}>
                {photos.slice(row * 3, (row + 1) * 3).map((photo) => (
                  <Pressable
                    key={photo.id}
                    onPress={() => router.push('/lightbox')}
                    style={{
                      flex: 1,
                      aspectRatio: 1,
                      backgroundColor: C['surface/raised'],
                      borderRadius: 22,
                      borderWidth: 1,
                      borderColor: C['border/subtle'],
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <Text fontSize={48}>{photo.emoji}</Text>
                  </Pressable>
                ))}
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
