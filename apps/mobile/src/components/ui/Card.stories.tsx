import type { Meta, StoryObj } from '@storybook/react-native';
import { Card } from './Card';
import { Text, YStack } from 'tamagui';

const meta = {
  title: 'UI/Card',
  component: Card,
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['default', 'interactive', 'statusStripe'],
    },
    status: {
      control: { type: 'select' },
      options: ['fresh', 'soon', 'urgent', 'expired'],
    },
  },
} satisfies Meta<typeof Card>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    variant: 'default',
  },
  render: (args) => (
    <Card {...args}>
      <YStack gap="$2">
        <Text fontSize="$5" fontWeight="bold">
          Card Title
        </Text>
        <Text fontSize="$4" color="$text/secondary">
          This is the card content
        </Text>
      </YStack>
    </Card>
  ),
};

export const Interactive: Story = {
  args: {
    variant: 'interactive',
  },
  render: (args) => (
    <Card {...args}>
      <YStack gap="$2">
        <Text fontSize="$5" fontWeight="bold">
          Tap me
        </Text>
        <Text fontSize="$4" color="$text/secondary">
          This card responds to taps
        </Text>
      </YStack>
    </Card>
  ),
};

export const WithStatusStripe: Story = {
  args: {
    variant: 'statusStripe',
    status: 'urgent',
  },
  render: (args) => (
    <Card {...args}>
      <YStack gap="$2">
        <Text fontSize="$5" fontWeight="bold">
          Urgent
        </Text>
        <Text fontSize="$4" color="$text/secondary">
          Item expiring today
        </Text>
      </YStack>
    </Card>
  ),
};
