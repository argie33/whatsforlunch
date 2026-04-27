import React from 'react';
import { Meta, StoryObj } from '@storybook/react-native';
import { Icon } from './Icon';
import { XStack, YStack, Text } from 'tamagui';

const meta = {
  title: 'Components/Icon',
  component: Icon,
  args: {
    name: 'home',
    size: 24,
    color: '$brand/primary',
  },
} satisfies Meta<typeof Icon>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Small: Story = {
  args: {
    size: 16,
  },
};

export const Medium: Story = {
  args: {
    size: 24,
  },
};

export const Large: Story = {
  args: {
    size: 32,
  },
};

export const CommonIcons: Story = {
  render: () => (
    <XStack gap="$4" flexWrap="wrap" padding="$4">
      <YStack alignItems="center" gap="$2">
        <Icon name="home" size={24} color="$text/primary" />
        <Text fontSize="$3">home</Text>
      </YStack>
      <YStack alignItems="center" gap="$2">
        <Icon name="camera" size={24} color="$text/primary" />
        <Text fontSize="$3">camera</Text>
      </YStack>
      <YStack alignItems="center" gap="$2">
        <Icon name="settings" size={24} color="$text/primary" />
        <Text fontSize="$3">settings</Text>
      </YStack>
      <YStack alignItems="center" gap="$2">
        <Icon name="check" size={24} color="$status/fresh" />
        <Text fontSize="$3">check</Text>
      </YStack>
      <YStack alignItems="center" gap="$2">
        <Icon name="trash" size={24} color="$status/urgent" />
        <Text fontSize="$3">trash</Text>
      </YStack>
      <YStack alignItems="center" gap="$2">
        <Icon name="plus" size={24} color="$brand/primary" />
        <Text fontSize="$3">plus</Text>
      </YStack>
    </XStack>
  ),
};

export const WithLabel: Story = {
  args: {
    name: 'check',
    accessibilityLabel: 'Success',
  },
};

export const StatusIcons: Story = {
  render: () => (
    <XStack gap="$4" alignItems="center">
      <Icon name="check" size={24} color="$status/fresh" />
      <Icon name="alert-circle" size={24} color="$status/urgent" />
      <Icon name="x" size={24} color="$status/expired" />
    </XStack>
  ),
};
