import React from 'react';
import { TamaguiProvider } from 'tamagui';
import tamaConfig from '../tamagui.config';

export const decorators = [
  (Story) => (
    <TamaguiProvider config={tamaConfig} defaultTheme="light">
      <Story />
    </TamaguiProvider>
  ),
];

export const parameters = {
  layout: 'centered',
  actions: { argTypesRegex: '^on[A-Z].*' },
  controls: {
    matchers: {
      color: /(background|color)$/i,
      date: /Date$/,
    },
  },
};
