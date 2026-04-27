import React, { useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import { XStack, Text } from 'tamagui';
import { Icon } from './Icon';
import type { SyncState } from '../../db/sync';

interface SyncStatusBadgeProps {
  state: SyncState;
}

export function SyncStatusBadge({ state }: SyncStatusBadgeProps) {
  const spinAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (state.status === 'syncing') {
      Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ).start();
    } else {
      spinAnim.stopAnimation();
      spinAnim.setValue(0);
    }
  }, [state.status, spinAnim]);

  const spin = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  if (state.status === 'syncing') {
    return (
      <XStack alignItems="center" gap="$1" opacity={0.7}>
        <Animated.View style={{ transform: [{ rotate: spin }] }}>
          <Icon name="refresh-cw" size={14} color="$text/secondary" />
        </Animated.View>
        <Text fontSize="$2" color="$text/secondary">
          Syncing…
        </Text>
      </XStack>
    );
  }

  if (state.status === 'error') {
    return (
      <XStack alignItems="center" gap="$1">
        <Icon name="wifi-off" size={14} color="$status/urgent" />
        <Text fontSize="$2" color="$status/urgent">
          Sync failed
        </Text>
      </XStack>
    );
  }

  if (state.pendingCount > 0) {
    return (
      <XStack alignItems="center" gap="$1">
        <Icon name="upload" size={14} color="$status/soon" />
        <Text fontSize="$2" color="$status/soon">
          {state.pendingCount} pending
        </Text>
      </XStack>
    );
  }

  // idle + synced — only show a subtle indicator, not always visible
  if (state.lastSyncedAt) {
    return (
      <XStack alignItems="center" gap="$1" opacity={0.5}>
        <Icon name="check" size={12} color="$status/fresh" />
      </XStack>
    );
  }

  return null;
}
