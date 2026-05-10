import React from 'react';
import { Meta, StoryObj } from '@storybook/react-native';
import { IconButton } from './IconButton';
import { XStack, YStack } from 'tamagui';

const meta = {
  title: 'Components/IconButton',
  component: IconButton,
  args: {
    icon: 'settings',
    size: 'md',
    variant: 'round',
    onPress: () => alert('Pressed'),
  },
} satisfies Meta<typeof IconButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Round: Story = {
  args: {
    variant: 'round',
  },
};

export const Square: Story = {
  args: {
    variant: 'square',
  },
};

export const SmallSize: Story = {
  args: {
    size: 'sm',
  },
};

export const MediumSize: Story = {
  args: {
    size: 'md',
  },
};

export const LargeSize: Story = {
  args: {
    size: 'lg',
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};

export const AllSizes: Story = {
  render: () => (
    <XStack gap="$4" alignItems="center" padding="$4">
      <IconButton icon="settings" size="sm" onPress={() => {}} />
      <IconButton icon="settings" size="md" onPress={() => {}} />
      <IconButton icon="settings" size="lg" onPress={() => {}} />
    </XStack>
  ),
};

export const Variants: Story = {
  render: () => (
    <XStack gap="$4" padding="$4">
      <IconButton icon="settings" variant="round" onPress={() => {}} />
      <IconButton icon="settings" variant="square" onPress={() => {}} />
    </XStack>
  ),
};

export const CommonIcons: Story = {
  render: () => (
    <XStack gap="$2" flexWrap="wrap" padding="$4">
      <IconButton icon="home" accessibilityLabel="Home" onPress={() => {}} />
      <IconButton icon="camera" accessibilityLabel="Camera" onPress={() => {}} />
      <IconButton icon="settings" accessibilityLabel="Settings" onPress={() => {}} />
      <IconButton icon="trash" accessibilityLabel="Delete" onPress={() => {}} />
      <IconButton icon="plus" accessibilityLabel="Add" onPress={() => {}} />
      <IconButton icon="edit" accessibilityLabel="Edit" onPress={() => {}} />
    </XStack>
  ),
};
