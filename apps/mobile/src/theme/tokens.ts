// Design tokens matching app.html prototype exactly
// HTML uses CSS variables defined in :root - these are the React Native equivalents

export const lightTheme = {
  // === Brand — Deep verdant green, premium, fresh ===
  'brand/primary': '#0E5C3A',
  'brand/primaryDark': '#08402A',
  'brand/primaryLight': '#1F8B5C',
  'brand/glow': '#2DBC83',
  'brand/soft': '#E6F2EC',
  'brand/tint': '#F2F8F4',
  'brand/primaryMuted': '#E6F2EC',

  // === Accents — Captivating, food-forward ===
  'accent/coral': '#FF6B47',
  'accent/coralSoft': '#FFE5DD',
  'accent/honey': '#F4B942',
  'accent/honeySoft': '#FDF1D9',
  'accent/berry': '#C2185B',
  'accent/berrySoft': '#FCE4EC',
  'accent/sky': '#4A90E2',
  'accent/skySoft': '#E3F0FB',
  'accent/plum': '#6B5B95',
  'accent/plumSoft': '#EFEBF7',

  // === Status — Vibrant + readable ===
  'status/fresh': '#1F9956',
  'status/freshBg': '#E0F4E8',
  'status/soon': '#E08F1B',
  'status/soonBg': '#FCEFD3',
  'status/urgent': '#E0392B',
  'status/urgentBg': '#FBE0DD',
  'status/expired': '#6B6B6B',
  'status/expiredBg': '#ECECEC',
  'status/danger': '#E0392B',

  // === Surface — Warm, premium feel ===
  'surface/base': '#FAF6EE',
  'surface/base2': '#F4EEDD',
  'surface/raised': '#FFFFFF',
  'surface/sunken': '#F5F1E5',
  'surface/overlay': 'rgba(15,28,17,0.45)',

  // === Text ===
  'text/primary': '#0F1A11',
  'text/secondary': '#4D5A4F',
  'text/tertiary': '#7B8580',
  'text/inverse': '#FFFFFF',

  // === Borders ===
  'border/subtle': '#E8E0CC',
  'border/strong': '#D6CDB6',
};

export const darkTheme = {
  // Brand colors (lighter for dark mode)
  'brand/primary': '#2DBC83',
  'brand/primaryDark': '#1F8B5C',
  'brand/primaryLight': '#5FE0AC',
  'brand/glow': '#3FD495',
  'brand/soft': '#1A3329',
  'brand/tint': '#0E1F18',
  'brand/primaryMuted': '#1A3329',

  // Accents (adjusted for dark mode)
  'accent/coral': '#FF8A6B',
  'accent/coralSoft': '#3A1F1B',
  'accent/honey': '#F5C760',
  'accent/honeySoft': '#3A2E18',
  'accent/berry': '#E0457E',
  'accent/berrySoft': '#3A1A2A',
  'accent/sky': '#6BA8E6',
  'accent/skySoft': '#1A2A3A',
  'accent/plum': '#8A7AB8',
  'accent/plumSoft': '#2A1F3A',

  // Status colors
  'status/fresh': '#3FD495',
  'status/freshBg': '#1E3329',
  'status/soon': '#F5BB4A',
  'status/soonBg': '#3A2E18',
  'status/urgent': '#FF6655',
  'status/urgentBg': '#3A1F1B',
  'status/expired': '#8E8E93',
  'status/expiredBg': '#222423',
  'status/danger': '#FF6655',

  // Surface colors
  'surface/base': '#0E110F',
  'surface/base2': '#0A0D0B',
  'surface/raised': '#1A1F1B',
  'surface/sunken': '#070908',
  'surface/overlay': 'rgba(0,0,0,0.6)',

  // Text colors
  'text/primary': '#F4F2EE',
  'text/secondary': '#A8ACA9',
  'text/tertiary': '#6B706D',
  'text/inverse': '#0E110F',

  // Border colors
  'border/subtle': '#252A26',
  'border/strong': '#3A3F3B',
};

