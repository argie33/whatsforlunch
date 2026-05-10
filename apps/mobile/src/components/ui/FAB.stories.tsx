import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { View } from 'react-native';
import { FAB } from './FAB';

const meta: Meta<typeof FAB> = {
  title: 'FAB',
  component: FAB,
  decorators: [
    (Story) => (
      <View style={{ flex: 1, backgroundColor: '#FAF6EE' }}>
        <Story />
      </View>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof FAB>;

export const Default: Story = {
  args: {
    icon: '+',
    onPress: () => console.log('FAB pressed'),
  },
};

export const BottomRight: Story = {
  args: {
    icon: '+',
    position: 'bottom-right',
    onPress: () => console.log('FAB pressed'),
  },
};

export const BottomLeft: Story = {
  args: {
    icon: '+',
    position: 'bottom-left',
    onPress: () => console.log('FAB pressed'),
  },
};

export const TopRight: Story = {
  args: {
    icon: '+',
    position: 'top-right',
    onPress: () => console.log('FAB pressed'),
  },
};

export const Small: Story = {
  args: {
    icon: '↓',
    size: 'sm',
    position: 'bottom-right',
    onPress: () => console.log('FAB pressed'),
  },
};

export const Large: Story = {
  args: {
    icon: '✎',
    size: 'lg',
    position: 'bottom-right',
    onPress: () => console.log('FAB pressed'),
  },
};

export const Disabled: Story = {
  args: {
    icon: '+',
    disabled: true,
    onPress: () => console.log('FAB pressed'),
  },
};
