import React from 'react';
import { XStack, Text } from 'tamagui';
import { useTranslation } from 'react-i18next';
import { Icon } from './Icon';

export type Status = 'fresh' | 'soon' | 'urgent' | 'expired' | 'frozen';
export type BadgeSize = 'sm' | 'md';

interface StatusBadgeProps {
  status: Status;
  size?: BadgeSize;
}

const statusConfig: Record<Status, { color: string; bg: string; icon: string; labelKey: string }> = {
  fresh:   { color: '$status/fresh',   bg: '$status/freshBg',   icon: 'check',        labelKey: 'items.statusFresh'  },
  soon:    { color: '$status/soon',    bg: '$status/soonBg',    icon: 'alert-circle',  labelKey: 'items.statusSoon'   },
  urgent:  { color: '$status/urgent',  bg: '$status/urgentBg',  icon: 'alert-circle',  labelKey: 'items.statusUrgent' },
  expired: { color: '$status/expired', bg: '$status/expiredBg', icon: 'x',             labelKey: 'items.statusExpired'},
  frozen:  { color: '$brand/primary',  bg: '$brand/primaryMuted', icon: 'snowflake',   labelKey: 'items.statusFrozen' },
};

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const { t } = useTranslation();
  const config = statusConfig[status];
  const isSmall = size === 'sm';
  const label = t(config.labelKey);

  return (
    <XStack
      backgroundColor={config.bg}
      paddingHorizontal={isSmall ? '$2' : '$3'}
      paddingVertical={isSmall ? '$1' : '$2'}
      borderRadius="$full"
      alignItems="center"
      gap={isSmall ? '$1' : '$2'}
      accessibilityLabel={label}
      accessibilityRole="status"
    >
      <Icon
        name={config.icon}
        size={isSmall ? 14 : 16}
        color={config.color}
        accessible={false}
      />
      <Text
        fontSize={isSmall ? '$2' : '$3'}
        fontWeight="600"
        color={config.color}
        accessible={false}
      >
        {label}
      </Text>
    </XStack>
  );
}
