import React from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { Text, YStack } from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import { lightTheme } from '@/theme/tokens';
import { Button } from '@/components/ui/Button';

const C = lightTheme;

export default function VoiceScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const commands = [
    { example: '"Add broccoli to the fridge"', description: 'Add an item to a container' },
    { example: '"What\'s expiring soon?"', description: 'Check upcoming expirations' },
    { example: '"Show my shopping list"', description: 'Access your shopping list' },
    { example: '"Mark milk as used"', description: 'Mark items as consumed' },
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
              Voice Commands
            </Text>
          </View>
        </BlurView>

        {/* === Content === */}
        <View style={{ paddingHorizontal: 22, paddingVertical: 20, gap: 20 }}>
          {/* Status */}
          <View
            style={{
              alignItems: 'center',
              paddingVertical: 20,
            }}
          >
            <View
              style={{
                width: 80,
                height: 80,
                borderRadius: 40,
                backgroundColor: C['brand/soft'],
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Text fontSize={40}>🎤</Text>
            </View>
          </View>

          {/* Title & Subtitle */}
          <YStack gap={8}>
            <Text
              fontSize={24}
              fontWeight="800"
              color={C['text/primary']}
              letterSpacing={-0.4}
              fontFamily="Fraunces"
              textAlign="center"
            >
              Voice Commands
            </Text>
            <Text fontSize={14} color={C['text/secondary']} textAlign="center" lineHeight={20}>
              Control your fridge hands-free using voice commands.
            </Text>
          </YStack>

          {/* Example Commands */}
          <View>
            <Text
              fontSize={12}
              fontWeight="800"
              color={C['text/secondary']}
              letterSpacing={1.5}
              marginBottom={12}
            >
              TRY SAYING
            </Text>
            <YStack gap={8}>
              {commands.map((command, idx) => (
                <View
                  key={idx}
                  style={{
                    backgroundColor: C['surface/raised'],
                    borderRadius: 16,
                    padding: 12,
                    borderWidth: 1,
                    borderColor: C['border/subtle'],
                  }}
                >
                  <Text
                    fontSize={13}
                    fontWeight="600"
                    color={C['brand/primary']}
                    marginBottom={4}
                    fontFamily="monospace"
                  >
                    {command.example}
                  </Text>
                  <Text fontSize={12} color={C['text/secondary']}>
                    {command.description}
                  </Text>
                </View>
              ))}
            </YStack>
          </View>

          {/* CTA Buttons */}
          <YStack gap={10}>
            <Button variant="primary" size="lg" full onPress={() => {}}>
              Start listening
            </Button>
            <Button variant="secondary" size="lg" full onPress={() => router.back()}>
              Close
            </Button>
          </YStack>
        </View>
      </ScrollView>
    </View>
  );
}
