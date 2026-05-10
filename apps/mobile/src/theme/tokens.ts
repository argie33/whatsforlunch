// Design tokens matching HTML demo aesthetic (clean iOS-inspired blue + simple typography)
// Updated to simplify and modernize the design system for a cleaner user experience

export const lightTheme = {
  // === Brand — iOS-inspired blue, clean and modern ===
  'brand/primary': '#007AFF',
  'brand/primaryDark': '#0056B3',
  'brand/primaryLight': '#4DA3FF',
  'brand/glow': '#007AFF',
  'brand/soft': '#E3F2FF',
  'brand/tint': '#F0F7FF',
  'brand/primaryMuted': '#E3F2FF',

  // === Accents — Simplified, essential only ===
  'accent/coral': '#FF4444',
  'accent/coralSoft': '#FFE5E5',
  'accent/honey': '#F4B942',
  'accent/honeySoft': '#FDF1D9',
  'accent/berry': '#FF4444',
  'accent/berrySoft': '#FFE5E5',
  'accent/sky': '#007AFF',
  'accent/skySoft': '#E3F2FF',
  'accent/plum': '#007AFF',
  'accent/plumSoft': '#E3F2FF',

  // === Status — Vibrant + readable ===
  'status/fresh': '#28A745',
  'status/freshBg': '#E8F5E9',
  'status/soon': '#FFC107',
  'status/soonBg': '#FFF9E6',
  'status/urgent': '#DC3545',
  'status/urgentBg': '#FFEBEE',
  'status/expired': '#999999',
  'status/expiredBg': '#F5F5F5',
  'status/danger': '#DC3545',

  // === Surface — Clean, white-based ===
  'surface/base': '#F5F5F5',
  'surface/base2': '#EEEEEE',
  'surface/raised': '#FFFFFF',
  'surface/sunken': '#F5F5F5',
  'surface/overlay': 'rgba(0,0,0,0.4)',

  // === Text — Simple hierarchy ===
  'text/primary': '#333333',
  'text/secondary': '#666666',
  'text/tertiary': '#999999',
  'text/inverse': '#FFFFFF',

  // === Borders ===
  'border/subtle': '#CCCCCC',
  'border/strong': '#AAAAAA',
};

export const darkTheme = {
  // Brand colors (lighter for dark mode)
  'brand/primary': '#4DA3FF',
  'brand/primaryDark': '#007AFF',
  'brand/primaryLight': '#80BFFF',
  'brand/glow': '#4DA3FF',
  'brand/soft': '#1A2A3A',
  'brand/tint': '#0F1620',
  'brand/primaryMuted': '#1A2A3A',

  // Accents (adjusted for dark mode)
  'accent/coral': '#FF6666',
  'accent/coralSoft': '#3A1F1F',
  'accent/honey': '#F5C760',
  'accent/honeySoft': '#3A2E18',
  'accent/berry': '#FF6666',
  'accent/berrySoft': '#3A1F1F',
  'accent/sky': '#4DA3FF',
  'accent/skySoft': '#1A2A3A',
  'accent/plum': '#4DA3FF',
  'accent/plumSoft': '#1A2A3A',

  // Status colors
  'status/fresh': '#4CAF50',
  'status/freshBg': '#1B5E20',
  'status/soon': '#FFC107',
  'status/soonBg': '#3A2F1F',
  'status/urgent': '#FF6666',
  'status/urgentBg': '#3A1F1F',
  'status/expired': '#999999',
  'status/expiredBg': '#2A2A2A',
  'status/danger': '#FF6666',

  // Surface colors
  'surface/base': '#1E1E1E',
  'surface/base2': '#2A2A2A',
  'surface/raised': '#333333',
  'surface/sunken': '#0F0F0F',
  'surface/overlay': 'rgba(0,0,0,0.7)',

  // Text colors
  'text/primary': '#EEEEEE',
  'text/secondary': '#AAAAAA',
  'text/tertiary': '#777777',
  'text/inverse': '#1E1E1E',

  // Border colors
  'border/subtle': '#444444',
  'border/strong': '#666666',
};

// Typography matching HTML demo - simple, clean system font approach
export const typography = {
  // .h1 - Title (32px, bold) matching HTML demo
  h1: {
    fontSize: 32,
    lineHeight: 40,
    fontWeight: '700' as const,
    letterSpacing: 0,
  },
  // .h2 - Large heading
  h2: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '700' as const,
    letterSpacing: 0,
  },
  // .h3 - Medium heading
  h3: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '700' as const,
    letterSpacing: 0,
  },
  // .h4 - Small heading
  h4: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600' as const,
    letterSpacing: 0,
  },
  // .body - Main text (16px, 400)
  body: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400' as const,
  },
  // .body-sm - Small body text (14px)
  bodySmall: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400' as const,
  },
  // .caption - Small label text (12px, 600)
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600' as const,
    letterSpacing: 0,
  },
  // .eyebrow - Tiny label (11px, 600)
  eyebrow: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600' as const,
    letterSpacing: 0,
  },
  // Legacy aliases for existing code
  display: {
    fontSize: 32,
    lineHeight: 40,
    fontWeight: '700' as const,
  },
  title1: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '700' as const,
  },
  title2: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '700' as const,
  },
  title3: {
    fontSize: 18,
    lineHeight: 26,
    fontWeight: '600' as const,
  },
  headline: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600' as const,
  },
  callout: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400' as const,
  },
  subhead: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400' as const,
  },
  footnote: {
    fontSize: 12,
    lineHeight: 16,
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

// Shadows - Simplified, clean and minimal (matching HTML demo aesthetic)
export const shadows = {
  e1: {
    light: {
      shadowColor: '#333333',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius: 2,
      elevation: 1,
    },
    dark: {
      shadowColor: 'transparent',
      borderColor: '#444444',
      borderWidth: 1,
    },
  },
  e2: {
    light: {
      shadowColor: '#333333',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.12,
      shadowRadius: 4,
      elevation: 2,
    },
    dark: {
      shadowColor: 'transparent',
      borderColor: '#444444',
      borderWidth: 1,
    },
  },
  e3: {
    light: {
      shadowColor: '#333333',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 3,
    },
    dark: {
      shadowColor: 'transparent',
      borderColor: '#444444',
      borderWidth: 1,
    },
  },
  glow: {
    light: {
      shadowColor: '#007AFF',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 3,
    },
    dark: {
      shadowColor: '#4DA3FF',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 3,
    },
  },
  coral: {
    light: {
      shadowColor: '#FF4444',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.12,
      shadowRadius: 4,
      elevation: 2,
    },
    dark: {
      shadowColor: '#FF6666',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
      elevation: 2,
    },
  },
};

// Helper to get themed colors
export const getColors = (mode: 'light' | 'dark') => (mode === 'dark' ? darkTheme : lightTheme);

// Re-export radii for easier access
export const R = radii;
