import React from 'react';
import { Meta, StoryObj } from '@storybook/react-native';
import { ListRow } from './ListRow';

const meta = {
  title: 'Components/ListRow',
  component: ListRow,
  argTypes: {
    onPress: { action: 'pressed' },
  },
  args: {
    title: 'Item Title',
    subtitle: 'Item subtitle',
  },
} satisfies Meta<typeof ListRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithoutSubtitle: Story = {
  args: {
    title: 'Single Title',
    subtitle: undefined,
  },
};

export const WithIcon: Story = {
  args: {
    title: 'Settings',
    subtitle: 'Manage your preferences',
    icon: 'settings',
  },
};

export const WithImage: Story = {
  args: {
    title: 'Profile',
    subtitle: 'user@example.com',
    image: 'https://via.placeholder.com/40',
  },
};

export const WithCustomTrailing: Story = {
  args: {
    title: 'Notification',
    subtitle: 'You have new messages',
    trailing: <div>Badge</div>,
  },
};

export const Pressable: Story = {
  args: {
    title: 'Pressable Item',
    subtitle: 'Tap to interact',
    onPress: () => alert('Pressed!'),
  },
};
