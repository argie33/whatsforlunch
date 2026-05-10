import React from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { Text, YStack, XStack } from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import { lightTheme } from '@/theme/tokens';
import { R } from '@/theme/tokens';

const C = lightTheme;

export default function A11yScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const accessibilitySettings = [
    { icon: '👁️', title: 'Display', subtitle: 'Text size, colors' },
    { icon: '🔊', title: 'Sound & haptics', subtitle: 'Feedback options' },
    { icon: '🎯', title: 'Motion', subtitle: 'Animation speed' },
    { icon: '⌨️', title: 'Keyboard', subtitle: 'Navigation options' },
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
              Accessibility
            </Text>
          </View>
        </BlurView>

        {/* === Content === */}
        <View style={{ paddingHorizontal: 22, paddingVertical: 20, gap: 16 }}>
          {/* Info */}
          <View
            style={{
              backgroundColor: C['surface/raised'],
              borderRadius: 20,
              padding: 16,
              borderWidth: 1,
              borderColor: C['border/subtle'],
            }}
          >
            <Text fontSize={14} color={C['text/secondary']} lineHeight={20}>
              Make the app work better for you with customized accessibility settings.
            </Text>
          </View>

          {/* Settings List */}
          <View
            style={{
              backgroundColor: C['surface/raised'],
              borderRadius: 32,
              borderWidth: 1,
              borderColor: C['border/subtle'],
              overflow: 'hidden',
            }}
          >
            {accessibilitySettings.map((setting, idx) => (
              <Pressable
                key={idx}
                onPress={() => {}}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: 14,
                  paddingHorizontal: 16,
                  gap: 14,
                  borderBottomWidth: idx < accessibilitySettings.length - 1 ? 1 : 0,
                  borderBottomColor: C['border/subtle'],
                }}
              >
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 14,
                    backgroundColor: C['brand/soft'],
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Text fontSize={22}>{setting.icon}</Text>
                </View>
                <YStack flex={1}>
                  <Text fontSize={16} fontWeight="600" color={C['text/primary']}>
                    {setting.title}
                  </Text>
                  <Text fontSize={13} color={C['text/secondary']} marginTop={2}>
                    {setting.subtitle}
                  </Text>
                </YStack>
                <Text fontSize={22} color={C['text/tertiary']}>
                  ›
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
