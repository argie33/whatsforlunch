import React, { useState } from 'react';
import { Modal, View, Pressable, Image as RNImage, ScrollView } from 'react-native';
import { Text, XStack, YStack } from 'tamagui';
import { X, ChevronLeft, ChevronRight } from 'lucide-react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { lightTheme } from '@/theme/tokens';

const C = lightTheme;

const AnimatedView = Animated.createAnimatedComponent(View);

export interface LightboxProps {
  images: string[];
  initialIndex?: number;
  onClose?: () => void;
  visible: boolean;
}

export function Lightbox({ images, initialIndex = 0, onClose, visible }: LightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const scale = useSharedValue(1);

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < images.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const currentImage = images[currentIndex];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.95)',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        {/* Close Button */}
        <Pressable
          onPress={onClose}
          style={{
            position: 'absolute',
            top: 60,
            right: 22,
            zIndex: 100,
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: 'rgba(255,255,255,0.15)',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <X size={24} color="white" strokeWidth={2} />
        </Pressable>

        {/* Image Counter */}
        {images.length > 1 && (
          <View
            style={{
              position: 'absolute',
              top: 60,
              left: 22,
              backgroundColor: 'rgba(0,0,0,0.5)',
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 8,
            }}
          >
            <Text fontSize={14} fontWeight="600" color="white">
              {currentIndex + 1} / {images.length}
            </Text>
          </View>
        )}

        {/* Image */}
        <AnimatedView style={[{ width: 300, height: 400 }, animatedStyle]}>
          <RNImage
            source={{ uri: currentImage }}
            style={{
              width: '100%',
              height: '100%',
              resizeMode: 'contain',
              borderRadius: 16,
            }}
          />
        </AnimatedView>

        {/* Navigation Buttons */}
        {images.length > 1 && (
          <XStack position="absolute" bottom={60} gap={16} alignItems="center">
            <Pressable
              onPress={handlePrevious}
              disabled={currentIndex === 0}
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor:
                  currentIndex === 0 ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.2)',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <ChevronLeft
                size={24}
                color={currentIndex === 0 ? 'rgba(255,255,255,0.3)' : 'white'}
                strokeWidth={2}
              />
            </Pressable>

            <Pressable
              onPress={handleNext}
              disabled={currentIndex === images.length - 1}
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor:
                  currentIndex === images.length - 1
                    ? 'rgba(255,255,255,0.1)'
                    : 'rgba(255,255,255,0.2)',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <ChevronRight
                size={24}
                color={currentIndex === images.length - 1 ? 'rgba(255,255,255,0.3)' : 'white'}
                strokeWidth={2}
              />
            </Pressable>
          </XStack>
        )}
      </View>
    </Modal>
  );
}
