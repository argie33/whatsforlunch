import React from 'react';
import { Meta, StoryObj } from '@storybook/react-native';
import { Tag } from './Tag';
import { XStack, YStack } from 'tamagui';

const meta = {
  title: 'Components/Tag',
  component: Tag,
  args: {
    label: 'Sample Tag',
    selected: false,
  },
} satisfies Meta<typeof Tag>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Selected: Story = {
  args: {
    selected: true,
  },
};

export const Removable: Story = {
  args: {
    onRemove: () => alert('Remove tag'),
  },
};

export const RemovableSelected: Story = {
  args: {
    selected: true,
    onRemove: () => alert('Remove tag'),
  },
};

export const WithStatus: Story = {
  args: {
    label: 'Fresh Items',
    status: 'fresh',
  },
};

export const StatusFresh: Story = {
  args: {
    label: 'Fresh',
    status: 'fresh',
  },
};

export const StatusSoon: Story = {
  args: {
    label: 'Use Soon',
    status: 'soon',
  },
};

export const StatusUrgent: Story = {
  args: {
    label: 'Eat Today',
    status: 'urgent',
  },
};

export const StatusExpired: Story = {
  args: {
    label: 'Expired',
    status: 'expired',
  },
};

export const AllStatuses: Story = {
  render: () => (
    <XStack gap="$3" flexWrap="wrap" padding="$4">
      <Tag label="Fresh" status="fresh" />
      <Tag label="Soon" status="soon" />
      <Tag label="Urgent" status="urgent" />
      <Tag label="Expired" status="expired" />
    </XStack>
  ),
};

export const WithRemoval: Story = {
  render: () => (
    <YStack gap="$2">
      <Tag label="Dairy" onRemove={() => alert('Remove')} />
      <Tag label="Vegetables" onRemove={() => alert('Remove')} />
      <Tag label="Frozen" onRemove={() => alert('Remove')} />
    </YStack>
  ),
};
