import React, { useState } from 'react';
import { YStack, XStack, Text, View } from 'tamagui';
import { ScrollView, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '@/components/ui';
import { lightTheme } from '@/theme/tokens';

const C = lightTheme;
const { width } = Dimensions.get('window');

const slides = [
  {
    emoji: '🥗',
    title: "Track What's Fresh",
    description: 'Add items with expiry dates and get notified before they spoil.',
  },
  {
    emoji: '♻️',
    title: 'Reduce Waste',
    description: 'See what you have and use items before they expire.',
  },
  {
    emoji: '👨‍🍳',
    title: 'Cook Smarter',
    description: 'Get recipe suggestions based on what you need to use.',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const [currentSlide, setCurrentSlide] = useState(0);
  const scrollRef = React.useRef<ScrollView>(null);

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
      scrollRef.current?.scrollTo({
        x: (currentSlide + 1) * width,
        animated: true,
      });
    } else {
      router.replace('/(auth)/auth');
    }
  };

  const slide = slides[currentSlide];

  return (
    <YStack flex={1} backgroundColor={C['surface/base']}>
      {/* Carousel */}
      <ScrollView
        ref={scrollRef}
        scrollEnabled={false}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        style={{ flex: 1 }}
      >
        {slides.map((s, idx) => (
          <YStack
            key={idx}
            width={width}
            justifyContent="center"
            alignItems="center"
            paddingHorizontal={24}
            gap={24}
          >
            <Text fontSize={80}>{s.emoji}</Text>
            <YStack alignItems="center" gap={12}>
              <Text
                fontSize={28}
                fontWeight="800"
                letterSpacing={-0.8}
                color={C['text/primary']}
                textAlign="center"
                fontFamily="$serif"
              >
                {s.title}
              </Text>
              <Text fontSize={16} lineHeight={23} color={C['text/secondary']} textAlign="center">
                {s.description}
              </Text>
            </YStack>
          </YStack>
        ))}
      </ScrollView>

      {/* Dots Indicator */}
      <XStack justifyContent="center" gap={8} paddingVertical={20}>
        {slides.map((_, idx) => (
          <View
            key={idx}
            width={8}
            height={8}
            borderRadius={4}
            backgroundColor={idx === currentSlide ? C['brand/primary'] : C['border/subtle']}
          />
        ))}
      </XStack>

      {/* Next Button */}
      <YStack paddingHorizontal={24} paddingBottom={32}>
        <Button variant="primary" size="lg" full onPress={handleNext}>
          {currentSlide === slides.length - 1 ? 'Get Started' : 'Next'}
        </Button>
      </YStack>
    </YStack>
  );
}
