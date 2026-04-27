import { useEffect, useRef } from 'react';
import { DeviceEventEmitter, Platform } from 'react-native';

/**
 * Detects shake gestures and calls onShake.
 *
 * iOS: listens to 'shake' via React Native's DeviceEventEmitter.
 *   Works in simulator via Cmd+Ctrl+Z (Device > Shake).
 * Android: DeviceEventEmitter doesn't fire 'shake' natively.
 *   TODO: add expo-sensors (Accelerometer) for cross-platform production shake.
 */
export function useShakeDetection(onShake: () => void, enabled = true) {
  const callbackRef = useRef(onShake);
  callbackRef.current = onShake;

  useEffect(() => {
    if (!enabled || Platform.OS !== 'ios') return;

    const sub = DeviceEventEmitter.addListener('shake', () => {
      callbackRef.current();
    });

    return () => sub.remove();
  }, [enabled]);
}
