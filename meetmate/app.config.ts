import "dotenv/config";
import { ConfigContext, ExpoConfig } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "meetmate",
  slug: "meetmate",
  scheme: "meetmate",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "automatic",
  splash: {
    image: "./assets/splash.png",
    resizeMode: "contain",
    backgroundColor: "#ffffff",
  },
  assetBundlePatterns: ["**/*"],
  ios: {
    supportsTablet: false,
    bundleIdentifier:
      process.env.EXPO_PUBLIC_IOS_BUNDLE_ID ??
      process.env.IOS_BUNDLE_ID ??
      "com.shishany.meetmate",
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#ffffff",
    },
    package:
      process.env.EXPO_PUBLIC_ANDROID_PACKAGE ??
      process.env.ANDROID_APPLICATION_ID ??
      "com.shishany.meetmate",
    permissions: [
      "ACCESS_COARSE_LOCATION",
      "ACCESS_FINE_LOCATION",
      "READ_EXTERNAL_STORAGE",
      "WRITE_EXTERNAL_STORAGE",
      "CAMERA",
      "READ_MEDIA_IMAGES",
    ],
  },
  web: {
    bundler: "metro",
    favicon: "./assets/favicon.png",
  },
  plugins: [
    [
      "expo-router",
      {
        origin: "https://expo.dev",
      },
    ],
    "expo-image-picker",
    "expo-location",
    "expo-notifications",
    "sentry-expo",
  ],
  extra: {
    ...config.extra,
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? "",
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "",
    sentryDsn: process.env.SENTRY_DSN ?? "",
    revenueCatIosKey:
      process.env.RC_PUBLIC_IOS_KEY ?? process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? "",
    revenueCatAndroidKey:
      process.env.RC_PUBLIC_ANDROID_KEY ??
      process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ??
      "",
  },
});
