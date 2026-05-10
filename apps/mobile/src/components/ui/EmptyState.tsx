import React from 'react';
import { YStack, Text } from 'tamagui';
import { Button } from './Button';

interface EmptyStateProps {
  title: string;
  description: string;
  illustration?: React.ReactNode;
  primaryAction?: {
    label: string;
    onPress: () => void;
  };
  secondaryAction?: {
    label: string;
    onPress: () => void;
  };
}

export function EmptyState({
  title,
  description,
  illustration,
  primaryAction,
  secondaryAction,
}: EmptyStateProps) {
  return (
    <YStack flex={1} justifyContent="center" alignItems="center" padding="$5" gap="$4">
      {illustration && (
        <YStack marginBottom="$4" accessible={false}>
          {illustration}
        </YStack>
      )}

      <YStack alignItems="center" gap="$3">
        <Text
          fontSize="$6"
          fontWeight="bold"
          color="$text/primary"
          textAlign="center"
          accessibilityRole="header"
        >
          {title}
        </Text>
        <Text fontSize="$4" color="$text/secondary" textAlign="center">
          {description}
        </Text>
      </YStack>

      {(primaryAction || secondaryAction) && (
        <YStack gap="$3" width="100%">
          {primaryAction && (
            <Button variant="primary" size="md" onPress={primaryAction.onPress}>
              {primaryAction.label}
            </Button>
          )}
          {secondaryAction && (
            <Button variant="secondary" size="md" onPress={secondaryAction.onPress}>
              {secondaryAction.label}
            </Button>
          )}
        </YStack>
      )}
    </YStack>
  );
}
