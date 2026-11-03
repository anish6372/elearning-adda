module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.[jt]s'],
  transform: { '^.+\\.ts$': 'ts-jest' },
  moduleDirectories: ['node_modules', 'src'],
  // the first run downloads the in-memory MongoDB binary
  testTimeout: 30000,
};
