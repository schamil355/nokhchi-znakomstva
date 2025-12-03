// Jest config für Expo SDK 54, React Native & TypeScript
module.exports = {
  preset: "jest-expo",
  testMatch: ["<rootDir>/__tests__/**/*.(test|spec).(js|jsx|ts|tsx)"],
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts", "@testing-library/jest-native/extend-expect"],
  testPathIgnorePatterns: [
    "<rootDir>/meetmate/",
    "<rootDir>/meetmate-admin/",
    "<rootDir>/meetmate-web/",
    "<rootDir>/__tests__/verification/"
  ],
  transformIgnorePatterns: [
    "node_modules/(?!(jest-)?react-native|@react-native|react-native|expo(nent)?|@expo(nent)?|expo-.*|@expo/.*|@unimodules/.*|unimodules-.*|react-navigation|@react-navigation/.*|sentry-expo|@sentry/.*)",
  ],
};
