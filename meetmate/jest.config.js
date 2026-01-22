module.exports = {
  projects: [
    {
      displayName: "unit",
      preset: "ts-jest",
      testEnvironment: "node",
      testMatch: ["<rootDir>/__tests__/unit/**/*.test.ts"],
      setupFiles: ["<rootDir>/jest.env.js"],
      moduleNameMapper: {
        "^react-native$": "react-native-web",
        "^expo-localization$": "../__mocks__/expo-localization",
        "^react-native-url-polyfill/auto$":
          "<rootDir>/__mocks__/react-native-url-polyfill-auto.ts",
        "^@react-native-async-storage/async-storage$":
          "<rootDir>/__mocks__/async-storage.ts",
        "^expo-constants$": "<rootDir>/__mocks__/expo-constants.ts",
      },
      transform: {
        "^.+\\.(ts|tsx)$": ["ts-jest", { tsconfig: "<rootDir>/tsconfig.jest.json" }],
      },
    },
    {
      displayName: "expo",
      preset: "jest-expo",
      testEnvironment: "jsdom",
      moduleNameMapper: {
        "^react-native-url-polyfill/auto$":
          "<rootDir>/__mocks__/react-native-url-polyfill-auto.ts",
        "^@react-native-async-storage/async-storage$":
          "<rootDir>/__mocks__/async-storage.ts",
        "^expo-constants$": "<rootDir>/__mocks__/expo-constants.ts",
      },
      setupFiles: ["<rootDir>/jest.env.js"],
      setupFilesAfterEnv: [],
      transformIgnorePatterns: [
        "node_modules/(?!(@react-native|react-native|@react-native-async-storage|@react-native-community|expo(nent)?|@expo|expo-modules-core|react-native-reanimated|react-native-worklets)/)",
      ],
      testMatch: ["<rootDir>/__tests__/**/*.test.[jt]s?(x)"],
      testPathIgnorePatterns: ["<rootDir>/__tests__/unit/"],
    },
  ],
};
