import React, { useState } from 'react';
import { Meta, StoryObj } from '@storybook/react-native';
import { Sheet } from './Sheet';
import { YStack, Text, Button as TButton } from 'tamagui';

const meta = {
  title: 'Components/Sheet',
  component: Sheet,
} satisfies Meta<typeof Sheet>;

export default meta;
type Story = StoryObj<typeof meta>;

const SheetStory = ({ title }: { title?: string }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <YStack flex={1} justifyContent="center" alignItems="center" padding="$4">
      <TButton onPress={() => setIsOpen(true)}>Open Sheet</TButton>
      <Sheet isOpen={isOpen} onClose={() => setIsOpen(false)} title={title}>
        <YStack gap="$4">
          <Text fontSize="$6" fontWeight="bold">
            {title || 'Sheet Content'}
          </Text>
          <Text fontSize="$4" color="$text/secondary">
            This is the sheet content. You can swipe down or press outside to dismiss.
          </Text>
        </YStack>
      </Sheet>
    </YStack>
  );
};

export const Default: Story = {
  render: () => <SheetStory />,
};

export const WithTitle: Story = {
  render: () => <SheetStory title="Options" />,
};

export const CustomSnapPoints: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(false);

    return (
      <YStack flex={1} justifyContent="center" alignItems="center" padding="$4">
        <TButton onPress={() => setIsOpen(true)}>Open Sheet</TButton>
        <Sheet
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          snapPoints={['50%', '75%', '90%']}
          title="Custom Snap Points"
        >
          <YStack gap="$4">
            <Text fontSize="$6" fontWeight="bold">
              Custom Snap Points
            </Text>
            <Text fontSize="$4" color="$text/secondary">
              This sheet has custom snap points at 50%, 75%, and 90%.
            </Text>
          </YStack>
        </Sheet>
      </YStack>
    );
  },
};
