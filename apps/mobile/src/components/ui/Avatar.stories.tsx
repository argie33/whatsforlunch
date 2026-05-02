import React from 'react';
import { Meta, StoryObj } from '@storybook/react-native';
import { Avatar } from './Avatar';
import { XStack } from 'tamagui';

const meta = {
  title: 'Components/Avatar',
  component: Avatar,
  args: {
    initials: 'JD',
    size: 44,
    online: false,
    name: 'John Doe',
  },
} satisfies Meta<typeof Avatar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithImage: Story = {
  args: {
    uri: 'https://www.gravatar.com/avatar/05dfd4b41a2394fb359e0ebbebce38f5?s=44&d=identicon',
    name: 'Jane Smith',
  },
};

export const Online: Story = {
  args: {
    online: true,
  },
};

export const OnlineWithImage: Story = {
  args: {
    uri: 'https://www.gravatar.com/avatar/b58996c504c5638798eb6b511e6f49af?s=44&d=identicon',
    online: true,
    name: 'Active User',
  },
};

export const SmallSize: Story = {
  args: {
    size: 28,
  },
};

export const MediumSize: Story = {
  args: {
    size: 36,
  },
};

export const LargeSize: Story = {
  args: {
    size: 64,
  },
};

export const AllSizes: Story = {
  render: () => (
    <XStack gap="$4" alignItems="center">
      <Avatar size={28} initials="SM" name="Small" />
      <Avatar size={36} initials="MD" name="Medium" />
      <Avatar size={44} initials="LG" name="Large" />
      <Avatar size={64} initials="XL" name="Extra Large" />
    </XStack>
  ),
};
