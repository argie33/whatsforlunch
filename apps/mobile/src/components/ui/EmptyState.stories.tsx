import React from 'react';
import { Meta, StoryObj } from '@storybook/react-native';
import { EmptyState } from './EmptyState';
import { YStack } from 'tamagui';

const meta = {
  title: 'Components/EmptyState',
  component: EmptyState,
} satisfies Meta<typeof EmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: 'No items yet',
    description: 'Add your first item to get started',
    primaryAction: {
      label: 'Add Item',
      onPress: () => alert('Add item'),
    },
  },
};

export const WithSecondaryAction: Story = {
  args: {
    title: 'No containers found',
    description: 'Claim your first container to start tracking food',
    primaryAction: {
      label: 'Claim Container',
      onPress: () => alert('Claim'),
    },
    secondaryAction: {
      label: 'Learn More',
      onPress: () => alert('Learn more'),
    },
  },
};

export const NoActions: Story = {
  args: {
    title: 'Processing',
    description: 'Please wait while we load your items',
  },
};

export const WithIllustration: Story = {
  args: {
    title: 'Items have expired',
    description: 'These items are past their expiry date',
    illustration: <YStack width={60} height={60} backgroundColor="$status/expired" borderRadius="$md" />,
    primaryAction: {
      label: 'Clear Expired',
      onPress: () => alert('Clear'),
    },
  },
};

export const ScanFailed: Story = {
  args: {
    title: 'Could not identify item',
    description: 'Try scanning a barcode or take a clearer photo',
    primaryAction: {
      label: 'Try Again',
      onPress: () => alert('Retry'),
    },
    secondaryAction: {
      label: 'Enter Manually',
      onPress: () => alert('Manual entry'),
    },
  },
};