// Typography matching HTML CSS classes (.h1, .h2, .h3, .h4, .body, etc.)
export const typography = {
  // .h1 - "font-size: 34px; font-weight: 800; line-height: 1.05; letter-spacing: -1.2px"
  h1: {
    fontSize: 34,
    lineHeight: 36, // 34 * 1.05 = 35.7
    fontWeight: '800' as const,
    letterSpacing: -1.2,
  },
  // .h2
  h2: {
    fontSize: 28,
    lineHeight: 31,
    fontWeight: '800' as const,
    letterSpacing: -0.8,
  },
  // .h3
  h3: {
    fontSize: 22,
    lineHeight: 25,
    fontWeight: '700' as const,
    letterSpacing: -0.4,
  },
  // .h4
  h4: {
    fontSize: 18,
    lineHeight: 23,
    fontWeight: '700' as const,
    letterSpacing: -0.2,
  },
  // .body
  body: {
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '400' as const,
  },
  // .body-sm
  bodySmall: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400' as const,
  },
  // .caption
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600' as const,
    letterSpacing: 0.3,
  },
  // .eyebrow
  eyebrow: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '800' as const,
    letterSpacing: 1.5,
    textTransform: 'uppercase' as const,
  },
  // Legacy aliases for existing code
  display: {
    fontSize: 34,
    lineHeight: 36,
    fontWeight: '800' as const,
  },
  title1: {
    fontSize: 28,
    lineHeight: 31,
    fontWeight: '800' as const,
  },
  title2: {
    fontSize: 22,
    lineHeight: 25,
    fontWeight: '700' as const,
  },
  title3: {
    fontSize: 20,
    lineHeight: 25,
    fontWeight: '600' as const,
  },
  headline: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '600' as const,
  },
  callout: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '400' as const,
  },
  subhead: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '400' as const,
  },
  footnote: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400' as const,
  },
};

export const spacing = {
  $1: 4,
  $2: 8,
  $3: 12,
  $4: 16,
  $5: 20,
  $6: 24,
  $7: 32,
  $8: 40,
  $9: 56,
  $10: 72,
};

// Radii matching HTML CSS variables
export const radii = {
  xs: 8, // --r-xs
  sm: 12, // --r-sm
  md: 16, // --r-md
  lg: 22, // --r-lg
  xl: 32, // --r-xl
  full: 9999, // --r-full
};

// Shadows matching HTML --s-1, --s-2, --s-3, --s-glow, --s-coral
export const shadows = {
  e1: {
    light: {
      shadowColor: '#0F1A11',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 6,
      elevation: 1,
    },
    dark: {
      shadowColor: 'transparent',
      borderColor: '#252A26',
      borderWidth: 1,
    },
  },
  e2: {
    light: {
      shadowColor: '#0F1A11',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.07,
      shadowRadius: 20,
      elevation: 5,
    },
    dark: {
      shadowColor: 'transparent',
      borderColor: '#3A3F3B',
      borderWidth: 1,
    },
  },
  e3: {
    light: {
      shadowColor: '#0F1A11',
      shadowOffset: { width: 0, height: 20 },
      shadowOpacity: 0.1,
      shadowRadius: 40,
      elevation: 8,
    },
    dark: {
      shadowColor: 'transparent',
      borderColor: '#3A3F3B',
      borderWidth: 1,
    },
  },
  glow: {
    light: {
      shadowColor: '#0E5C3A',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.25,
      shadowRadius: 32,
      elevation: 6,
    },
    dark: {
      shadowColor: '#2DBC83',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.3,
      shadowRadius: 32,
      elevation: 6,
    },
  },
  coral: {
    light: {
      shadowColor: '#FF6B47',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.3,
      shadowRadius: 24,
      elevation: 6,
    },
    dark: {
      shadowColor: '#FF8A6B',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.3,
      shadowRadius: 24,
      elevation: 6,
    },
  },
};

// Helper to get themed colors
export const getColors = (mode: 'light' | 'dark') => (mode === 'dark' ? darkTheme : lightTheme);

// Re-export radii for easier access
export const R = radii;
