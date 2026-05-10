/**
 * Jest setup file — Fixes for React Native 0.74 + Testing Library compatibility
 */

// Mock React Native's DebuggingOverlayNativeComponent
// which has a TypeScript incompatibility with @testing-library/react-native
// regarding $ReadOnlyArray param type for highlightTraceUpdates method
jest.mock('react-native/src/private/specs/components/DebuggingOverlayNativeComponent', () => ({
  __esModule: true,
  default: {
    getConstants: () => ({}),
  },
}));
