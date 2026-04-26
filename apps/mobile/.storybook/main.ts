import type { StorybookConfig } from '@storybook/react-native';

const config: StorybookConfig = {
  stories: [
    '../src/components/**/*.stories.{js,jsx,ts,tsx}',
  ],
  addons: [
    '@storybook/addon-links',
    '@storybook/addon-essentials',
    '@storybook/addon-react-native-web',
  ],
  framework: {
    name: '@storybook/react-native',
    options: {},
  },
  docs: {
    autodocs: true,
  },
};

export default config;
