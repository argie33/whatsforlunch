import React, { useState } from 'react';
import { View, Pressable } from 'react-native';
import { Text, YStack, XStack } from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInUp,
  FadeOutDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { lightTheme } from '@/theme/tokens';
import { R } from '@/theme/tokens';

const C = lightTheme;

const EXAMPLE_PHRASES = [
  '📱 "Add milk to fridge"',
  '🗣️ "Three eggs expire tomorrow"',
  '📝 "Mark broccoli as eaten"',
  '🛒 "Add tomatoes to shopping list"',
];

export default function VoiceScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const scale = useSharedValue(1);

  React.useEffect(() => {
    if (isListening) {
      scale.value = withRepeat(withTiming(1.2, { duration: 600 }), -1, true);
    } else {
      scale.value = 1;
    }
  }, [isListening]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handleStartListening = () => {
    setIsListening(true);
    setTranscript('');
    // TODO: Call voice recording API
    setTimeout(() => {
      setTranscript('Add organic milk to fridge');
      setIsListening(false);
    }, 3000);
  };

  const handleConfirm = () => {
    // TODO: Process transcript and create item
    router.back();
  };

  if (transcript) {
    return (
      <>
        <Animated.View
          style={{
            flex: 1,
            backgroundColor: C['surface/base'],
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: 22,
          }}
          entering={FadeInUp.duration(300)}
          exiting={FadeOutDown.duration(200)}
        >
          <YStack alignItems="center" gap={24}>
            <Text fontSize={48}>✓</Text>
            <YStack alignItems="center" gap={8}>
              <Text
                fontSize={20}
                fontWeight="800"
                color={C['text/primary']}
                fontFamily="Fraunces"
                textAlign="center"
              >
                Got it!
              </Text>
              <View
                style={{
                  backgroundColor: C['surface/raised'],
                  borderRadius: R.lg,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: C['border/subtle'],
                }}
              >
                <Text fontSize={14} color={C['text/primary']} textAlign="center">
                  {transcript}
                </Text>
              </View>
            </YStack>

            <XStack gap={10}>
              <Pressable
                onPress={() => setTranscript('')}
                style={{
                  flex: 1,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  backgroundColor: C['surface/raised'],
                  borderRadius: R.md,
                  borderWidth: 1,
                  borderColor: C['border/subtle'],
                  alignItems: 'center',
                }}
              >
                <Text fontSize={13} fontWeight="700" color={C['text/primary']}>
                  Try Again
                </Text>
              </Pressable>
              <Pressable
                onPress={handleConfirm}
                style={{
                  flex: 1,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  backgroundColor: C['brand/primary'],
                  borderRadius: R.md,
                  alignItems: 'center',
                }}
              >
                <Text fontSize={13} fontWeight="700" color="white">
                  Confirm
                </Text>
              </Pressable>
            </XStack>
          </YStack>
        </Animated.View>
      </>
    );
  }

  return (
    <>
      <Animated.View
        style={{ flex: 1 }}
        entering={FadeInUp.duration(300)}
        exiting={FadeOutDown.duration(200)}
      >
        <LinearGradient
          colors={['#0E5C3A', '#08402A']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: 22,
            paddingTop: insets.top,
            paddingBottom: insets.bottom,
          }}
        >
          <YStack alignItems="center" gap={40}>
            {/* === Pulsing Mic === */}
            {isListening && (
              <Animated.View style={pulseStyle}>
                <View
                  style={{
                    width: 120,
                    height: 120,
                    borderRadius: 60,
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <View
                    style={{
                      width: 80,
                      height: 80,
                      borderRadius: 40,
                      backgroundColor: 'rgba(255,255,255,0.2)',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <Text fontSize={40}>🎤</Text>
                  </View>
                </View>
              </Animated.View>
            )}

            {!isListening && (
              <Pressable
                onPress={handleStartListening}
                style={{
                  width: 120,
                  height: 120,
                  borderRadius: 60,
                  backgroundColor: 'rgba(255,255,255,0.15)',
                  justifyContent: 'center',
                  alignItems: 'center',
                  borderWidth: 2,
                  borderColor: 'rgba(255,255,255,0.3)',
                }}
              >
                <Text fontSize={40}>🎤</Text>
              </Pressable>
            )}

            {/* === Status Text === */}
            <YStack alignItems="center" gap={8}>
              <Text
                fontSize={24}
                fontWeight="800"
                color="white"
                fontFamily="Fraunces"
                letterSpacing={-0.5}
              >
                {isListening ? 'Listening...' : 'Ready to listen'}
              </Text>
              <Text fontSize={13} color="rgba(255,255,255,0.8)" textAlign="center">
                {isListening ? 'Speak clearly and naturally' : 'Tap the microphone to start'}
              </Text>
            </YStack>

            {/* === Example Phrases === */}
            {!isListening && (
              <YStack gap={10} width="100%">
                <Text fontSize={11} color="rgba(255,255,255,0.7)" letterSpacing={0.3}>
                  EXAMPLE PHRASES
                </Text>
                {EXAMPLE_PHRASES.map((phrase, idx) => (
                  <View
                    key={idx}
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.08)',
                      borderRadius: R.md,
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      borderWidth: 1,
                      borderColor: 'rgba(255,255,255,0.15)',
                    }}
                  >
                    <Text fontSize={12} color="rgba(255,255,255,0.9)">
                      {phrase}
                    </Text>
                  </View>
                ))}
              </YStack>
            )}

            {/* === Close Button === */}
            <Pressable
              onPress={() => router.back()}
              style={{
                paddingHorizontal: 20,
                paddingVertical: 10,
                backgroundColor: 'rgba(255,255,255,0.1)',
                borderRadius: R.full,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.3)',
              }}
            >
              <Text fontSize={12} fontWeight="700" color="white">
                Close
              </Text>
            </Pressable>
          </YStack>
        </LinearGradient>
      </Animated.View>
    </>
  );
}
