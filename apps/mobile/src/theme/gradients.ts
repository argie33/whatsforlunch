import { lightTheme } from './tokens';

const C = lightTheme;

export const Gradients = {
  // Brand gradient (primary use)
  brand: {
    colors: [C['brand/primary'], C['brand/primaryLight']],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },

  // Brand dark gradient (alternative)
  brandDark: {
    colors: [C['brand/primaryDark'], C['brand/primary']],
    start: { x: 0.2, y: 0.2 },
    end: { x: 1, y: 1 },
  },

  // Status gradients for item stripes
  itemFresh: {
    colors: [C['status/fresh'], '#34B86C'],
    start: { x: 0, y: 0 },
    end: { x: 0, y: 1 },
  },

  itemSoon: {
    colors: [C['status/soon'], C['accent/honey']],
    start: { x: 0, y: 0 },
    end: { x: 0, y: 1 },
  },

  itemUrgent: {
    colors: [C['status/urgent'], C['accent/coral']],
    start: { x: 0, y: 0 },
    end: { x: 0, y: 1 },
  },

  itemExpired: {
    colors: [C['status/expired'], C['status/expired']],
    start: { x: 0, y: 0 },
    end: { x: 0, y: 1 },
  },

  // Accent gradients
  coral: {
    colors: [C['accent/coral'], '#FF8A6B'],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },

  coralHoney: {
    colors: [C['accent/coral'], C['accent/honey']],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },

  honey: {
    colors: [C['accent/honey'], C['accent/coral']],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },

  sky: {
    colors: [C['accent/sky'], '#6BA8E6'],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },

  berry: {
    colors: [C['accent/berry'], '#E0457E'],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },

  plum: {
    colors: [C['accent/plum'], '#8A7AB8'],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },

  plumBerry: {
    colors: [C['accent/plum'], C['accent/berry']],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },
};

export const Shadows = {
  // s-1: Subtle
  s1: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },

  // s-2: Small
  s2: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
  },

  // s-3: Medium
  s3: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 6,
  },

  // s-glow: Brand glow
  sGlow: {
    shadowColor: C['brand/primary'],
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 32,
    elevation: 8,
  },

  // s-coral: Coral shadow
  sCoral: {
    shadowColor: C['accent/coral'],
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 8,
  },

  // s-urgent: Urgent/red shadow
  sUrgent: {
    shadowColor: C['status/urgent'],
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
  },

  // Glass effect shadow (subtle)
  glass: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
};

// Backdrop blur effects
export const BackdropBlurs = {
  light: 10,
  medium: 14,
  heavy: 24,
};

// Glass morphism style
export const GlassMorphism = {
  light: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    backdropFilter: 'blur(14px)',
  },
  medium: {
    backgroundColor: 'rgba(255,255,255,0.85)',
    backdropFilter: 'blur(20px)',
  },
  dark: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    backdropFilter: 'blur(24px)',
  },
};
