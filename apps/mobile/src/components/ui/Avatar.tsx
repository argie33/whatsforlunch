import React from 'react';
import { YStack, Image, Text } from 'tamagui';

export type AvatarSize = 28 | 36 | 44 | 64;

interface AvatarProps {
  uri?: string;
  initials?: string;
  size?: AvatarSize;
  online?: boolean;
}

export function Avatar({
  uri,
  initials,
  size = 44,
  online = false,
}: AvatarProps) {
  return (
    <YStack position="relative">
      {uri ? (
        <Image
          source={{ uri }}
          width={size}
          height={size}
          borderRadius={size}
        />
      ) : (
        <YStack
          width={size}
          height={size}
          borderRadius={size}
          backgroundColor="$brand/primaryMuted"
          justifyContent="center"
          alignItems="center"
        >
          <Text
            fontSize={size / 2.5}
            fontWeight="bold"
            color="$brand/primary"
          >
            {initials}
          </Text>
        </YStack>
      )}
      {online && (
        <YStack
          position="absolute"
          bottom={0}
          right={0}
          width={size / 4}
          height={size / 4}
          borderRadius={size / 8}
          backgroundColor="$status/fresh"
          borderWidth={2}
          borderColor="$surface/raised"
        />
      )}
    </YStack>
  );
}
