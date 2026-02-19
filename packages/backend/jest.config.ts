import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@ttt/shared$': '<rootDir>/../shared/src/index.ts',
  },
  testPathPattern: 'src/__tests__',
};

export default config;
