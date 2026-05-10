import type { Meta, StoryObj } from '@storybook/react-native';
import { Input } from './Input';
import { useState } from 'react';

const meta = {
  title: 'UI/Input',
  component: Input,
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['text', 'numeric', 'email', 'date'],
    },
    disabled: { control: 'boolean' },
    clearable: { control: 'boolean' },
  },
} satisfies Meta<typeof Input>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: 'Email',
    placeholder: 'Enter email',
    variant: 'email',
  },
};

export const WithError: Story = {
  args: {
    label: 'Email',
    placeholder: 'Enter email',
    error: 'Invalid email address',
    variant: 'email',
  },
};

export const Clearable: Story = {
  args: {
    label: 'Search',
    placeholder: 'Type to search...',
    clearable: true,
  },
};

export const Disabled: Story = {
  args: {
    label: 'Disabled',
    value: 'Cannot edit',
    disabled: true,
  },
};
