import React from 'react';
import { YStack, Image, Text } from 'tamagui';
import { useTranslation } from 'react-i18next';

export type AvatarSize = 28 | 36 | 44 | 64;

interface AvatarProps {
  uri?: string;
  initials?: string;
  size?: AvatarSize;
  online?: boolean;
  name?: string;
}

export function Avatar({
  uri,
  initials,
  size = 44,
  online = false,
  name,
}: AvatarProps) {
  const { t } = useTranslation();
  const a11yLabel = name
    ? t('accessibility.profilePhoto', { name })
    : t('accessibility.userAvatar');
  const onlineStatus = online ? `, ${t('common.online')}` : '';

  return (
    <YStack
      position="relative"
      accessibilityLabel={a11yLabel + onlineStatus}
      accessible
    >
      {uri ? (
        <Image
          source={{ uri }}
          width={size}
          height={size}
          borderRadius={size}
          accessible={false}
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
