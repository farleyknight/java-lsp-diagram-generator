/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testTimeout: 60000, // Default timeout for all tests, can be overridden in describe/it
  // Automatically clear mock calls and instances between every test
  clearMocks: true,
  // The directory where Jest should output its coverage files
  coverageDirectory: "coverage",
  // A list of paths to directories that Jest should use to search for files in
  roots: [
    "<rootDir>/tests"
  ],
  // The glob patterns Jest uses to detect test files
  testMatch: [
    "**/__tests__/**/*.+(ts|tsx|js)",
    "**/?(*.)+(spec|test).+(ts|tsx|js)"
  ],
  // An array of regexp pattern strings that are matched against all test paths, matched tests are skipped
  // testPathIgnorePatterns: [
  //   "/node_modules/"
  // ],
  // A map from regular expressions to module names or to arrays of module names that allow to stub out resources with a single module
  moduleNameMapper: {
    // Handle module aliases (if you have them in tsconfig.json)
    // Example: '@/(.*)': '<rootDir>/src/$1'
  },
  // A list of paths to modules that run some code to configure or set up the testing framework before each test file in the suite is executed
  // setupFilesAfterEnv: ['<rootDir>/tests/setupTests.ts'],
}; 