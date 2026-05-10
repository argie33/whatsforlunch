import { Preview } from '@storybook/react-native';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },
    a11y: {
      // Accessibility audit enabled for all stories
      config: {
        rules: {
          // WCAG 2.1 Level AA
          'color-contrast': { enabled: true },
          'button-name': { enabled: true },
          'image-alt': { enabled: true },
          'label': { enabled: true },
          'aria-required-attr': { enabled: true },
        },
      },
    },
    // Visual regression baseline
    // Run: pnpm exec chromatic --project-token=<token>
    chromatic: {
      delay: 100, // Wait for animations to settle
      pauseAnimationAtEnd: true,
    },
  },
};

export default preview;
