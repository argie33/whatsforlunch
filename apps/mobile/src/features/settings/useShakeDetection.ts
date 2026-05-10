import { useEffect, useRef } from 'react';
import { DeviceEventEmitter, Platform } from 'react-native';
import { Accelerometer } from 'expo-sensors';

const SHAKE_THRESHOLD = 2.5; // G-force delta that counts as a shake
const SHAKE_DEBOUNCE_MS = 1500;

export function useShakeDetection(onShake: () => void): void {
  const lastShakeRef = useRef(0);

  useEffect(() => {
    // iOS Simulator fallback (Device menu → Shake / Cmd+Ctrl+Z)
    if (Platform.OS === 'ios') {
      const simSub = DeviceEventEmitter.addListener('shake', () => {
        const now = Date.now();
        if (now - lastShakeRef.current < SHAKE_DEBOUNCE_MS) return;
        lastShakeRef.current = now;
        onShake();
      });

      // Real-device accelerometer detection (also covers iOS physical device)
      Accelerometer.setUpdateInterval(100);
      let prevMag = 0;
      const accelSub = Accelerometer.addListener(({ x, y, z }) => {
        const mag = Math.sqrt(x * x + y * y + z * z);
        const delta = Math.abs(mag - prevMag);
        prevMag = mag;
        if (delta > SHAKE_THRESHOLD) {
          const now = Date.now();
          if (now - lastShakeRef.current < SHAKE_DEBOUNCE_MS) return;
          lastShakeRef.current = now;
          onShake();
        }
      });

      return () => {
        simSub.remove();
        accelSub.remove();
      };
    }

    // Android: accelerometer only
    Accelerometer.setUpdateInterval(100);
    let prevMag = 0;
    const accelSub = Accelerometer.addListener(({ x, y, z }) => {
      const mag = Math.sqrt(x * x + y * y + z * z);
      const delta = Math.abs(mag - prevMag);
      prevMag = mag;
      if (delta > SHAKE_THRESHOLD) {
        const now = Date.now();
        if (now - lastShakeRef.current < SHAKE_DEBOUNCE_MS) return;
        lastShakeRef.current = now;
        onShake();
      }
    });

    return () => accelSub.remove();
  }, [onShake]);
}
