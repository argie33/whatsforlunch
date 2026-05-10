import {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';
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

export function useReduceMotionEnabled() {
  const [reduceMotionEnabled, setReduceMotionEnabled] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then(setReduceMotionEnabled)
      .catch(() => setReduceMotionEnabled(false));

    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotionEnabled);
    return () => sub.remove();
  }, []);

  return reduceMotionEnabled;
}

export function useFadeInAnimation(isVisible: boolean) {
  const reduceMotion = useReduceMotionEnabled();
  const opacity = useSharedValue(isVisible ? 1 : 0);

  useEffect(() => {
    opacity.value = reduceMotion
      ? isVisible
        ? 1
        : 0
      : withTiming(isVisible ? 1 : 0, { duration: 300 });
  }, [isVisible, reduceMotion]);

  return useAnimatedStyle(() => ({ opacity: opacity.value }));
}

export function useScaleAnimation(isActive: boolean) {
  const reduceMotion = useReduceMotionEnabled();
  const scale = useSharedValue(isActive ? 1 : 0.9);

  useEffect(() => {
    scale.value = reduceMotion
      ? isActive
        ? 1
        : 0.9
      : withSpring(isActive ? 1 : 0.9, springConfig);
  }, [isActive, reduceMotion]);

  return useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
}

export function useSlideUpAnimation(isVisible: boolean) {
  const reduceMotion = useReduceMotionEnabled();
  const translateY = useSharedValue(isVisible ? 0 : 100);
  const opacity = useSharedValue(isVisible ? 1 : 0);

  useEffect(() => {
    translateY.value = reduceMotion
      ? isVisible
        ? 0
        : 100
      : withSpring(isVisible ? 0 : 100, springConfig);
    opacity.value = reduceMotion
      ? isVisible
        ? 1
        : 0
      : withTiming(isVisible ? 1 : 0, { duration: 300 });
  }, [isVisible, reduceMotion]);

  return useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));
}

export function useRotateAnimation(isRotated: boolean) {
  const reduceMotion = useReduceMotionEnabled();
  const rotation = useSharedValue(isRotated ? 180 : 0);

  useEffect(() => {
    rotation.value = reduceMotion
      ? isRotated
        ? 180
        : 0
      : withTiming(isRotated ? 180 : 0, { duration: 300 });
  }, [isRotated, reduceMotion]);

  return useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));
}

export function useFloatingAnimation() {
  const translateY = useSharedValue(0);

  useEffect(() => {
    translateY.value = withRepeat(
      withSequence(
        withTiming(-12, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
  }, []);

  return useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));
}

export function usePulseAnimation() {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 600, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
  }, []);

  return useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
}

export function useScanLineAnimation() {
  const translateY = useSharedValue(0);

  useEffect(() => {
    translateY.value = withRepeat(
      withSequence(
        withTiming(100, { duration: 2000, easing: Easing.linear }),
        withTiming(0, { duration: 0 }),
      ),
      -1,
      false,
    );
  }, []);

  return useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));
}
