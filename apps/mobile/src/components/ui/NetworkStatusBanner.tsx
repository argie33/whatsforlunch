import React, { useEffect, useState } from 'react';
import { YStack, XStack, Text } from 'tamagui';
import { Wifi, WifiOff } from 'lucide-react-native';
import { lightTheme } from '@/theme/tokens';
import { NetworkMonitor, type NetworkState } from '@/lib/network-resilience';

const C = lightTheme;

interface NetworkStatusBannerProps {
  /**
   * Position of the banner: 'top' for above content, 'bottom' for above tabbar
   * @default 'top'
   */
  position?: 'top' | 'bottom';
}

/**
 * Network status banner that appears when offline.
 * Automatically subscribes to network state changes.
 * Disappears when online.
 */
export function NetworkStatusBanner({ position = 'top' }: NetworkStatusBannerProps) {
  const [networkState, setNetworkState] = useState<NetworkState>({
    isConnected: true,
    isInternetReachable: true,
    type: 'unknown',
  });

  const isOnline = networkState.isConnected && networkState.isInternetReachable !== false;

  useEffect(() => {
    const monitor = NetworkMonitor.getInstance();
    const unsubscribe = monitor.subscribe(setNetworkState);
    return unsubscribe;
  }, []);

  // Only show when offline
  if (isOnline) {
    return null;
  }

  return (
    <YStack
      backgroundColor={C['text/tertiary']}
      paddingHorizontal="$4"
      paddingVertical="$2"
      gap="$2"
      borderBottomWidth={position === 'top' ? 1 : 0}
      borderTopWidth={position === 'bottom' ? 1 : 0}
      borderColor={C['border/subtle']}
      justifyContent="center"
    >
      <XStack alignItems="center" gap="$2">
        <WifiOff size={16} color={C['text/tertiary']} />
        <Text fontSize={13} fontWeight="600" color={C['text/tertiary']}>
          No internet connection
        </Text>
      </XStack>
      <Text fontSize={11} color={C['text/tertiary']} opacity={0.8}>
        Some features may be limited. Changes will sync when you're back online.
      </Text>
    </YStack>
  );
}
