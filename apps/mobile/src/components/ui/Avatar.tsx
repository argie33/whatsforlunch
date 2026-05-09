import React from 'react';
import { YStack, Image, Text, View } from 'tamagui';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { lightTheme } from '@/theme/tokens';

const C = lightTheme;

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
        <View
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            overflow: 'hidden',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <LinearGradient
            colors={[C['brand/primary'], C['brand/primaryLight']]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }}
          />
          <Text
            fontSize={size / 2.5}
            fontWeight="bold"
            color="white"
            style={{ position: 'relative', zIndex: 1 }}
          >
            {initials}
          </Text>
        </View>
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
