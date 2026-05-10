import React from 'react';
import { Pressable } from 'react-native';
import { XStack, YStack, Text, Image } from 'tamagui';
import { Icon } from './Icon';

interface ListRowProps {
  title: string;
  subtitle?: string;
  image?: string;
  icon?: string;
  trailing?: React.ReactNode;
  onPress?: () => void;
  accessibilityHint?: string;
}

export function ListRow({
  title,
  subtitle,
  image,
  icon,
  trailing,
  onPress,
  accessibilityHint,
}: ListRowProps) {
  const a11yLabel = subtitle ? `${title}, ${subtitle}` : title;
  return (
    <Pressable
      onPress={onPress}
      style={{ borderRadius: 10 }}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={a11yLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !onPress }}
    >
      <XStack
        paddingHorizontal="$5"
        paddingVertical="$4"
        alignItems="center"
        gap="$4"
        borderBottomWidth={1}
        borderColor="$border/subtle"
        pressStyle={{
          opacity: 0.7,
        }}
      >
        {image && (
          <Image
            source={{ uri: image }}
            width={40}
            height={40}
            borderRadius={8}
            accessible={false}
          />
        )}
        {icon && !image && <Icon name={icon} size={24} color="$text/secondary" />}
        <YStack flex={1}>
          <Text fontSize="$4" fontWeight="600" color="$text/primary">
            {title}
          </Text>
          {subtitle && (
            <Text fontSize="$3" color="$text/secondary" marginTop="$1">
              {subtitle}
            </Text>
          )}
        </YStack>
        {trailing || <Icon name="chevronRight" size={20} color="$text/tertiary" />}
      </XStack>
    </Pressable>
  );
}
