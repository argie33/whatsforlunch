import React from 'react';
import { XStack, Text } from 'tamagui';
import { Icon } from './Icon';

export type Status = 'fresh' | 'soon' | 'urgent' | 'expired' | 'frozen';
export type BadgeSize = 'sm' | 'md';

interface StatusBadgeProps {
  status: Status;
  size?: BadgeSize;
}

const statusConfig = {
  fresh: { color: '$status/fresh', bg: '$status/freshBg', icon: 'check', label: 'Fresh' },
  soon: { color: '$status/soon', bg: '$status/soonBg', icon: 'alert-circle', label: 'Use soon' },
  urgent: { color: '$status/urgent', bg: '$status/urgentBg', icon: 'alert-circle', label: 'Eat today' },
  expired: { color: '$status/expired', bg: '$status/expiredBg', icon: 'x', label: 'Tossed' },
  frozen: { color: '$brand/primary', bg: '$brand/primaryMuted', icon: 'snowflake', label: 'Frozen' },
};

export function StatusBadge({
  status,
  size = 'md',
}: StatusBadgeProps) {
  const config = statusConfig[status];
  const isSmall = size === 'sm';

  return (
    <XStack
      backgroundColor={config.bg}
      paddingHorizontal={isSmall ? '$2' : '$3'}
      paddingVertical={isSmall ? '$1' : '$2'}
      borderRadius="$full"
      alignItems="center"
      gap={isSmall ? '$1' : '$2'}
      accessibilityLabel={config.label}
      accessibilityRole="status"
    >
      <Icon
        name={config.icon}
        size={isSmall ? 14 : 16}
        color={config.color}
      />
      <Text
        fontSize={isSmall ? '$2' : '$3'}
        fontWeight="600"
        color={config.color}
      >
        {config.label}
      </Text>
    </XStack>
  );
}
