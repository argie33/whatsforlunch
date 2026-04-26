import { useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';
import Animated from 'react-native-reanimated';

// Default spring config for smooth, natural motion
export const springConfig = {
  damping: 15,
  mass: 1,
  stiffness: 150,
  overshootClamping: false,
  restSpeedThreshold: 2,
  restDisplacementThreshold: 2,
};

// Fade in animation
export function useFadeInAnimation(isVisible: boolean) {
  const opacity = new Animated.Value(isVisible ? 1 : 0);

  return useAnimatedStyle(() => ({
    opacity: isVisible ? withTiming(1, { duration: 300 }) : withTiming(0, { duration: 300 }),
  }));
}

// Scale animation
export function useScaleAnimation(isActive: boolean) {
  const scale = new Animated.Value(isActive ? 1 : 0.9);

  return useAnimatedStyle(() => ({
    transform: [
      {
        scale: isActive ? withSpring(1, springConfig) : withSpring(0.9, springConfig),
      },
    ],
  }));
}

// Slide in from bottom
export function useSlideUpAnimation(isVisible: boolean) {
  const translateY = new Animated.Value(isVisible ? 0 : 100);

  return useAnimatedStyle(() => ({
    transform: [
      {
        translateY: isVisible ? withSpring(0, springConfig) : withSpring(100, springConfig),
      },
    ],
    opacity: isVisible ? withTiming(1, { duration: 300 }) : withTiming(0, { duration: 300 }),
  }));
}

// Rotate animation
export function useRotateAnimation(isRotated: boolean) {
  const rotation = new Animated.Value(isRotated ? 1 : 0);

  return useAnimatedStyle(() => ({
    transform: [
      {
        rotate: `${isRotated ? withTiming(180, { duration: 300 }) : withTiming(0, { duration: 300 })}deg`,
      },
    ],
  }));
}
