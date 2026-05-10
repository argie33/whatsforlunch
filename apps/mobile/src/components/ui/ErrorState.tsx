import React from 'react';
import { YStack, Text, XStack } from 'tamagui';
import { AlertCircle } from 'lucide-react-native';
import { lightTheme } from '@/theme/tokens';
import { Button } from './Button';

const C = lightTheme;

interface ErrorStateProps {
  title?: string;
  description: string;
  icon?: React.ReactNode;
  type?: 'error' | 'warning' | 'offline';
  primaryAction?: {
    label: string;
    onPress: () => void;
  };
  secondaryAction?: {
    label: string;
    onPress: () => void;
  };
}

export function ErrorState({
  title = 'Something went wrong',
  description,
  icon,
  type = 'error',
  primaryAction,
  secondaryAction,
}: ErrorStateProps) {
  const getColor = () => {
    switch (type) {
      case 'warning':
        return C['accent/honey'];
      case 'offline':
        return C['text/tertiary'];
      case 'error':
      default:
        return C['status/urgent'];
    }
  };

  const color = getColor();

  return (
    <YStack flex={1} justifyContent="center" alignItems="center" padding="$5" gap="$4">
      {icon ? (
        <YStack marginBottom="$2" accessible={false}>
          {icon}
        </YStack>
      ) : (
        <AlertCircle size={56} color={color} strokeWidth={1.5} />
      )}

      <YStack alignItems="center" gap="$3">
        <Text
          fontSize={20}
          fontWeight="700"
          color={color}
          textAlign="center"
          accessibilityRole="header"
          letterSpacing={-0.3}
        >
          {title}
        </Text>
        <Text fontSize={14} color="$text/secondary" textAlign="center" lineHeight={20}>
          {description}
        </Text>
      </YStack>

      {(primaryAction || secondaryAction) && (
        <YStack gap="$3" width="100%" marginTop="$2">
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
