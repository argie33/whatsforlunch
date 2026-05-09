import { createTamagui, createTokens } from 'tamagui';
import { createInterFont } from '@tamagui/font-inter';
import { shorthands } from '@tamagui/shorthands';
import * as defaultConfig from '@tamagui/config/v3';
import { lightTheme, darkTheme, spacing, radii } from './src/theme/tokens';

const interFont = createInterFont();

// Create Fraunces font config for headings (500/600/700/800 weights)
const fraunces = {
  500: { normal: 'Fraunces_500Medium', italic: 'Fraunces_500Medium_Italic' },
  600: { normal: 'Fraunces_600SemiBold', italic: 'Fraunces_600SemiBold_Italic' },
  700: { normal: 'Fraunces_700Bold', italic: 'Fraunces_700Bold_Italic' },
  800: { normal: 'Fraunces_800ExtraBold', italic: 'Fraunces_800ExtraBold_Italic' },
};

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
    heading: fraunces,
  },
  ...defaultConfig.config,
});

export type AppConfig = typeof config;

declare module 'tamagui' {
  interface TamaguiCustomConfig extends AppConfig {}
}

export default config;
