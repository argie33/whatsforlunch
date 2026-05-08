import React from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { Text, YStack } from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import { lightTheme } from '@/theme/tokens';
import { R } from '@/theme/tokens';
import { Button } from '@/components/ui/Button';

const C = lightTheme;

export default function ShareRecipeScreen() {
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
            <Text
              fontSize={28}
              fontWeight="800"
              color={C['text/primary']}
              letterSpacing={-0.8}
              fontFamily="Fraunces"
            >
              Share Recipe
            </Text>
          </View>
        </BlurView>

        {/* === Content === */}
        <View style={{ paddingHorizontal: 22, paddingVertical: 20, gap: 20 }}>
          {/* Recipe Card */}
          <View
            style={{
              backgroundColor: C['surface/raised'],
              borderRadius: 20,
              padding: 16,
              borderWidth: 1,
              borderColor: C['border/subtle'],
            }}
          >
            <Text fontSize={32} marginBottom={12}>
              🥗
            </Text>
            <Text
              fontSize={20}
              fontWeight="700"
              color={C['text/primary']}
              marginBottom={4}
              fontFamily="Fraunces"
            >
              Greek Salad
            </Text>
            <Text fontSize={13} color={C['text/secondary']}>
              Quick & healthy • 15 min
            </Text>
          </View>

          {/* Share Options */}
          <View>
            <Text
              fontSize={12}
              fontWeight="800"
              color={C['text/secondary']}
              letterSpacing={1.5}
              marginBottom={12}
            >
              SHARE WITH
            </Text>
            <YStack gap={8}>
              {[
                { icon: '👤', name: 'Sarah', subtitle: 'Family' },
                { icon: '👥', name: 'All family', subtitle: '4 members' },
                { icon: '📱', name: 'Copy link', subtitle: 'Share with anyone' },
              ].map((option, idx) => (
                <Pressable
                  key={idx}
                  onPress={() => {}}
                  style={{
                    backgroundColor: C['surface/raised'],
                    borderRadius: 16,
                    padding: 14,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    borderWidth: 1,
                    borderColor: C['border/subtle'],
                  }}
                >
                  <Text fontSize={20}>{option.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text fontSize={15} fontWeight="600" color={C['text/primary']}>
                      {option.name}
                    </Text>
                    <Text fontSize={12} color={C['text/secondary']}>
                      {option.subtitle}
                    </Text>
                  </View>
                  <Text fontSize={22} color={C['text/tertiary']}>
                    ›
                  </Text>
                </Pressable>
              ))}
            </YStack>
          </View>

          {/* Sharing Settings */}
          <View
            style={{
              backgroundColor: C['surface/raised'],
              borderRadius: 20,
              padding: 16,
              borderWidth: 1,
              borderColor: C['border/subtle'],
            }}
          >
            <Text fontSize={14} fontWeight="700" color={C['text/primary']} marginBottom={12}>
              Allow editing
            </Text>
            <Text fontSize={13} color={C['text/secondary']}>
              Recipients can modify and save their own version
            </Text>
          </View>

          {/* Action */}
          <Button variant="secondary" size="lg" full onPress={() => router.back()}>
            Close
          </Button>
        </View>
      </ScrollView>
    </View>
  );
}
