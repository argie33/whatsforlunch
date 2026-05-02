// Jest configuration for WhatsFresh monorepo
module.exports = {
  projects: [
    '<rootDir>/packages/*/jest.config.js',
    '<rootDir>/services/jest.config.js',
    '<rootDir>/apps/mobile/jest.config.js',
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
    '!src/**/*.test.{ts,tsx}',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
};
