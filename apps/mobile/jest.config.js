module.exports = {
  preset: 'jest-expo',
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|react-navigation|@react-navigation/.*|@nozbe/watermelondb|@nozbe/with-observables|rxjs|react-native-reanimated|moti|@motify))',
  ],
  moduleNameMapper: {
    '^react-native-mmkv$': '<rootDir>/src/__tests__/__mocks__/mmkv.ts',
    '^react-native-vision-camera$': '<rootDir>/src/__tests__/__mocks__/camera.ts',
  },
  testPathPattern: 'src/__tests__',
  collectCoverageFrom: [
    'src/db/conflict.ts',
    'src/db/queue.ts',
    'src/db/sync.ts',
    'src/services/SyncService.ts',
  ],
};
