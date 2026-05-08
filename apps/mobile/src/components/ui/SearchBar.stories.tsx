import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { View } from 'react-native';
import { SearchBar } from './SearchBar';

const meta: Meta<typeof SearchBar> = {
  title: 'SearchBar',
  component: SearchBar,
  decorators: [
    (Story) => (
      <View style={{ flex: 1, backgroundColor: '#FAF6EE', paddingTop: 20 }}>
        <Story />
      </View>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof SearchBar>;

export const Default: Story = {
  args: {
    placeholder: "Search 'milk', 'leftover'...",
  },
};

export const WithValue: Story = {
  args: {
    placeholder: 'Search items...',
    value: 'milk',
  },
};

export const Focused: Story = {
  render: () => {
    const [value, setValue] = useState('');
    return (
      <SearchBar
        placeholder="Search items..."
        value={value}
        onChangeText={setValue}
        autoFocus={true}
      />
    );
  },
};

export const Small: Story = {
  args: {
    placeholder: 'Search...',
    size: 'sm',
  },
};

export const Disabled: Story = {
  args: {
    placeholder: 'Search (disabled)',
    disabled: true,
  },
};

export const WithClear: Story = {
  render: () => {
    const [value, setValue] = useState('vegetables');
    return (
      <SearchBar
        placeholder="Search items..."
        value={value}
        onChangeText={setValue}
        onClear={() => setValue('')}
      />
    );
  },
};
