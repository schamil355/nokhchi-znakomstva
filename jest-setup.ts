import "@testing-library/jest-native/extend-expect";
import "react-native-gesture-handler/jestSetup";
import { configure } from "@testing-library/react-native";

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

jest.mock("expo-constants", () => ({
  default: {
    expoConfig: {
      extra: {
        supabaseUrl: "https://example.supabase.co",
        supabaseAnonKey: "test"
      }
    }
  }
}));

jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined)
}));

jest.mock("react-native/Libraries/Animated/NativeAnimatedHelper");

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
