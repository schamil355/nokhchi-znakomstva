module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testTimeout: 180000,
  globalSetup: "detox/runners/jest/globalSetup",
  globalTeardown: "detox/runners/jest/globalTeardown",
  setupFilesAfterEnv: ["./setup.e2e.ts"],
  transform: {
    "^.+\\.(ts|tsx)$": ["ts-jest", { tsconfig: "<rootDir>/tsconfig.jest.json" }],
  },
  reporters: ["detox/runners/jest/reporter"],
  testRegex: "\\.e2e\\.ts$",
};
