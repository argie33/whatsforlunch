import React from 'react';
import { Meta, StoryObj } from '@storybook/react-native';
import { StatusBadge } from './StatusBadge';
import { XStack } from 'tamagui';

const meta = {
  title: 'Components/StatusBadge',
  component: StatusBadge,
  args: {
    status: 'fresh',
    size: 'md',
  },
  decorators: [
    (Story) => (
      <XStack padding="$4" gap="$4" flexWrap="wrap">
        <Story />
      </XStack>
    ),
  ],
} satisfies Meta<typeof StatusBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Fresh: Story = {
  args: {
    status: 'fresh',
  },
};

export const Soon: Story = {
  args: {
    status: 'soon',
  },
};

export const Urgent: Story = {
  args: {
    status: 'urgent',
  },
};

export const Expired: Story = {
  args: {
    status: 'expired',
  },
};

export const Frozen: Story = {
  args: {
    status: 'frozen',
  },
};

export const SmallSize: Story = {
  args: {
    status: 'fresh',
    size: 'sm',
  },
};

export const AllStatuses: Story = {
  render: () => (
    <XStack gap="$3" flexWrap="wrap">
      <StatusBadge status="fresh" />
      <StatusBadge status="soon" />
      <StatusBadge status="urgent" />
      <StatusBadge status="expired" />
      <StatusBadge status="frozen" />
    </XStack>
  ),
};
