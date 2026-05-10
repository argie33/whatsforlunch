import React from 'react';
import { Meta, StoryObj } from '@storybook/react-native';
import { Toast } from './Toast';
import { YStack } from 'tamagui';

const meta = {
  title: 'Components/Toast',
  component: Toast,
  args: {
    message: 'This is a toast message',
    type: 'info',
    duration: 3000,
  },
  decorators: [
    (Story) => (
      <YStack flex={1} justifyContent="flex-end" padding="$4" gap="$4">
        <Story />
      </YStack>
    ),
  ],
} satisfies Meta<typeof Toast>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Info: Story = {
  args: {
    message: 'This is an informational message',
    type: 'info',
  },
};

export const Success: Story = {
  args: {
    message: 'Item successfully added!',
    type: 'success',
  },
};

export const Error: Story = {
  args: {
    message: 'Failed to save item',
    type: 'error',
  },
};

export const LongMessage: Story = {
  args: {
    message: 'This is a longer toast message that contains more detailed information about what happened',
    type: 'info',
  },
};

export const AllTypes: Story = {
  render: () => (
    <YStack gap="$4">
      <Toast message="Success message" type="success" duration={10000} />
      <Toast message="Error message" type="error" duration={10000} />
      <Toast message="Info message" type="info" duration={10000} />
    </YStack>
  ),
};
