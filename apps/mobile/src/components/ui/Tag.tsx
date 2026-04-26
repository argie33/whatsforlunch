import React from 'react';
import { XStack, Text, Pressable } from 'tamagui';
import { Icon } from './Icon';

interface TagProps {
  label: string;
  onRemove?: () => void;
  selected?: boolean;
  status?: 'fresh' | 'soon' | 'urgent' | 'expired';
}

const statusColors = {
  fresh: { bg: '$status/freshBg', text: '$status/fresh' },
  soon: { bg: '$status/soonBg', text: '$status/soon' },
  urgent: { bg: '$status/urgentBg', text: '$status/urgent' },
  expired: { bg: '$status/expiredBg', text: '$status/expired' },
};

export function Tag({
  label,
  onRemove,
  selected = false,
  status,
}: TagProps) {
  const colors = status ? statusColors[status] : { bg: '$surface/sunken', text: '$text/primary' };

  return (
    <XStack
      backgroundColor={selected ? '$brand/primary' : colors.bg}
      paddingHorizontal="$3"
      paddingVertical="$2"
      borderRadius="$full"
      alignItems="center"
      gap="$2"
    >
      <Text
        fontSize="$3"
        fontWeight="600"
        color={selected ? '$text/inverse' : colors.text}
      >
        {label}
      </Text>
      {onRemove && (
        <Pressable onPress={onRemove}>
          <Icon
            name="x"
            size={16}
            color={selected ? '$text/inverse' : colors.text}
          />
        </Pressable>
      )}
    </XStack>
  );
}
