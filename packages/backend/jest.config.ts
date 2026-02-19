import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@ttt/shared$': '<rootDir>/../shared/src/index.ts',
  },
  testMatch: ['<rootDir>/src/__tests__/**/*.test.ts'],
};

export default config;
