import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { YStack, Text } from 'tamagui';
import { lightTheme } from '@/theme/tokens';

const C = lightTheme;

interface LoadingStateProps {
  message?: string;
  size?: 'small' | 'large';
  fullscreen?: boolean;
}

export function LoadingState({ message, size = 'large', fullscreen = true }: LoadingStateProps) {
  const container = fullscreen ? (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <YStack alignItems="center" gap="$3">
        <ActivityIndicator size={size} color={C['brand/primary']} />
        {message && (
          <Text fontSize={14} color="$text/secondary">
            {message}
          </Text>
        )}
      </YStack>
    </View>
  ) : (
    <YStack alignItems="center" gap="$3" padding="$4">
      <ActivityIndicator size={size} color={C['brand/primary']} />
      {message && (
        <Text fontSize={14} color="$text/secondary">
          {message}
        </Text>
      )}
    </YStack>
  );

  return container;
}
