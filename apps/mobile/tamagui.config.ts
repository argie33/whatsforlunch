import { createTamagui, createTokens } from 'tamagui';
import { createInterFont } from '@tamagui/font-inter';
import { shorthands } from '@tamagui/shorthands';
import * as defaultConfig from '@tamagui/config/v3';
import { lightTheme, darkTheme, spacing, radii } from './src/theme/tokens';

const interFont = createInterFont();

const tokens = createTokens({
  size: spacing,
  space: spacing,
  radius: radii,
  color: {
    ...lightTheme,
  },
  zIndex: {
    0: 0,
    1: 100,
    2: 200,
    3: 300,
    4: 400,
    5: 500,
  },
});

export const config = createTamagui({
  defaultFont: 'body',
  shouldAddPx: true,
  tokens,
  themes: {
    light: {
      ...lightTheme,
    },
    dark: {
      ...darkTheme,
    },
  },
  shorthands,
  fonts: {
    body: interFont,
    heading: interFont,
  },
  ...defaultConfig.config,
});

export type AppConfig = typeof config;

declare module 'tamagui' {
  interface TamaguiCustomConfig extends AppConfig {}
}

export default config;
