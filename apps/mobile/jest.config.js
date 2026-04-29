module.exports = {
  preset: 'jest-expo',
  transformIgnorePatterns: [
    'node_modules/(?!(.pnpm/[^/]+/node_modules/)?(((jest-)?react-native|@react-native(-community)?(/.*)?|expo(nent)?|@expo(nent)?/.*|react-navigation|@react-navigation/.*|@nozbe/watermelondb|@nozbe/with-observables|rxjs|react-native-reanimated|moti|@motify)))',
  ],
  moduleNameMapper: {
    '^react-native-mmkv$': '<rootDir>/src/__tests__/__mocks__/mmkv.ts',
    '^react-native-vision-camera$': '<rootDir>/src/__tests__/__mocks__/camera.ts',
    '^posthog-react-native$': '<rootDir>/src/__tests__/__mocks__/posthog.ts',
    '^aws-amplify/api$': '<rootDir>/src/__tests__/__mocks__/aws-amplify-api.ts',
    '^@sentry/react-native$': '<rootDir>/src/__tests__/__mocks__/sentry.ts',
    '^@/lib/sentry$': '<rootDir>/src/__tests__/__mocks__/sentry-local.ts',
    '^@testing-library/react-hooks$':
      '<rootDir>/src/__tests__/__mocks__/testing-library-react-hooks.ts',
    '^react-dom$': '<rootDir>/src/__tests__/__mocks__/react-dom.ts',
    '^react-dom/(.*)$': '<rootDir>/src/__tests__/__mocks__/react-dom.ts',
    '^react-native-purchases$': '<rootDir>/src/__tests__/__mocks__/react-native-purchases.ts',
  },
  testMatch: [
    '<rootDir>/src/__tests__/**/*.test.ts',
    '<rootDir>/src/__tests__/**/*.test.tsx',
    '<rootDir>/src/features/**/__tests__/**/*.test.ts',
    '<rootDir>/src/features/**/__tests__/**/*.test.tsx',
    '<rootDir>/src/services/__tests__/**/*.test.ts',
  ],
  collectCoverageFrom: [
    'src/db/conflict.ts',
    'src/db/queue.ts',
    'src/db/sync.ts',
    'src/lib/itemUtils.ts',
    'src/lib/notifications.ts',
    'src/lib/analytics.ts',
    'src/services/SyncService.ts',
    'src/services/ItemsService.ts',
    'src/services/ContainersService.ts',
    'src/services/ProfileService.ts',
    'src/services/HouseholdsService.ts',
    'src/features/auth/authService.ts',
    'src/features/settings/useUserPreferences.ts',
  ],
  coverageThreshold: {
    './src/lib/itemUtils.ts': {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },
};
