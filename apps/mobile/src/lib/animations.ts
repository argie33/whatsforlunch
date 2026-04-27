import { useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';
import Animated from 'react-native-reanimated';
import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

export const springConfig = {
  damping: 15,
  mass: 1,
  stiffness: 150,
  overshootClamping: false,
  restSpeedThreshold: 2,
  restDisplacementThreshold: 2,
};

// Detect user's reduce motion preference
export function useReduceMotionEnabled() {
  const [reduceMotionEnabled, setReduceMotionEnabled] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then(setReduceMotionEnabled)
      .catch(() => setReduceMotionEnabled(false));
  }, []);

  return reduceMotionEnabled;
}

// Fade in animation (respects reduce motion)
export function useFadeInAnimation(isVisible: boolean) {
  const reduceMotion = useReduceMotionEnabled();
  const opacity = new Animated.Value(isVisible ? 1 : 0);

  return useAnimatedStyle(() => {
    if (reduceMotion) {
      return { opacity: isVisible ? 1 : 0 };
    }
    return {
      opacity: isVisible ? withTiming(1, { duration: 300 }) : withTiming(0, { duration: 300 }),
    };
  });
}

// Scale animation (respects reduce motion)
export function useScaleAnimation(isActive: boolean) {
  const reduceMotion = useReduceMotionEnabled();
  const scale = new Animated.Value(isActive ? 1 : 0.9);

  return useAnimatedStyle(() => {
    if (reduceMotion) {
      return {
        transform: [{ scale: isActive ? 1 : 0.9 }],
      };
    }
    return {
      transform: [
        {
          scale: isActive ? withSpring(1, springConfig) : withSpring(0.9, springConfig),
        },
      ],
    };
  });
}

// Slide in from bottom (respects reduce motion)
export function useSlideUpAnimation(isVisible: boolean) {
  const reduceMotion = useReduceMotionEnabled();
  const translateY = new Animated.Value(isVisible ? 0 : 100);

  return useAnimatedStyle(() => {
    if (reduceMotion) {
      return {
        transform: [{ translateY: isVisible ? 0 : 100 }],
        opacity: isVisible ? 1 : 0,
      };
    }
    return {
      transform: [
        {
          translateY: isVisible ? withSpring(0, springConfig) : withSpring(100, springConfig),
        },
      ],
      opacity: isVisible ? withTiming(1, { duration: 300 }) : withTiming(0, { duration: 300 }),
    };
  });
}

// Rotate animation (respects reduce motion)
export function useRotateAnimation(isRotated: boolean) {
  const reduceMotion = useReduceMotionEnabled();
  const rotation = new Animated.Value(isRotated ? 1 : 0);

  return useAnimatedStyle(() => {
    if (reduceMotion) {
      return {
        transform: [{ rotate: `${isRotated ? 180 : 0}deg` }],
      };
    }
    return {
      transform: [
        {
          rotate: `${isRotated ? withTiming(180, { duration: 300 }) : withTiming(0, { duration: 300 })}deg`,
        },
      ],
    };
  });
}
