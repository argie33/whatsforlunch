import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { View } from 'react-native';
import { Chip } from './Chip';

const meta: Meta<typeof Chip> = {
  title: 'Chip',
  component: Chip,
  decorators: [
    (Story) => (
      <View style={{ flex: 1, backgroundColor: '#FAF6EE', padding: 20 }}>
        <Story />
      </View>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof Chip>;

export const Default: Story = {
  args: {
    label: 'All',
    onPress: () => console.log('Chip pressed'),
  },
};

export const Active: Story = {
  args: {
    label: 'Urgent',
    icon: '🔥',
    active: true,
    onPress: () => console.log('Chip pressed'),
  },
};

export const WithIcon: Story = {
  args: {
    label: 'Fridge',
    icon: '🧊',
    onPress: () => console.log('Chip pressed'),
  },
};

export const WithBadge: Story = {
  args: {
    label: 'Pantry',
    icon: '🥫',
    badge: 5,
    onPress: () => console.log('Chip pressed'),
  },
};

export const Closeable: Story = {
  args: {
    label: 'Dairy',
    closeable: true,
    onPress: () => console.log('Chip pressed'),
    onClose: (label) => console.log('Close:', label),
  },
};

export const Disabled: Story = {
  args: {
    label: 'Disabled',
    disabled: true,
  },
};

export const Interactive: Story = {
  render: () => {
    const [selectedChips, setSelectedChips] = useState<Set<string>>(new Set(['all']));

    const chips = [
      { label: 'All', icon: null },
      { label: 'Urgent', icon: '🔥' },
      { label: 'Fridge', icon: '🧊' },
      { label: 'Freezer', icon: '❄️' },
      { label: 'Pantry', icon: '🥫' },
    ];

    const handleChipPress = (label: string) => {
      const newSelected = new Set(selectedChips);
      if (newSelected.has(label)) {
        newSelected.delete(label);
      } else {
        newSelected.clear();
        newSelected.add(label);
      }
      setSelectedChips(newSelected);
    };

    return (
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {chips.map((chip) => (
          <Chip
            key={chip.label}
            label={chip.label}
            icon={chip.icon || undefined}
            active={selectedChips.has(chip.label)}
            onPress={handleChipPress}
          />
        ))}
      </View>
    );
  },
};
