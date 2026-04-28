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

// Custom tokens + themes override defaultConfig.config — the spread at the end
// provides animations, media, and other required Tamagui internals.
// @ts-ignore — createTamagui merges these at runtime; TS2783 is safe to suppress
export const config = createTamagui({
  defaultFont: 'body',
  shouldAddPx: true,
  // @ts-ignore
  tokens,
  // @ts-ignore
  themes: {
    light: {
      ...lightTheme,
    },
    dark: {
      ...darkTheme,
    },
  },
  // @ts-ignore
  shorthands,
  // @ts-ignore
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
