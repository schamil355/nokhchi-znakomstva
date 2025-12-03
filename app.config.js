import "dotenv/config";

export default ({ config }) => ({
  ...config,
  name: "Нохчи Знакомства",
  slug: config.slug ?? "nochchi-znakomstva",
  ios: {
    ...(config.ios ?? {}),
    bundleIdentifier: process.env.EXPO_PUBLIC_IOS_BUNDLE_ID ?? "com.zelimkhan.meetmate-clean",
    infoPlist: {
      ...(config.ios?.infoPlist ?? {}),
      CFBundleDisplayName: "Нохчи Знакомства"
    }
  },
  android: {
    ...(config.android ?? {}),
    package: process.env.EXPO_PUBLIC_ANDROID_PACKAGE ?? "com.zelimkhan.meetmateclean",
    appName: "Нохчи Знакомства"
  },
  extra: {
    ...(config.extra ?? {}),
    eas: {
      ...(config.extra?.eas ?? {}),
      projectId: "8d41929c-2173-4a52-a275-9d09896a2b0c"
    },
    EXPO_PROJECT_ID: process.env.EXPO_PROJECT_ID,
    EXPO_PUBLIC_STORAGE_PUBLIC: process.env.EXPO_PUBLIC_STORAGE_PUBLIC,
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    EXPO_PUBLIC_VERIFY_PROVIDER: process.env.EXPO_PUBLIC_VERIFY_PROVIDER,
    EXPO_PUBLIC_VERIFY_ENDPOINT: process.env.EXPO_PUBLIC_VERIFY_ENDPOINT,
    EXPO_PUBLIC_EXPO_PUSH_ACCESS_TOKEN: process.env.EXPO_PUBLIC_EXPO_PUSH_ACCESS_TOKEN
  }
});
