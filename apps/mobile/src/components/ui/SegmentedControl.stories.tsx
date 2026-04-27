import React, { useState } from 'react';
import { Meta, StoryObj } from '@storybook/react-native';
import { SegmentedControl } from './SegmentedControl';
import { YStack } from 'tamagui';

const meta = {
  title: 'Components/SegmentedControl',
  component: SegmentedControl,
} satisfies Meta<typeof SegmentedControl>;

export default meta;
type Story = StoryObj<typeof meta>;

const SegmentedControlStory = ({ segments }: { segments: Array<{ label: string; value: string }> }) => {
  const [value, setValue] = useState(segments[0].value);

  return (
    <YStack padding="$4" gap="$4">
      <SegmentedControl segments={segments} value={value} onValueChange={setValue} />
    </YStack>
  );
};

export const Default: Story = {
  render: () => (
    <SegmentedControlStory
      segments={[
        { label: 'Today', value: 'today' },
        { label: 'Week', value: 'week' },
        { label: 'Month', value: 'month' },
      ]}
    />
  ),
};

export const TwoSegments: Story = {
  render: () => (
    <SegmentedControlStory
      segments={[
        { label: 'On', value: 'on' },
        { label: 'Off', value: 'off' },
      ]}
    />
  ),
};

export const FourSegments: Story = {
  render: () => (
    <SegmentedControlStory
      segments={[
        { label: 'List', value: 'list' },
        { label: 'Grid', value: 'grid' },
        { label: 'Map', value: 'map' },
        { label: 'Stats', value: 'stats' },
      ]}
    />
  ),
};

export const ScanModes: Story = {
  render: () => (
    <SegmentedControlStory
      segments={[
        { label: 'QR', value: 'qr' },
        { label: 'Barcode', value: 'barcode' },
        { label: 'Photo', value: 'photo' },
        { label: 'Date', value: 'date' },
      ]}
    />
  ),
};
