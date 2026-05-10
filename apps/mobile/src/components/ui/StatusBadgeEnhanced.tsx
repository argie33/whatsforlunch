import React from 'react';
import { View } from 'react-native';
import { Text } from 'tamagui';
import { lightTheme } from '@/theme/tokens';

const C = lightTheme;

export type BadgeStatus = 'fresh' | 'soon' | 'urgent' | 'expired';
export type BadgeSize = 'sm' | 'md' | 'lg';
export type BadgeStyle = 'filled' | 'outline';

export interface StatusBadgeProps {
  status: BadgeStatus;
  size?: BadgeSize;
  style?: BadgeStyle;
  children?: React.ReactNode;
}

const statusColors = {
  fresh: {
    bg: C['status/freshBg'],
    text: C['status/fresh'],
    label: 'Fresh',
  },
  soon: {
    bg: C['status/soonBg'],
    text: C['status/soon'],
    label: 'Soon',
  },
  urgent: {
    bg: C['status/urgentBg'],
    text: C['status/urgent'],
    label: 'Urgent',
  },
  expired: {
    bg: C['status/expiredBg'],
    text: C['status/expired'],
    label: 'Expired',
  },
};

const sizeMap = {
  sm: { fontSize: 10, paddingVertical: 4, paddingHorizontal: 8 },
  md: { fontSize: 11, paddingVertical: 5, paddingHorizontal: 10 },
  lg: { fontSize: 12, paddingVertical: 6, paddingHorizontal: 12 },
};

export function StatusBadge({
  status,
  size = 'md',
  style: badgeStyle = 'filled',
  children,
}: StatusBadgeProps) {
  const colors = statusColors[status];
  const sizeStyle = sizeMap[size];

  return (
    <View
      style={{
        paddingVertical: sizeStyle.paddingVertical,
        paddingHorizontal: sizeStyle.paddingHorizontal,
        borderRadius: 9999,
        backgroundColor: badgeStyle === 'filled' ? colors.bg : 'transparent',
        borderWidth: badgeStyle === 'outline' ? 1 : 0,
        borderColor: badgeStyle === 'outline' ? colors.text : undefined,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Text
        fontSize={sizeStyle.fontSize}
        fontWeight="700"
        color={colors.text}
        letterSpacing={0.4}
        textTransform="uppercase"
      >
        {children || colors.label}
      </Text>
    </View>
  );
}
