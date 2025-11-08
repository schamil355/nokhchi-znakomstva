/**
 * Detox configuration for meetmate. Adjust bundle identifiers and binary paths to match your build outputs.
 */
module.exports = {
  testRunner: {
    args: {
      $0: "node",
      _: ["./node_modules/jest/bin/jest.js"],
      config: "e2e/jest.e2e.config.js",
    },
  },
  apps: {
    "ios.debug": {
      type: "ios.app",
      binaryPath: "ios/build/Build/Products/Debug-iphonesimulator/meetmate.app",
      build:
        "xcodebuild -workspace ios/meetmate.xcworkspace -scheme meetmate -configuration Debug -sdk iphonesimulator -derivedDataPath ios/build",
    },
    "android.debug": {
      type: "android.apk",
      binaryPath: "android/app/build/outputs/apk/debug/app-debug.apk",
      build: "cd android && ./gradlew assembleDebug assembleAndroidTest",
    },
  },
  devices: {
    simulator: {
      type: "ios.simulator",
      device: {
        type: "iPhone 14",
      },
    },
    emulator: {
      type: "android.emulator",
      device: {
        avdName: "Pixel_6_API_33",
      },
    },
  },
  configurations: {
    "ios.debug": {
      device: "simulator",
      app: "ios.debug",
    },
    "android.debug": {
      device: "emulator",
      app: "android.debug",
    },
  },
};
