module.exports = {
  preset: 'jest-expo',
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|react-navigation|@react-navigation/.*|@nozbe/watermelondb|@nozbe/with-observables|rxjs|react-native-reanimated|moti|@motify))',
  ],
  moduleNameMapper: {
    '^react-native-mmkv$': '<rootDir>/src/__tests__/__mocks__/mmkv.ts',
    '^react-native-vision-camera$': '<rootDir>/src/__tests__/__mocks__/camera.ts',
    '^posthog-react-native$': '<rootDir>/src/__tests__/__mocks__/posthog.ts',
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
    'src/services/SyncService.ts',
    'src/services/ProfileService.ts',
    'src/services/HouseholdsService.ts',
    'src/features/auth/authService.ts',
    'src/features/settings/useUserPreferences.ts',
  ],
};
