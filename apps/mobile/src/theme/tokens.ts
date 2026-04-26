export const lightTheme = {
  // Brand colors
  'brand/primary': '#2F7D5B',
  'brand/primaryMuted': '#E8F2EC',
  'brand/primaryDark': '#1F5A40',

  // Status colors
  'status/fresh': '#3A8C5F',
  'status/freshBg': '#E8F2EC',
  'status/soon': '#C98A2B',
  'status/soonBg': '#FAF1E1',
  'status/urgent': '#C24A3E',
  'status/urgentBg': '#FAE8E5',
  'status/expired': '#6B6B6B',
  'status/expiredBg': '#F0EFEC',

  // Surface colors
  'surface/base': '#FBFAF7',
  'surface/raised': '#FFFFFF',
  'surface/sunken': '#F2F0EB',

  // Text colors
  'text/primary': '#0F1411',
  'text/secondary': '#5C615E',
  'text/tertiary': '#8B908D',
  'text/inverse': '#FFFFFF',

  // Border colors
  'border/subtle': '#E8E5DE',
  'border/strong': '#D2CFC7',

  // Accent
  'accent/coral': '#E56C5A',
};

export const darkTheme = {
  // Brand colors
  'brand/primary': '#5FB389',
  'brand/primaryMuted': '#1E3329',
  'brand/primaryDark': '#3F8D67',

  // Status colors
  'status/fresh': '#5FB389',
  'status/freshBg': '#1E3329',
  'status/soon': '#E5B566',
  'status/soonBg': '#3A2E18',
  'status/urgent': '#F07566',
  'status/urgentBg': '#3A1F1B',
  'status/expired': '#8E8E93',
  'status/expiredBg': '#222423',

  // Surface colors
  'surface/base': '#0E110F',
  'surface/raised': '#1A1F1B',
  'surface/sunken': '#070908',

  // Text colors
  'text/primary': '#F4F2EE',
  'text/secondary': '#A8ACA9',
  'text/tertiary': '#6B706D',
  'text/inverse': '#0E110F',

  // Border colors
  'border/subtle': '#252A26',
  'border/strong': '#3A3F3B',
};

export const typography = {
  display: {
    fontSize: 34,
    lineHeight: 41,
    fontWeight: '700',
  },
  title1: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
  },
  title2: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '600',
  },
  title3: {
    fontSize: 20,
    lineHeight: 25,
    fontWeight: '600',
  },
  headline: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '600',
  },
  body: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '400',
  },
  callout: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '400',
  },
  subhead: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '400',
  },
  footnote: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400',
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
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

export const radii = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  full: 999,
};

export const shadows = {
  e1: {
    light: {
      shadowColor: '#0F1411',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 1.5,
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
      shadowColor: '#0F1411',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
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
      shadowColor: '#0F1411',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.12,
      shadowRadius: 28,
      elevation: 8,
    },
    dark: {
      shadowColor: 'transparent',
      borderColor: '#3A3F3B',
      borderWidth: 1,
    },
  },
};
