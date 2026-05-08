import React from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { Text } from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import { lightTheme } from '@/theme/tokens';
import { R } from '@/theme/tokens';

const C = lightTheme;

export default function LightboxScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

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
          </View>
        </BlurView>

        {/* === Full Screen Image === */}
        <View
          style={{
            paddingHorizontal: 22,
            paddingVertical: 20,
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 400,
          }}
        >
          <View
            style={{
              width: '100%',
              aspectRatio: 1,
              backgroundColor: C['surface/raised'],
              borderRadius: 32,
              borderWidth: 1,
              borderColor: C['border/subtle'],
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 20,
            }}
          >
            <Text fontSize={120}>🥗</Text>
          </View>

          {/* Image Info */}
          <View
            style={{
              backgroundColor: C['surface/raised'],
              borderRadius: 20,
              padding: 16,
              borderWidth: 1,
              borderColor: C['border/subtle'],
              width: '100%',
            }}
          >
            <Text
              fontSize={16}
              fontWeight="700"
              color={C['text/primary']}
              marginBottom={4}
              fontFamily="Fraunces"
            >
              Green Salad Mix
            </Text>
            <Text fontSize={13} color={C['text/secondary']} marginBottom={8}>
              Captured 2 days ago
            </Text>
            <Text fontSize={13} color={C['text/secondary']}>
              Added to Fridge • Expires Mar 15, 2026
            </Text>
          </View>
        </View>

        {/* === Actions === */}
        <View style={{ paddingHorizontal: 22, gap: 10 }}>
          <Pressable
            onPress={() => {}}
            style={{
              backgroundColor: C['surface/raised'],
              borderRadius: 16,
              padding: 14,
              alignItems: 'center',
              borderWidth: 1,
              borderColor: C['border/subtle'],
            }}
          >
            <Text fontSize={15} fontWeight="700" color={C['text/primary']}>
              Share
            </Text>
          </Pressable>
          <Pressable
            onPress={() => {}}
            style={{
              backgroundColor: C['surface/raised'],
              borderRadius: 16,
              padding: 14,
              alignItems: 'center',
              borderWidth: 1,
              borderColor: C['status/urgent'],
            }}
          >
            <Text fontSize={15} fontWeight="700" color={C['status/urgent']}>
              Delete
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
