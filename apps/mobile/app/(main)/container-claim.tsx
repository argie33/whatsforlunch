import React from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { Text, YStack } from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import { lightTheme } from '@/theme/tokens';
import { Button } from '@/components/ui/Button';

const C = lightTheme;

export default function ContainerClaimScreen() {
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
              Claim Container
            </Text>
          </View>
        </BlurView>

        {/* === Content === */}
        <View style={{ paddingHorizontal: 22, paddingVertical: 20, gap: 20 }}>
          {/* Icon */}
          <View
            style={{
              alignItems: 'center',
              paddingVertical: 20,
            }}
          >
            <Text fontSize={80}>📦</Text>
          </View>

          {/* Description */}
          <YStack gap={8}>
            <Text
              fontSize={24}
              fontWeight="800"
              color={C['text/primary']}
              letterSpacing={-0.4}
              fontFamily="Fraunces"
              textAlign="center"
            >
              New container detected
            </Text>
            <Text fontSize={14} color={C['text/secondary']} textAlign="center" lineHeight={20}>
              A smart container has been added to your household. Assign it to a location.
            </Text>
          </YStack>

          {/* Container Details */}
          <View
            style={{
              backgroundColor: C['surface/raised'],
              borderRadius: 22,
              padding: 16,
              borderWidth: 1,
              borderColor: C['border/subtle'],
              gap: 12,
            }}
          >
            {[
              { label: 'Container ID', value: 'SC-4B7K2' },
              { label: 'Type', value: 'Smart Fridge Drawer' },
              { label: 'Added by', value: 'Family Account' },
            ].map((item, idx) => (
              <View
                key={idx}
                style={{
                  paddingBottom: idx < 2 ? 12 : 0,
                  borderBottomWidth: idx < 2 ? 1 : 0,
                  borderBottomColor: C['border/subtle'],
                }}
              >
                <Text fontSize={12} color={C['text/secondary']} fontWeight="600" marginBottom={4}>
                  {item.label}
                </Text>
                <Text fontSize={15} fontWeight="700" color={C['text/primary']}>
                  {item.value}
                </Text>
              </View>
            ))}
          </View>

          {/* Location Selection */}
          <View>
            <Text
              fontSize={12}
              color={C['text/secondary']}
              fontWeight="600"
              marginBottom={8}
              marginLeft={4}
            >
              ASSIGN TO
            </Text>
            <YStack gap={8}>
              {[
                { emoji: '🍳', name: 'Main Fridge' },
                { emoji: '❄️', name: 'Freezer' },
                { emoji: '🥔', name: 'Pantry' },
              ].map((location, idx) => (
                <Pressable
                  key={idx}
                  onPress={() => {}}
                  style={{
                    backgroundColor: C['surface/raised'],
                    borderRadius: 16,
                    padding: 14,
                    flexDirection: 'row',
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: C['border/subtle'],
                    gap: 12,
                  }}
                >
                  <Text fontSize={20}>{location.emoji}</Text>
                  <Text fontSize={15} fontWeight="600" color={C['text/primary']}>
                    {location.name}
                  </Text>
                </Pressable>
              ))}
            </YStack>
          </View>

          {/* Action */}
          <Button variant="secondary" size="lg" full onPress={() => router.back()}>
            Skip for now
          </Button>
        </View>
      </ScrollView>
    </View>
  );
}
