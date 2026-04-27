import { useEffect } from 'react';
import { DeviceEventEmitter, Platform } from 'react-native';

export function useShakeDetection(onShake: () => void): void {
  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    // iOS Simulator: Device menu → Shake (Cmd+Ctrl+Z)
    const sub = DeviceEventEmitter.addListener('shake', onShake);
    return () => sub.remove();
  }, [onShake]);
}
