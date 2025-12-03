import "dotenv/config";
import "@testing-library/jest-native/extend-expect";
import "react-native-gesture-handler/jestSetup";
try {
  // Not all pipelines install @testing-library/react-native (optional).
  const { configure } = require("@testing-library/react-native");
  configure({
    defaultHostComponentNames: {
      render: {
        ROOT: "Root",
        VIEW: "View",
        TEXT: "Text",
        SCROLLVIEW: "ScrollView",
        IMAGE: "Image",
        TEXTINPUT: "TextInput"
      }
    }
  });
} catch {
  // ignore if library is not present (legacy tests)
}

jest.mock("expo-constants", () => {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "https://example.supabase.co";
  const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "test";

  return {
    default: {
      expoConfig: {
        extra: {
          supabaseUrl,
          supabaseAnonKey
        }
      }
    }
  };
});

jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined)
}));

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

try {
  jest.mock("react-native/Libraries/Animated/NativeAnimatedHelper");
} catch {
  jest.mock("react-native/src/private/animated/NativeAnimatedHelper", () => ({}));
}

jest.mock("react-native-reanimated", () => {
  const Reanimated = require("react-native-reanimated/mock");
  Reanimated.default.call = () => {};
  return Reanimated;
});

// Provide a minimal bridge config so React Native modules can load in Jest.
(global as any).__fbBatchedBridgeConfig = (global as any).__fbBatchedBridgeConfig ?? {
  remoteModuleConfig: [],
  localModulesConfig: []
};

(global as any).__DEV__ = true;

jest.mock("react-native/Libraries/TurboModule/TurboModuleRegistry", () => ({
  getEnforcing: (_name: string) => ({
    getConstants: () => ({
      forceTouchAvailable: false,
      osVersion: "14.0",
      systemName: "iOS",
      interfaceIdiom: "phone",
      isTesting: true
    })
  }),
  get: () => null
}));

const TurboModuleRegistry = require("react-native/Libraries/TurboModule/TurboModuleRegistry");
TurboModuleRegistry.getEnforcing = (_name: string) => ({
  getConstants: () => ({
    forceTouchAvailable: false,
    osVersion: "14.0",
    systemName: "iOS",
    interfaceIdiom: "phone",
    isTesting: true
  })
});
TurboModuleRegistry.get = () => null;
(global as any).__turboModuleProxy = (name: string) => {
  if (name === "PlatformConstants") {
    return {
      getConstants: () => ({
        forceTouchAvailable: false,
        osVersion: "14.0",
        systemName: "iOS",
        interfaceIdiom: "phone",
        isTesting: true
      })
    };
  }
  if (name === "DeviceInfo") {
    return {
      getConstants: () => ({
        Dimensions: {
          window: { width: 390, height: 844, scale: 2, fontScale: 2 },
          screen: { width: 390, height: 844, scale: 2, fontScale: 2 }
        }
      })
    };
  }
  return undefined;
};

jest.mock("react-native/Libraries/Utilities/NativePlatformConstantsIOS", () => ({
  getConstants: () => ({
    forceTouchAvailable: false,
    osVersion: "14.0",
    systemName: "iOS",
    interfaceIdiom: "phone",
    isTesting: true
  })
}), { virtual: true });

jest.mock("react-native/Libraries/Utilities/NativePlatformConstantsAndroid", () => ({
  getConstants: () => ({
    Version: 33,
    Release: "13",
    Serial: "unknown",
    Fingerprint: "jest",
    isTesting: true
  })
}), { virtual: true });

jest.mock("react-native/Libraries/Utilities/NativeDeviceInfo", () => ({
  getConstants: () => ({
    Dimensions: {
      window: { width: 390, height: 844, scale: 2, fontScale: 2 },
      screen: { width: 390, height: 844, scale: 2, fontScale: 2 }
    }
  })
}), { virtual: true });

jest.mock("react-native/Libraries/Utilities/Dimensions", () => ({
  get: (key: string) => ({
    width: 390,
    height: 844,
    scale: 2,
    fontScale: 2
  }),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn()
}));
